import jwt from "jsonwebtoken";
import User from "./user.model.js";
import config from "../../config/index.js";
import { createError } from "../../utils/error.js";
import { sendEmail } from "../../utils/email.js";
import { generateResetToken, hashResetToken } from "../../utils/hash.js";
import EmployerProfile from "./employerProfile.model.js";
import { getEmployerMembership } from "./employerOnboarding.service.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("auth.service");

export { getEmployerMembership };

const GENERIC_AUTH_ERROR = "Invalid email or password.";
const GENERIC_REFRESH_ERROR = "Invalid or expired refresh token.";

export function ensureAccountAccess(user) {
  if (!user) {
    throw createError(404, "User not found.");
  }

  if (user.isBanned || user.status === "suspended") {
    throw createError(403, "Account is banned. Please contact support.");
  }

  if (user.status === "inactive") {
    throw createError(403, "Account is inactive. Please contact support.");
  }

  if (!user.isActive && user.status !== "pending_approval") {
    throw createError(403, "Account is inactive. Please contact support.");
  }

  // pending_approval: allowed to login/refresh (authentication only)
  if (user.status !== "active" && user.status !== "pending_approval") {
    throw createError(403, "Account is not available. Please contact support.");
  }
}

class AuthService {
  async resolveUser(userOrUserId) {
    if (userOrUserId && typeof userOrUserId === "object" && userOrUserId._id) {
      return userOrUserId;
    }

    return User.findById(userOrUserId);
  }

  verifyToken(token, expectedType = "access") {
    if (!token) {
      throw createError(401, GENERIC_REFRESH_ERROR);
    }

    const secret =
      expectedType === "refresh" ? config.jwt.refreshSecret : config.jwt.secret;

    try {
      const decoded = jwt.verify(token, secret);

      if (decoded.type !== expectedType) {
        throw createError(401, "Invalid token type.");
      }

      return decoded;
    } catch (err) {
      if (err.status) throw err;
      throw createError(401, GENERIC_REFRESH_ERROR);
    }
  }

  async generateTokens(userOrUserId) {
    const user = await this.resolveUser(userOrUserId);
    if (!user) {
      throw createError(404, "User not found.");
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, type: "access" },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn },
    );

    const refreshToken = jwt.sign(
      { userId: user._id, version: user.refreshTokenVersion, type: "refresh" },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn },
    );

    return { accessToken, refreshToken };
  }

  async register(email, password, role = "candidate", fullName, employerType) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw createError(400, "Email is already registered.");
    }

    const isEmployer = role === "employer";
    const isEmployerHr = isEmployer && employerType === "hr";

    const user = new User({
      email: email.toLowerCase(),
      password,
      role,
      ...(fullName?.trim() && { fullName: fullName.trim() }),
      ...(isEmployer &&
        !isEmployerHr && {
        status: "pending_approval",
        isActive: false,
      }),
    });
    await user.save();

    if (isEmployerHr) {
      await EmployerProfile.create({
        userId: user._id,
        role: "hr",
        companyId: null,
      });
      const { accessToken, refreshToken } = await this.generateTokens(user);
      const membership = await getEmployerMembership(user._id);
      return {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        employerType: "hr",
        membership,
      };
    }

    if (isEmployer && !isEmployerHr) {
      const { accessToken, refreshToken } = await this.generateTokens(user);
      const membership = await getEmployerMembership(user._id);
      return {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        pendingApproval: true,
        needsCompanyOnboarding: true,
        employerType: "owner",
        membership,
      };
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);
    return { user: user.toJSON(), accessToken, refreshToken };
  }

  async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!user) {
      throw createError(401, GENERIC_AUTH_ERROR);
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw createError(401, GENERIC_AUTH_ERROR);
    }

    ensureAccountAccess(user);

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = await this.generateTokens(user);
    const membership =
      user.role === "employer"
        ? await getEmployerMembership(user._id)
        : null;

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      membership,
    };
  }

  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw createError(401, GENERIC_REFRESH_ERROR);
    }

    try {
      const decoded = this.verifyToken(refreshToken, "refresh");
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw createError(401, GENERIC_REFRESH_ERROR);
      }

      ensureAccountAccess(user);

      if (user.refreshTokenVersion !== decoded.version) {
        throw createError(401, GENERIC_REFRESH_ERROR);
      }

      const { accessToken } = await this.generateTokens(user);
      const membership =
        user.role === "employer"
          ? await getEmployerMembership(user._id)
          : null;

      return { accessToken, user: user.toJSON(), membership };
    } catch (err) {
      if (err.status) throw err;
      throw createError(401, GENERIC_REFRESH_ERROR);
    }
  }

  async logout(userId) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshTokenVersion += 1;
      await user.save();
    }
    return { success: true };
  }

  async forgotPassword(email, originHeader = "http://localhost:5173") {
    const GENERIC_RESPONSE = {
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Log server-side only — never expose user existence to the client
      logger.warn(`Forgot password requested for non-existing email: ${email}`);
      return GENERIC_RESPONSE;
    }

    const resetToken = generateResetToken();

    user.passwordResetToken = hashResetToken(resetToken);
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;

    await user.save();

    const resetUrl = `${originHeader}/reset-password?token=${resetToken}&email=${user.email}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1d4ed8; text-align: center;">Naqla Recruiter — Password Reset</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your Naqla Recruiter account. Click the button below to continue:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or you can copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
        <p>This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Naqla Recruiter &copy; 2026. All rights reserved.</p>
      </div>
    `;

    const sent = await sendEmail({
      to: user.email,
      subject: "Naqla Recruiter - Reset Your Password",
      html,
    });

    if (!sent) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw createError(
        500,
        "There was an error sending the reset email. Please try again later.",
      );
    }

    return GENERIC_RESPONSE;
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      passwordResetToken: hashResetToken(token),
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw createError(400, "Password reset token is invalid or has expired.");
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenVersion += 1;

    await user.save();

    return { success: true, message: "Password reset successful." };
  }

  async acceptHRInviteService(token, password, fullName) {
    const crypto = await import("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const HRInvitation = (await import("../company/hrInvitation.model.js")).default;
    const invitation = await HRInvitation.findOne({ token: hashedToken });

    if (!invitation) {
      throw createError(404, "Invalid invitation token.");
    }

    if (invitation.accepted) {
      throw createError(400, "Invitation has already been accepted.");
    }

    if (invitation.expiresAt < new Date()) {
      throw createError(400, "Invitation has expired.");
    }

    let user = await User.findOne({ email: invitation.email });
    let created = false;

    if (!user) {
      if (!password) {
        throw createError(400, "Password is required to create a new account.");
      }
      if (password.length < 8) {
        throw createError(400, "Password must be at least 8 characters long.");
      }

      user = new User({
        email: invitation.email,
        password,
        role: "employer",
        status: "active",
        isActive: true,
        fullName: fullName || invitation.email.split("@")[0],
      });

      await user.save();
      created = true;
    } else {
      if (user.role !== "employer") {
        user.role = "employer";
        await user.save();
      }

      const EmployerProfile = (await import("./employerProfile.model.js")).default;
      const existingProfile = await EmployerProfile.findOne({
        userId: user._id,
        companyId: invitation.companyId,
      });

      if (existingProfile) {
        throw createError(400, "You are already a member of this company.");
      }
    }

    const EmployerProfile = (await import("./employerProfile.model.js")).default;
    await EmployerProfile.create({
      userId: user._id,
      companyId: invitation.companyId,
      role: "hr",
    });

    invitation.accepted = true;
    invitation.acceptedAt = new Date();
    await invitation.save();

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      message: created
        ? "Account created and joined company successfully."
        : "Joined company successfully.",
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }
}

const authService = new AuthService();

export default authService;
export { authService };
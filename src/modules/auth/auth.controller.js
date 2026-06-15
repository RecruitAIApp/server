import authService from "./auth.service.js";
import User from "./user.model.js";
import {
  completeOwnerCompanyOnboarding,
  getEmployerMembership,
} from "./employerOnboarding.service.js";

class AuthController {
  async register(req, res) {
    try {
      const { email, password, role, fullName, employerType } =
        req.validatedBody;
      const result = await authService.register(
        email,
        password,
        role,
        fullName,
        employerType,
      );

      const response = {
        success: true,
        message: result.pendingApproval
          ? "Account created and pending admin approval"
          : "Account created successfully.",
        user: result.user,
      };

      if (result.accessToken) {
        response.accessToken = result.accessToken;
        response.refreshToken = result.refreshToken;
      }
      if (result.pendingApproval) {
        response.pendingApproval = true;
      }
      if (result.needsCompanyOnboarding) {
        response.needsCompanyOnboarding = true;
      }

      if (result.employerType) {
        response.employerType = result.employerType;
      }
      if (result.membership) {
        response.membership = result.membership;
      }

      return res.status(201).json(response);
    } catch (err) {
      const statusCode = err.status || 400;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Registration failed.",
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.validatedBody;
      const result = await authService.login(email, password);

      return res.status(200).json({
        success: true,
        message: "Logged in successfully.",
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        membership: result.membership ?? null,
      });
    } catch (err) {
      const statusCode = err.status || 401;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Authentication failed.",
      });
    }
  }

  async refresh(req, res) {
    try {
      const { refreshToken } = req.validatedBody;
      const result = await authService.refreshAccessToken(refreshToken);

      return res.status(200).json({
        success: true,
        message: "Session restored successfully.",
        accessToken: result.accessToken,
        user: result.user,
        membership: result.membership ?? null,
      });
    } catch (err) {
      const statusCode = err.status || 401;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Session expired, please login again.",
      });
    }
  }

  async getMe(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const membership =
        user.role === "employer"
          ? await getEmployerMembership(user._id)
          : null;

      return res.status(200).json({
        success: true,
        user: user.toJSON(),
        membership,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch user.",
      });
    }
  }

  async onboardOwnerCompany(req, res) {
    try {
      const companyFields = req.validatedBody;
      const result = await completeOwnerCompanyOnboarding(
        req.user.id,
        companyFields,
      );

      return res.status(201).json({
        success: true,
        message:
          "Company submitted. Your account is pending admin approval.",
        pendingApproval: true,
        user: result.user,
        company: result.company,
        membership: result.membership,
      });
    } catch (err) {
      return res.status(err.status || 400).json({
        success: false,
        message: err.message || "Company onboarding failed.",
      });
    }
  }

  async logout(req, res) {
    try {
      if (req.user?.id) {
        await authService.logout(req.user.id);
      }
      return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "Logout failed.",
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.validatedBody;

      const origin =
        req.headers.origin || req.headers.referer || "http://localhost:5173";

      const result = await authService.forgotPassword(email, origin);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Forgot password request failed.",
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token and password are required.",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long.",
        });
      }

      const result = await authService.resetPassword(token, password);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      return res.status(err.status || 400).json({
        success: false,
        message: err.message || "Password reset failed.",
      });
    }
  }

  async getProfile(req, res) {
    try {
      if (req.user.role !== "candidate") {
        return res.status(403).json({
          success: false,
          message: "Candidate profile is only available for candidate accounts.",
        });
      }

      const result = await authService.getProfile(req.user.id);
      return res.status(200).json({
        success: true,
        profile: result,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Failed to retrieve candidate profile.",
      });
    }
  }

  async updateProfile(req, res) {
    try {
      if (req.user.role !== "candidate") {
        return res.status(403).json({
          success: false,
          message: "Candidate profile is only available for candidate accounts.",
        });
      }

      const result = await authService.updateProfile(req.user.id, req.body);
      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        profile: result,
      });
    } catch (err) {
      return res.status(err.status || 400).json({
        success: false,
        message: err.message || "Failed to update candidate profile.",
      });
    }
  }

  async validateHRInvite(req, res) {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ success: false, message: "Invitation token is required." });
      }

      const crypto = await import("crypto");
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

      const HRInvitation = (await import("../company/hrInvitation.model.js")).default;
      const invitation = await HRInvitation.findOne({ token: hashedToken }).populate("companyId", "name");

      if (!invitation) {
        return res.status(404).json({ success: false, message: "Invalid invitation token." });
      }

      if (invitation.accepted) {
        return res.status(400).json({ success: false, message: "Invitation has already been accepted." });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(400).json({ success: false, message: "Invitation has expired." });
      }

      // Check if user already exists
      const User = (await import("./user.model.js")).default;
      const userExists = await User.exists({ email: invitation.email });

      return res.status(200).json({
        success: true,
        email: invitation.email,
        companyName: invitation.companyId?.name || "Company",
        userExists: Boolean(userExists),
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to validate invitation.",
      });
    }
  }

  async acceptHRInvite(req, res, next) {
    try {
      const { token, password, fullName } = req.validatedBody;
      const result = await authService.acceptHRInviteService(token, password, fullName);

      return res.status(200).json({
        success: true,
        message: result.message,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      const statusCode = err.status || 400;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Failed to accept HR invitation.",
      });
    }
  }
}

const authController = new AuthController();
export default authController;
export { authController };
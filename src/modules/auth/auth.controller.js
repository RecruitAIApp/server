import authService from "./auth.service.js";
import User from "./user.model.js";

class AuthController {
  async register(req, res) {
    try {
      const { email, password, role } = req.validatedBody;
      const result = await authService.register(email, password, role);

      return res.status(201).json({
        success: true,
        message: result.pendingApproval
          ? "Account created. Pending approval before you can sign in."
          : "Account created successfully.",
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        pendingApproval: Boolean(result.pendingApproval),
      });
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
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.status(200).json({
        success: true,
        user: user.toJSON(),
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch user.",
      });
    }
  }

  async logout(req, res) {
    try {
      if (req.user?.userId) {
        await authService.logout(req.user.userId);
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
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email address is required.",
        });
      }

      const origin =
        req.headers.origin || req.headers.referer || "http://localhost:5173";

      const result = await authService.forgotPassword(email, origin);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      return res.status(err.status || 400).json({
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

      const result = await authService.getProfile(req.user.userId);
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

      const result = await authService.updateProfile(req.user.userId, req.body);
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
}

export default new AuthController();
export const authController = new AuthController();

import User from "../../modules/auth/user.model.js";
import authService, {
  ensureAccountAccess,
} from "../../modules/auth/auth.service.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = authService.verifyToken(token, "access");

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    ensureAccountAccess(user);

    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(),
      role: user.role,
      status: user.status,
    };

    next();
  } catch (err) {
    return res.status(err.status || 401).json({
      success: false,
      message: err.message || "Invalid or expired token.",
    });
  }
};

export const authenticate = protect;

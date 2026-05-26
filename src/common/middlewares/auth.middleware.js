import jwt from "jsonwebtoken";
import User from "../../modules/auth/user.model.js";
import config from "../../config/index.js";

/**
 * Authenticate middleware
 * Verifies JWT access token and attaches user to req.user
 *
 * Expected header: Authorization: Bearer <token>
 * Populates req.user = { id, role, status }
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // Verify token type
    if (decoded.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type.",
      });
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check account status
    if (user.isBanned || user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Account is banned or suspended.",
      });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive.",
      });
    }

    // pending_approval owners: authenticated (login/onboarding) but not fully authorized
    if (!user.isActive && user.status !== "pending_approval") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive.",
      });
    }

    // Attach standardized user to request
    req.user = {
      id: user._id.toString(),
      role: user.role,
      status: user.status,
    };

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Authentication failed.",
    });
  }
};

/**
 * Role-based access control middleware
 * Checks if user has one of the required roles
 *
 * Usage:
 *   router.get("/admin-only", authenticate, allowRoles("admin"), controller);
 *   router.get("/employer-only", authenticate, allowRoles("employer"), controller);
 *   router.get("/candidate-only", authenticate, allowRoles("candidate"), controller);
 *   router.get("/either", authenticate, allowRoles("employer", "admin"), controller);
 */
export const allowRoles =
  (...allowedRoles) =>
    (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
        });
      }

      next();
    };

/**
 * Authorization: employer must be admin-approved (not pending_approval).
 * Use after authenticate on company dashboard, jobs, company management, etc.
 */
export const requireEmployerApproved = (req, res, next) => {
  if (req.user?.status === "pending_approval") {
    return res.status(403).json({
      success: false,
      message:
        "Account is pending admin approval. You cannot access this feature yet.",
    });
  }
  next();
};

// For backwards compatibility during migration
export const protect = authenticate;

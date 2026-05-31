import express from "express";
import {
  authenticate,
  allowRoles,
} from "../common/middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Test protected route
 * Requires authentication
 */
router.get("/protected", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Protected route accessed successfully",
    user: req.user,
  });
});

/**
 * Test candidate-only route
 * Requires authentication AND candidate role
 */
router.get(
  "/candidate-only",
  authenticate,
  allowRoles("candidate"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Candidate-only route accessed successfully",
      user: req.user,
    });
  },
);

/**
 * Test employer-only route
 * Requires authentication AND employer role
 */
router.get(
  "/employer-only",
  authenticate,
  allowRoles("employer"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Employer-only route accessed successfully",
      user: req.user,
    });
  },
);

/**
 * Test admin-only route
 * Requires authentication AND admin role
 */
router.get("/admin-only", authenticate, allowRoles("admin"), (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin-only route accessed successfully",
    user: req.user,
  });
});

/**
 * Test multiple roles route
 * Requires authentication AND (employer OR admin)
 */
router.get(
  "/employer-or-admin",
  authenticate,
  allowRoles("employer", "admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Employer or Admin route accessed successfully",
      user: req.user,
    });
  },
);

export default router;

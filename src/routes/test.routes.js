import express from "express";
import {
  authenticate,
  allowRoles,
} from "../common/middlewares/auth.middleware.js";
import User from "../modules/auth/user.model.js";
import Company from "../modules/company/company.model.js";
import Job from "../modules/jobs/job.model.js";
import authService from "../modules/auth/auth.service.js";

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

/**
 * Setup test data for Job Chat
 * Creates a candidate, employer, company, and job
 * Returns candidate token and job IDs
 */
router.post("/setup-chat-test", async (req, res) => {
  try {
    // 1. Create Employer
    let employer = await User.findOne({ email: "employer@test.com" });
    if (!employer) {
      employer = await User.create({
        email: "employer@test.com",
        password: "password123",
        fullName: "Test Employer",
        role: "employer",
        status: "active",
        isActive: true,
      });
    }

    // 2. Create Company
    let company = await Company.findOne({ name: "Test Tech Corp" });
    if (!company) {
      company = await Company.create({
        name: "Test Tech Corp",
        description: "A testing tech company",
        industry: "Technology",
        owner: employer._id,
        status: "active",
      });
    }

    // 3. Create Job
    const jobData = {
      title: "Senior Node.js Developer",
      description: "We are looking for a Senior Node.js Developer to join our team. You will be responsible for building robust backend services and integrating with AI modules.",
      requirements: [
        "5+ years of experience with Node.js",
        "Expertise in MongoDB and Mongoose",
        "Experience with LLMs (OpenAI, Gemini)",
        "Strong understanding of design patterns",
      ],
      salaryRange: {
        min: 80000,
        max: 120000,
        currency: "USD",
      },
      location: "San Francisco",
      jobType: "remote",
      employmentType: "full-time",
      experienceLevel: "senior",
      skills: ["Node.js", "Express", "MongoDB", "AI"],
      company: company._id,
      postedBy: employer._id,
      status: "open",
    };

    let job = await Job.findOne({ title: jobData.title, company: company._id });
    if (!job) {
      job = await Job.create(jobData);
    }

    // 4. Create Candidate
    let candidate = await User.findOne({ email: "candidate@test.com" });
    if (!candidate) {
      candidate = await User.create({
        email: "candidate@test.com",
        password: "password123",
        fullName: "Test Candidate",
        role: "candidate",
        status: "active",
        isActive: true,
      });
    }

    // 5. Generate Tokens for Candidate
    const { accessToken } = await authService.generateTokens(candidate);

    res.status(200).json({
      success: true,
      data: {
        candidateToken: accessToken,
        jobId: job._id,
        candidateId: candidate._id,
        message: "Test setup complete. Use candidateToken as Bearer token.",
      },
    });
  } catch (err) {
    console.error("Test setup error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;

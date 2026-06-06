import express from "express";
import {
  authenticate,
  allowRoles,
} from "../common/middlewares/auth.middleware.js";
import User from "../modules/auth/user.model.js";
import Company from "../modules/company/company.model.js";
import Job from "../modules/jobs/job.model.js";
import authService from "../modules/auth/auth.service.js";
import notificationService from "../modules/notifications/notification.service.js";
import { enqueueJobEmbedding } from "../modules/jobs/queues/job.queue.js";
import { updateJobService, deleteJobService } from "../modules/jobs/job.service.js";

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

/**
 * Setup test for Notifications
 * Creates a user (if not exists) and sends a test notification
 */
router.post("/setup-notification-test", async (req, res) => {
  try {
    // 1. Create/Get a user
    let user = await User.findOne({ email: "testnotification@example.com" });
    if (!user) {
      user = await User.create({
        email: "testnotification@example.com",
        password: "password123",
        fullName: "Notification Tester",
        role: "candidate",
        status: "active",
        isActive: true,
      });
    }

    // 2. Generate tokens
    const { accessToken } = await authService.generateTokens(user);

    // 3. Send a test notification using the service (will trigger real-time push if socket is connected)
    const notification = await notificationService.notify(user._id, {
      type: "system",
      title: "Welcome to Notifications!",
      message: "This is your first test notification. Real-time is working if you see this!",
      data: { source: "test-setup", time: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        userId: user._id,
        notification,
        instructions: {
          step1: "Use the provided 'token' as Bearer token in Postman",
          step2: "GET /api/v1/notifications to see the list",
          step3: "PATCH /api/v1/notifications/:id/read to mark as read",
          step4: "DELETE /api/v1/notifications/:id to remove it"
        }
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Setup test for Job Embedding
 * Manually enqueues a job for embedding
 */
router.post("/setup-embedding-test", async (req, res) => {
  try {
    // 1. Get or Create Employer/Company
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

    let company = await Company.findOne({ name: "Test Tech Corp" });
    if (!company) {
      company = await Company.create({
        name: "Test Tech Corp",
        description: "A testing tech company specializing in AI and Node.js solutions.",
        industry: "Technology",
        owner: employer._id,
        status: "active",
      });
    }

    // 2. Create a unique test job
    const uniqueTitle = `Embedded Engineer ${Date.now()}`;
    const jobData = {
      title: uniqueTitle,
      description: "We context-aware AI engineer to help integrate vector stores into our recruitment platform.",
      requirements: ["Node.js", "Pinecone", "Embeddings", "BullMQ"],
      salaryRange: { min: 100000, max: 150000, currency: "USD" },
      location: "Remote",
      jobType: "remote",
      employmentType: "full-time",
      experienceLevel: "senior",
      skills: ["Node.js", "AI", "Vector DB"],
      company: company._id,
      postedBy: employer._id,
      status: "open",
    };

    const job = await Job.create(jobData);
    
    // 3. Manually enqueue (though the service now does this, we do it here to verify the queue specifically)
    // We populate first like the service does
    const populatedJob = await Job.findById(job._id).populate("company", "name industry description");
    await enqueueJobEmbedding(populatedJob);

    res.status(200).json({
      success: true,
      message: "Job created and enqueued for embedding. Check background worker logs.",
      data: {
        jobId: job._id,
        title: job.title
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Test Job Embedding Update
 */
router.patch("/test-embedding-update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      title: `Updated Title ${Date.now()}`,
      description: "Updated description to test if embedding is refreshed and old one deleted."
    };
    
    const job = await updateJobService(id, updateData);
    
    res.status(200).json({
      success: true,
      message: "Job updated. You should see a DELETE then an EMBED task in the worker logs.",
      data: job
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Test Job Embedding Delete
 */
router.delete("/test-embedding-delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteJobService(id);
    
    res.status(200).json({
      success: true,
      message: "Job deleted. You should see a DELETE task in the worker logs."
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Test Job Embedding Full Flow (Create + Update)
 * One click to see create, then delete+re-embed logs.
 */
router.post("/test-full-update-flow", async (req, res) => {
  try {
    // 1. Setup Employer/Company
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

    let company = await Company.findOne({ name: "Test Tech Corp" });
    if (!company) {
      company = await Company.create({
        name: "Test Tech Corp",
        description: "Testing Corp",
        industry: "Tech",
        owner: employer._id,
        status: "active",
      });
    }

    // 2. Initial Create
    const job = await Job.create({
      title: `Flow Test ${Date.now()}`,
      description: "Initial description",
      requirements: ["Test"],
      salaryRange: { min: 10, max: 20, currency: "USD" },
      location: "Remote",
      jobType: "remote",
      employmentType: "full-time",
      company: company._id,
      postedBy: employer._id,
    });
    
    // Trigger initial embed (as createJobService would)
    const populated = await Job.findById(job._id).populate("company", "name industry description");
    await enqueueJobEmbedding(populated);

    // 3. Immediate Update to trigger Delete + Re-embed
    const updatedJob = await updateJobService(job._id, {
      title: `${job.title} (Updated)`,
      description: "This update should trigger a DELETE then a NEW EMBED task."
    });

    res.status(200).json({
      success: true,
      message: "Full flow triggered. Check worker logs for: 1. EMBED, 2. DELETE, 3. EMBED.",
      data: {
        jobId: job._id,
        finalTitle: updatedJob.title
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;

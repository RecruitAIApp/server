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
import { enqueueResumeEmbedding } from "../modules/vectorstore/candidate-embedding.service.js";
import { getRecommendationsForCandidate } from "../modules/recommendations/recommendation.service.js";
import CandidateProfile from "../modules/auth/candidateProfile.model.js";
import Application from "../modules/applications/application.model.js";
import Notification from "../modules/notifications/notification.model.js";
import EmployerProfile from "../modules/auth/employerProfile.model.js";
import { VectorStoreService } from "../modules/vectorstore/vectorstore.service.js";

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

    // 2. Create Companies
    let techCorp = await Company.findOne({ name: "TechNova Solutions" });
    if (!techCorp) {
      techCorp = await Company.create({
        name: "TechNova Solutions",
        description: "A leading-edge software house specializing in cloud-native applications and AI integration. We value innovation, transparency, and high-quality code.",
        industry: "Technology",
        size: "51-200",
        website: "https://technova.test",
        location: "Silicon Valley",
        owner: employer._id,
        status: "active",
      });
    }

    let creativeInc = await Company.findOne({ name: "Creative Design Hub" });
    if (!creativeInc) {
      creativeInc = await Company.create({
        name: "Creative Design Hub",
        description: "A world-class design agency crafting beautiful digital experiences. We focus on user-centric design and modern aesthetics.",
        industry: "Design",
        size: "11-50",
        website: "https://creativehub.test",
        location: "New York",
        owner: employer._id,
        status: "active",
      });
    }

    // 3. Create Diverse Jobs
    const jobsData = [
      {
        title: "Senior Node.js Developer",
        description: "Join TechNova to build the next generation of scalable backend services. You'll work with Node.js, MongoDB, and advanced AI models to simplify recruitment.",
        requirements: ["5+ years Node.js", "Deep MongoDB knowledge", "Experience with RAG systems", "Cloud architecture"],
        salaryRange: { min: 90000, max: 130000, currency: "USD" },
        location: "Remote",
        jobType: "remote",
        employmentType: "full-time",
        experienceLevel: "senior",
        skills: ["Node.js", "MongoDB", "AI"],
        company: techCorp._id,
        postedBy: employer._id,
        status: "open",
      },
      {
        title: "Frontend React Architect",
        description: "Lead our frontend team at TechNova. We use React 19, Tailwind CSS 4, and high-performance UI patterns to build stunning candidate dashboards.",
        requirements: ["Expertise in React", "Vite & Modern Tooling", "Performance optimization", "Design systems"],
        salaryRange: { min: 85000, max: 125000, currency: "USD" },
        location: "Hybrid - San Francisco",
        jobType: "hybrid",
        employmentType: "full-time",
        experienceLevel: "lead",
        skills: ["React", "TailwindCSS", "TypeScript"],
        company: techCorp._id,
        postedBy: employer._id,
        status: "open",
      },
      {
        title: "UI/UX Product Designer",
        description: "Join Creative Design Hub to shape the future of recruitment interfaces. You'll be responsible for creating intuitive, premium experiences for millions of users.",
        requirements: ["Figma Mastery", "User Research", "Interaction Design", "Prototyping"],
        salaryRange: { min: 70000, max: 110000, currency: "USD" },
        location: "New York",
        jobType: "onsite",
        employmentType: "full-time",
        experienceLevel: "mid",
        skills: ["Figma", "UI/UX", "Product Design"],
        company: creativeInc._id,
        postedBy: employer._id,
        status: "open",
      }
    ];

    const createdJobs = [];
    for (const data of jobsData) {
      let job = await Job.findOne({ title: data.title, company: data.company });
      if (!job) {
        job = await Job.create(data);
      }
      createdJobs.push(job);
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

    // 5. Generate Tokens
    const { accessToken } = await authService.generateTokens(candidate);

    res.status(200).json({
      success: true,
      data: {
        candidateToken: accessToken,
        jobs: createdJobs.map(j => ({ id: j._id, title: j.title })),
        candidateId: candidate._id,
        message: "Test setup complete with 3 diverse jobs across 2 companies.",
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

/**
 * Setup test for Candidate Embedding
 * Triggers resume embedding generation for a test candidate profile
 */
router.post("/setup-candidate-embedding-test", async (req, res) => {
  try {
    // 1. Get or Create Candidate
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

    // 2. Get or Create Candidate Profile
    let profile = await CandidateProfile.findOne({ userId: candidate._id });
    if (!profile) {
      profile = await CandidateProfile.create({
        userId: candidate._id,
        skills: ["Node.js", "Express", "MongoDB", "AI", "React"],
        preferredRoles: ["Backend Engineer", "Software Engineer"],
        technologies: ["JavaScript", "TypeScript", "Python"],
        experience: [
          {
            company: "Tech Solutions Inc.",
            title: "Software Engineer",
            startDate: new Date(2023, 0, 1),
            endDate: new Date(2025, 0, 1),
            currentlyWorking: false,
            description: "Developed backend APIs using Node.js, Express, and MongoDB. Worked on AI integrations."
          }
        ],
        education: [
          {
            institution: "State University",
            degree: "Bachelor of Science",
            field: "Computer Science",
            startYear: 2019,
            endYear: 2023
          }
        ],
        resume: {
          parseStatus: "done",
          parsedData: {
            skills: ["Node.js", "MongoDB", "Express", "React"],
            experienceYears: 2,
            jobTitles: ["Software Engineer"],
            summary: "Enthusiastic backend engineer with hands-on experience in building scalable web APIs and integrating AI solutions."
          }
        }
      });
    } else {
      // Update fields to test update triggers
      profile.skills = ["Node.js", "Express", "MongoDB", "AI", "React"];
      profile.preferredRoles = ["Backend Engineer", "Software Engineer"];
      profile.technologies = ["JavaScript", "TypeScript", "Python"];
      profile.resume = {
        parseStatus: "done",
        parsedData: {
          skills: ["Node.js", "MongoDB", "Express", "React"],
          experienceYears: 2,
          jobTitles: ["Software Engineer"],
          summary: "Enthusiastic backend engineer with hands-on experience in building scalable web APIs and integrating AI solutions."
        }
      };
      await profile.save();
    }

    // 3. Manually enqueue candidate resume embedding
    await enqueueResumeEmbedding(profile);

    res.status(200).json({
      success: true,
      message: "Candidate profile setup and enqueued for embedding. Check background worker logs.",
      data: {
        profileId: profile._id,
        userId: candidate._id,
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
 * Test Recommendations endpoint directly
 */
router.get("/recommendations-test", async (req, res) => {
  try {
    const candidate = await User.findOne({ email: "candidate@test.com" });
    if (!candidate) {
      return res.status(400).json({
        success: false,
        message: "Run /api/test/setup-candidate-embedding-test first to create candidate."
      });
    }

    const { location, employmentType, seniority, rerank } = req.query;

    const options = {
      location,
      employmentType,
      seniority,
      rerank: rerank === "false" ? false : true
    };

    const results = await getRecommendationsForCandidate(candidate._id, options);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Setup test data for HR Chat Agent
 * Creates a dedicated environment with 5 diverse candidates, detailed profiles,
 * vector embeddings for CVs, and varied application statuses.
 */
router.post("/setup-hr-chat-test", async (req, res) => {
  try {
    // 1. Setup Employer & Company
    let employer = await User.findOne({ email: "hr@test.com" });
    if (!employer) {
      employer = await User.create({
        email: "hr@test.com",
        password: "password123",
        fullName: "HR Director",
        role: "employer",
        status: "active",
        isActive: true,
      });
    }

    let company = await Company.findOne({ name: "Cognitive AI Labs" });
    if (!company) {
      company = await Company.create({
        name: "Cognitive AI Labs",
        description: "A premier research lab focusing on Large Language Models and Enterprise AI agents.",
        industry: "Artificial Intelligence",
        size: "500+",
        website: "https://cognitive.ai",
        owner: employer._id,
        status: "active",
      });
    }

    // 2. Create high-stakes Job
    let job = await Job.findOne({ title: "Lead AI Research Engineer", company: company._id });
    if (!job) {
      job = await Job.create({
        title: "Lead AI Research Engineer",
        description: "We are seeking a Lead AI Engineer to guide our RAG and Agentic workflows. You will design scalable architectures for LLM orchestration.",
        requirements: ["Python", "PyTorch", "NLP", "LLMs", "LangChain", "Vector Databases"],
        salaryRange: { min: 150000, max: 250000, currency: "USD" },
        location: "Cairo / Remote",
        jobType: "hybrid",
        employmentType: "full-time",
        experienceLevel: "lead",
        company: company._id,
        postedBy: employer._id,
        status: "open",
      });
    }

    // 3. Define 5 diverse candidates with rich data
    const candidatesData = [
      {
        fullName: "Omar Khalid",
        email: "omar.khalid@test.com",
        location: { city: "Cairo", country: "Egypt" },
        headline: "Expert AI Architect | 8 YOE in Transformer Models",
        bio: "Passionate AI researcher with multiple publications in NLP. Specialized in building custom RAG solutions and fine-tuning open-source LLMs.",
        skills: ["Python", "PyTorch", "NLP", "LangChain", "Groq", "Vector DB"],
        experience: [
          { company: "AI Frontiers", title: "Senior AI Engineer", startDate: "2020-01-01", description: "Led the development of a production-grade internal chatbot.", currentlyWorking: true }
        ],
        education: [{ institution: "Cairo University", degree: "Masters", field: "Computer Science", startYear: 2016, endYear: 2018 }],
        score: 98,
        stage: "shortlisted",
        cvSnippet: "Omar is a veteran in the AI field. He built a proprietary vector storage engine and has extensive experience with LangChain and Groq processing."
      },
      {
        fullName: "Layla Mansour",
        email: "layla.mansour@test.com",
        location: { city: "Alexandria", country: "Egypt" },
        headline: "Machine Learning Engineer specialized in MLOps",
        bio: "Focused on the deployment side of AI. Ensuring models are scalable, monitored, and highly available.",
        skills: ["Python", "TensorFlow", "Docker", "Kubernetes", "Redis"],
        experience: [
          { company: "Data Systems", title: "ML Engineer", startDate: "2021-06-01", description: "Streamlined deployment pipelines for image recognition models.", currentlyWorking: false }
        ],
        education: [{ institution: "AUC (American University in Cairo)", degree: "Bachelors", field: "Engineering", startYear: 2017, endYear: 2021 }],
        score: 82,
        stage: "applied",
        cvSnippet: "Layla has a strong background in TensorFlow and infrastructure. Her work at Data Systems involved deploying models for high-traffic applications."
      },
      {
        fullName: "Michael Smith",
        email: "mike.smith@test.com",
        location: { city: "London", country: "UK" },
        headline: "Senior Backend Specialist | 12 YOE",
        bio: "Architecture-first developer. Expert in distributed systems and high-concurrency Java/Node environments.",
        skills: ["Java", "Spring Boot", "AWS", "Python", "SQL"],
        experience: [
          { company: "Global Bank", title: "Lead Backend Developer", startDate: "2015-01-01", description: "Managed the core transaction engine architecture.", currentlyWorking: true }
        ],
        education: [{ institution: "Stanford University", degree: "BS", field: "Computer Science", startYear: 2008, endYear: 2012 }],
        score: 55, // Low match for AI specific role, but high general seniority
        stage: "applied",
        cvSnippet: "Michael is an exceptionally senior developer from Stanford. While his AI-specific skills are emerging, his architectural knowledge of AWS and Python is top-tier."
      },
      {
        fullName: "Hana Ibrahim",
        email: "hana.i@test.com",
        location: { city: "Cairo", country: "Egypt" },
        headline: "Rising AI Talent | NLP Enthusiast",
        bio: "Fast learner with a deep interest in Generative AI. Recently completed advanced certifications in Prompt Engineering.",
        skills: ["Python", "FastAPI", "NLP", "Prompt Engineering"],
        experience: [
          { company: "StartupX", title: "AI Intern", startDate: "2023-09-01", description: "Developed prototypes for automated document summarization.", currentlyWorking: false }
        ],
        education: [{ institution: "Ain Shams University", degree: "Bachelors", field: "Computer Science", startYear: 2020, endYear: 2024 }],
        score: 75,
        stage: "interview",
        cvSnippet: "Hana shows great potential. Her internship at StartupX involved cutting-edge research in NLP and document summarization using FastAPI."
      },
      {
        fullName: "Youssef Zayed",
        email: "youssef.z@test.com",
        location: { city: "Giza", country: "Egypt" },
        headline: "Creative UI Designer",
        bio: "Visual storyteller focusing on modern web aesthetics and user flow.",
        skills: ["JavaScript", "HTML/CSS", "Figma", "React"],
        experience: [
          { company: "Pixel Studio", title: "UI Designer", startDate: "2022-01-01", description: "Created high-fidelity mockups for various client websites.", currentlyWorking: true }
        ],
        education: [{ institution: "Helwan University", degree: "Bachelors", field: "Applied Arts", startYear: 2018, endYear: 2022 }],
        score: 15,
        stage: "rejected",
        cvSnippet: "Youssef is primarily a designer from Helwan University. Although he knows some React and JS, he lacks the research-heavy AI experience required for this lead role."
      }
    ];

    const results = [];

    // Clear previous vector data for this job to avoid duplicates in test
    // (Optional but good for clean tests if VectorStoreService supports it)

    for (const data of candidatesData) {
      // 3.1 Setup User
      let user = await User.findOne({ email: data.email });
      if (!user) {
        user = await User.create({
          email: data.email,
          password: "password123",
          fullName: data.fullName,
          role: "candidate",
          status: "active",
        });
      }

      // 3.2 Setup Detailed Profile
      let profile = await CandidateProfile.findOne({ userId: user._id });
      if (!profile) {
        profile = await CandidateProfile.create({
          userId: user._id,
          basicInfo: {
            headline: data.headline,
            bio: data.bio,
            location: data.location,
          },
          skills: data.skills,
          experience: data.experience,
          education: data.education,
          resume: {
            parseStatus: "done",
            parsedData: {
              skills: data.skills,
              experienceYears: data.experience[0]?.startDate ? 4 : 0, // Simplified for test
              jobTitles: data.experience.map(e => e.title),
              summary: data.bio
            }
          }
        });
      }

      // 3.3 Create Application
      await Application.deleteMany({ candidateId: user._id, jobId: job._id });
      const application = await Application.create({
        candidateId: user._id,
        jobId: job._id,
        companyId: company._id,
        stage: { key: data.stage },
        aiScreening: {
          status: "completed",
          overallScore: data.score,
          summary: `Candidate profile shows ${data.score}% alignment with core requirements.`,
          matchedSkills: data.skills.filter(s => job.requirements.includes(s))
        }
      });

      // 3.4 Seed Vector Store for CV search
      await VectorStoreService.embedAndSave(data.cvSnippet, {
        candidateId: user._id.toString(),
        jobId: job._id.toString(),
      }, "resumes");

      results.push({ user, application });
    }

    const { accessToken } = await authService.generateTokens(employer);

    res.status(200).json({
      success: true,
      message: "HR Chat rich test data setup complete. Ready for agent testing.",
      data: {
        token: accessToken,
        jobId: job._id,
        candidatesCount: results.length,
        hints: [
          "Try asking: 'Tell me about Omar Khalid's AI background'",
          "Try asking: 'Who is the most qualified candidate based on score?'",
          "Try asking: 'Search for candidates from Stanford University'",
          "Try asking: 'Who has experience with LangChain?'"
        ]
      }
    });
  } catch (err) {
    console.error("HR Chat test setup error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Force Link a User to a Company
 * Useful for fixing "Workspace Unlinked" in test environments.
 * Body: { email, companyName }
 */
router.post("/force-link-company", async (req, res) => {
  try {
    const { email, companyName } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const company = await Company.findOne({ name: companyName });
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    // Link via EmployerProfile (this is what EmployerHrDashboard checks)
    let profile = await EmployerProfile.findOne({ userId: user._id, companyId: company._id });
    if (!profile) {
      profile = await EmployerProfile.create({
        userId: user._id,
        companyId: company._id,
        role: "owner"
      });
    }

    // Also ensure the user is 'owner' or in 'HRs' in the company model for good measure
    if (company.owner.toString() !== user._id.toString() && !company.HRs.includes(user._id)) {
      company.HRs.push(user._id);
      await company.save();
    }

    res.status(200).json({
      success: true,
      message: `User ${email} linked to ${companyName} successfully.`,
      data: profile
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Seed notifications for a specific user ID for testing
 * NO AUTH REQUIRED FOR THIS TEST ENDPOINT
 */
router.post("/notification-seed", async (req, res) => {
  try {
    const userId = req.body.userId || "6a2570776f4b53c680e96a0e";
    
    const testNotifications = [
      {
        user: userId,
        type: "application",
        title: "New Application Received",
        message: "A new candidate has applied for the Senior Node.js Developer position.",
        data: { jobId: "job123", applicationId: "app456" },
        read: false,
      },
      {
        user: userId,
        type: "interview",
        title: "Interview Scheduled",
        message: "Your interview with Tech Solutions Inc. is scheduled for tomorrow at 10:00 AM.",
        data: { interviewId: "int789" },
        read: false,
      },
      {
        user: userId,
        type: "job",
        title: "New Job Match",
        message: "We found a new job that matches your skills: Full Stack Engineer at StartupX.",
        data: { jobId: "job789" },
        read: false,
      },
      {
        user: userId,
        type: "system",
        title: "Profile Updated",
        message: "Your profile has been successfully updated. Make sure to keep your skills up to date!",
        data: {},
        read: true,
      },
      {
        user: userId,
        type: "application",
        title: "Application Status Update",
        message: "Your application for Frontend Developer has been moved to 'Shortlisted'.",
        data: { applicationId: "app789" },
        read: false,
      }
    ];

    // Clear existing notifications first for a clean state
    await Notification.deleteMany({ user: userId });

    // Create notifications
    const created = [];
    for (const notifData of testNotifications) {
      const { read, ...rest } = notifData;
      let notif = await notificationService.notify(userId, rest);
      
      if (read) {
        notif = await Notification.findByIdAndUpdate(notif._id, { read: true }, { new: true });
      }
      
      created.push(notif);
    }

    res.status(200).json({
      success: true,
      message: `Seeded ${created.length} notifications for user ${userId}`,
      data: created
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Seed Extra HR Data
 * Adds 2 more jobs and several applications to Cognitive AI Labs
 * Use this to test the Context Switcher in HR Assistant
 */
router.get("/seed-extra-hr-data", async (req, res) => {
  try {
    const hr = await User.findOne({ email: "hr@test.com" });
    const company = await Company.findOne({ name: "Cognitive AI Labs" });

    if (!company || !hr) {
      return res.status(400).json({ success: false, message: "Run setup-hr-chat-test first!" });
    }

    const extraJobs = [
      {
        title: "Senior Product Designer",
        description: "Focus on creating clean, accessible interfaces for our AI-powered dashboards. Experience with Figma and design systems is required.",
        requirements: ["Figma", "Design Systems", "User Research", "Accessibility"],
        salaryRange: { min: 80000, max: 130000, currency: "USD" },
        location: "Cairo",
        jobType: "onsite",
        employmentType: "full-time",
        experienceLevel: "senior",
        company: company._id,
        postedBy: hr._id,
        status: "open",
      },
      {
        title: "Cloud Infrastructure Engineer",
        description: "Scale our LLM inference infrastructure. Manage Kubernetes clusters and optimize cloud costs.",
        requirements: ["Kubernetes", "AWS", "Terraform", "Docker", "Python"],
        salaryRange: { min: 110000, max: 180000, currency: "USD" },
        location: "Remote",
        jobType: "remote",
        employmentType: "full-time",
        experienceLevel: "senior",
        company: company._id,
        postedBy: hr._id,
        status: "open",
      }
    ];

    const createdJobs = [];
    for (const data of extraJobs) {
      let job = await Job.findOne({ title: data.title, company: company._id });
      if (!job) {
        job = await Job.create(data);
      }
      createdJobs.push(job);
    }

    // Add some applications for the first extra job (Product Designer)
    const designerCandidates = [
      { name: "Sara Ahmed", email: "sara.design@test.com", snippet: "Sara is a pixel-perfect designer with 6 years at top agencies. Expert in Figma and Design Systems." },
      { name: "Ahmed Ali", email: "ahmed.a@test.com", snippet: "Traditional designer moving into digital. Strong visual skills but learning accessibility." }
    ];

    for (const cand of designerCandidates) {
      let user = await User.findOne({ email: cand.email });
      if (!user) {
        user = await User.create({ email: cand.email, password: "password123", fullName: cand.name, role: "candidate", status: "active" });
      }
      
      let profile = await CandidateProfile.findOne({ userId: user._id });
      if (!profile) {
        profile = await CandidateProfile.create({
          userId: user._id,
          basicInfo: { headline: "UI/UX Designer", location: { city: "Giza", country: "Egypt" } },
          skills: ["Figma", "Photoshop", "React"],
        });
      }

      await Application.create({
        candidateId: user._id,
        jobId: createdJobs[0]._id,
        companyId: company._id,
        stage: { key: "applied" },
        aiScreening: { status: "completed", overallScore: 85 }
      });

      await VectorStoreService.embedAndSave(cand.snippet, {
        candidateId: user._id.toString(),
        jobId: createdJobs[0]._id.toString(),
      }, "resumes");
    }

    res.status(200).json({
      success: true,
      message: "Extra jobs and applications seeded successfully.",
      data: {
        jobs: createdJobs.map(j => ({ id: j._id, title: j.title }))
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

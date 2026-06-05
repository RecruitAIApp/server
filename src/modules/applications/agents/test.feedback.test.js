import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "../../../config/db.config.js";
import Application from "../application.model.js";
import User from "../../auth/user.model.js";
import Job from "../../jobs/job.model.js";
import { feedbackAgent } from "./feedback.agent.js";
import { sendEmail } from "../../../utils/email.js";

dotenv.config();

const runTest = async () => {
  let mockUser = null;
  let mockJob = null;
  let mockApp = null;
  let createdUser = false;

  try {
    console.log("Connecting to DB...");
    await connectDB();
    console.log("Connected to DB successfully.");

    // 1. Check if the candidate user already exists, or create one
    const existingUser = await User.findOne({ email: "ashrafmarwa987@gmail.com" });
    if (existingUser) {
      mockUser = existingUser;
      console.log("Using existing Candidate User from DB:", mockUser._id);
    } else {
      mockUser = await User.create({
        email: "ashrafmarwa987@gmail.com",
        password: "securepassword123",
        role: "candidate",
        fullName: "Sherif Kamal",
      });
      createdUser = true;
      console.log("Mock Candidate User created:", mockUser._id);
    }

    // 2. Create a mock job
    mockJob = await Job.create({
      title: "Senior Node.js Developer",
      description: "Looking for an expert developer.",
      requirements: ["Node.js", "Express", "MongoDB", "Redis"],
      salaryRange: { min: 3000, max: 5000, currency: "USD" },
      location: "Cairo, Egypt",
      company: new mongoose.Types.ObjectId(),
      postedBy: new mongoose.Types.ObjectId(),
      jobType: "remote",
      employmentType: "full-time",
    });
    console.log("Mock Job created:", mockJob._id);

    // 3. Create a mock application
    mockApp = await Application.create({
      candidateId: mockUser._id,
      companyId: new mongoose.Types.ObjectId(),
      jobId: mockJob._id,
      stage: {
        key: "rejected",
        changedAt: new Date()
      },
      aiScreening: {
        status: "completed",
        overallScore: 55,
        missingSkills: ["Redis", "Kubernetes"],
        redFlags: []
      }
    });
    console.log("Mock Application created:", mockApp._id);

    // 4. Run the feedback agent
    console.log("Running feedback agent...");
    const result = await feedbackAgent.invoke({
      applicationId: mockApp._id,
      hrNotes: "Showed lack of passion for Kubernetes during interview. Good technical foundations otherwise.",
    });

    console.log("Feedback agent run complete.");

    // 5. Assertions and Actual Email Sending
    if (result.generatedEmail && result.generatedEmail.trim() !== "") {
      console.log("TEST PASSED: Feedback email drafted successfully.");

      const emailHtml = result.generatedEmail.replace(/\n/g, '<br/>');
      console.log("Sending email to ashrafmarwa987@gmail.com...");

      const emailSent = await sendEmail({
        to: result.candidateEmail,
        subject: `Feedback regarding your application for ${result.jobTitle}`,
        html: emailHtml
      });

      if (emailSent) {
        console.log("✅ SUCCESS: Email sent successfully via SMTP!");
      } else {
        console.error("❌ FAILURE: Email sending failed. Check SMTP configuration.");
      }
    } else {
      console.error("❌ TEST FAILED: Generated email is empty.");
    }

  } catch (error) {
    console.error("Test run failed with error:", error);
  } finally {
    // Clean up database records
    if (mockApp) await Application.findByIdAndDelete(mockApp._id);
    if (mockUser && createdUser) await User.findByIdAndDelete(mockUser._id);
    if (mockJob) await Job.findByIdAndDelete(mockJob._id);
    console.log("Cleaned up database records.");

    await mongoose.connection.close();
    console.log("DB Connection closed.");
  }
};

runTest();


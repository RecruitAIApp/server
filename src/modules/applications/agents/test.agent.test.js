import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "../../../config/db.config.js";
import Application from "../application.model.js";
import { runTrackingAgent } from "./tracking.agent.js";

dotenv.config();

const runTest = async () => {
  try {
    console.log("Connecting to DB...");
    await connectDB();
    console.log("Connected to DB successfully.");

    // 1. Create a test application
    const mockApp = await Application.create({
      candidateId: new mongoose.Types.ObjectId(),
      companyId: new mongoose.Types.ObjectId(),
      jobId: new mongoose.Types.ObjectId(),
      stage: {
        key: "applied",
        changedAt: new Date()
      },
      aiScreening: {
        status: "processing",
        overallScore: 90,
        redFlags: []
      }
    });

    console.log("Mock application created with ID:", mockApp._id);

    // 2. Run the tracking agent
    console.log("Running tracking agent...");
    const result = await runTrackingAgent(mockApp._id);
    console.log("Tracking agent run complete. Result:", result);

    // 3. Fetch the updated application
    const updatedApp = await Application.findById(mockApp._id);
    console.log("Updated Application in DB stage key:", updatedApp.stage?.key);
    console.log("Updated Application in DB aiScreening status:", updatedApp.aiScreening?.status);
    console.log("Updated Application timeline:", JSON.stringify(updatedApp.timeline, null, 2));

    // 4. Assertions
    if (updatedApp.stage.key === "shortlisted" && updatedApp.aiScreening.status === "completed") {
      console.log("TEST PASSED: Application successfully moved to 'shortlisted' and screening status marked 'completed'.");
    } else {
      console.error("TEST FAILED: Application stage or status mismatch.");
    }

    // 5. Clean up
    await Application.findByIdAndDelete(mockApp._id);
    console.log("Cleaned up mock application.");
  } catch (error) {
    console.error("Test run failed with error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("DB Connection closed.");
  }
};

runTest();

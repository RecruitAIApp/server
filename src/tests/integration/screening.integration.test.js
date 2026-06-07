import test, { describe, before, after, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { connectDB } from "../../config/db.config.js";
import {
  createTestCandidate,
  createTestCandidateWithoutResume,
  createTestJob,
  createApplication
} from "../helpers/factories.js";
import Application from "../../modules/applications/application.model.js";
import Job from "../../modules/jobs/job.model.js";
import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import User from "../../modules/auth/user.model.js";
import Company from "../../modules/company/company.model.js";
import { handleScreening } from "../../workers/handlers/screening.handler.js";
import { LLMClient } from "../../modules/llm/LLMProvider.js";
import { aiAutomationQueue, trackingQueue, feedbackQueue } from "../../config/queues.js";
import { redisConnection } from "../../config/redis.config.js";
import { QueueService } from "../../common/services/queue.service.js";
import { cvParseHandler } from "../../workers/handlers/cv-parse.handler.js";

describe("AI Screening Integration Tests", () => {
  let validJob;
  let originalSend;

  before(async () => {
    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/recruitai-test";
    await connectDB();
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await aiAutomationQueue.close();
    await trackingQueue.close();
    await feedbackQueue.close();
    await redisConnection.quit();
  });

  beforeEach(async () => {
    // Clear collections
    await Application.deleteMany({});
    await Job.deleteMany({});
    await CandidateProfile.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});

    validJob = await createTestJob();
    mock.restoreAll();
  });

  it("Test 8: Missing PDF URL -> Screening runs using parsedData -> completed", async () => {
    const { user, profile } = await createTestCandidate(true);
    
    // Simulate missing PDF URL
    profile.resume.url = null;
    await profile.save();

    const application = await createApplication(validJob._id, user._id, validJob.company);
    application.appliedResume.url = null;
    await application.save();

    // Mock LLM to return valid JSON
    mock.method(LLMClient.prototype, "send", async () => {
      return {
        content: JSON.stringify({
          confidence: 85,
          scoreBreakdown: { skills: 90, experience: 80, education: 85, cultureFit: 80 },
          matchedSkills: ["Node.js", "MongoDB"],
          missingSkills: ["Express"],
          summary: "Good match",
          redFlags: []
        }),
      };
    });

    await handleScreening({ applicationId: application._id });

    const result = await Application.findById(application._id);
    assert.strictEqual(result.aiScreening.status, "completed");
    assert.strictEqual(result.aiScreening.overallScore, 85);
  });

  it("Test 9: Application not found -> Worker survives", async () => {
    try {
      await handleScreening({ applicationId: new mongoose.Types.ObjectId() });
      assert.fail("Should have thrown");
    } catch (err) {
      assert.match(err.message, /not found/i);
    }
  });

  it("Test 10: Malformed LLM JSON -> 3 retries occur -> failed", async () => {
    const { user } = await createTestCandidate(true);
    const application = await createApplication(validJob._id, user._id, validJob.company);

    let attempts = 0;
    mock.method(LLMClient.prototype, "send", async () => {
      attempts++;
      return { content: "This is not JSON {" };
    });

    try {
      await handleScreening({ applicationId: application._id });
      assert.fail("Should have thrown");
    } catch (err) {
      assert.match(err.message, /JSON/i);
    }

    assert.strictEqual(attempts, 3);
    const result = await Application.findById(application._id);
    assert.strictEqual(result.aiScreening.status, "failed");
    assert.match(result.aiScreening.summary, /LLM returned no JSON/i);
  });

  it("Test 11: LLM timeout -> Retries happen -> failed", async () => {
    const { user } = await createTestCandidate(true);
    const application = await createApplication(validJob._id, user._id, validJob.company);

    let attempts = 0;
    mock.method(LLMClient.prototype, "send", async () => {
      attempts++;
      throw new Error("LLM Timeout");
    });

    try {
      await handleScreening({ applicationId: application._id });
      assert.fail("Should have thrown");
    } catch (err) {
      assert.match(err.message, /LLM Timeout/i);
    }

    assert.strictEqual(attempts, 3);
    const result = await Application.findById(application._id);
    assert.strictEqual(result.aiScreening.status, "failed");
  });

  it("Test 12: Schema validation failure -> failed", async () => {
    const { user } = await createTestCandidate(true);
    const application = await createApplication(validJob._id, user._id, validJob.company);

    let attempts = 0;
    mock.method(LLMClient.prototype, "send", async () => {
      attempts++;
      return {
        content: JSON.stringify({
          confidence: "Eighty Five", // Invalid type
          scoreBreakdown: { skills: 90, experience: 80, education: 85, cultureFit: 80 },
        }),
      };
    });

    try {
      await handleScreening({ applicationId: application._id });
      assert.fail("Should have thrown");
    } catch (err) {
      assert.match(err.message, /invalid/i);
    }

    assert.strictEqual(attempts, 3);
    const result = await Application.findById(application._id);
    assert.strictEqual(result.aiScreening.status, "failed");
  });

  it("Test 13: Successful CV Extraction -> CV Embedding Job is Queued -> verified", async () => {
    const { user, profile } = await createTestCandidate(true);
    const application = await createApplication(validJob._id, user._id, validJob.company);

    // 1. Mock fetchPDFText to return text
    mock.method(cvParseHandler, "fetchPDFText", async () => "Simulated extracted CV text for embedding.");
    
    // 2. Mock QueueService.addJob to track calls
    const addJobMock = mock.method(QueueService, "addJob", async () => ({ id: "mock-job-id" }));

    // 3. Mock LLM to return valid JSON
    mock.method(LLMClient.prototype, "send", async () => {
      return {
        content: JSON.stringify({
          confidence: 95,
          scoreBreakdown: { skills: 95, experience: 90, education: 95, cultureFit: 90 },
          matchedSkills: ["Node.js"],
          missingSkills: [],
          summary: "Excellent candidate",
          redFlags: []
        }),
      };
    });

    await handleScreening({ applicationId: application._id });

    // 4. Assert the queueing happened correctly
    assert.strictEqual(addJobMock.mock.callCount(), 1);
    const [queueName, jobName, jobData] = addJobMock.mock.calls[0].arguments;
    
    assert.strictEqual(queueName, "background-tasks");
    assert.strictEqual(jobName, "EMBED_RESUME");
    assert.strictEqual(jobData.type, "EMBED_RESUME");
    assert.strictEqual(jobData.data.metadata.candidateId, user._id.toString());
    assert.strictEqual(jobData.data.metadata.jobId, validJob._id.toString());
  });
});

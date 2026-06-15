import test, { describe, before, after, it, beforeEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../../app.js";
import { connectDB } from "../../config/db.config.js";
import User from "../../modules/auth/user.model.js";
import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import Company from "../../modules/company/company.model.js";
import Job from "../../modules/jobs/job.model.js";
import { createUser, createCompany, createTestJob, createTestCandidate } from "../helpers/factories.js";
import { generateTestToken } from "../helpers/jwt.js";
import { VectorStoreService } from "../../modules/vectorstore/vectorstore.service.js";
import { aiAutomationQueue, trackingQueue, feedbackQueue } from "../../config/queues.js";
import { redisConnection } from "../../config/redis.config.js";

describe("Job Recommendations API Integration Tests", () => {
  let candidateUser;
  let candidateToken;
  let company;
  let employer;
  let originalGetVectorByMetadata;
  let originalRetrieveByVector;

  before(async () => {
    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/recruitai-test";
    await connectDB();

    // Mock VectorStoreService Pinecone calls to trigger fallback database & skill matching flow
    originalGetVectorByMetadata = VectorStoreService.getVectorByMetadata;
    originalRetrieveByVector = VectorStoreService.retrieveByVector;

    VectorStoreService.getVectorByMetadata = async () => null;
    VectorStoreService.retrieveByVector = async () => [];
  });

  after(async () => {
    // Restore mocks
    VectorStoreService.getVectorByMetadata = originalGetVectorByMetadata;
    VectorStoreService.retrieveByVector = originalRetrieveByVector;

    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await aiAutomationQueue.close();
    await trackingQueue.close();
    await feedbackQueue.close();
    await redisConnection.quit();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await CandidateProfile.deleteMany({});
    await Company.deleteMany({});
    await Job.deleteMany({});

    // Create default test candidate
    const data = await createTestCandidate();
    candidateUser = data.user;
    candidateToken = generateTestToken(candidateUser);

    // Create company & employer
    employer = await createUser("employer");
    company = await createCompany(employer._id);
  });

  it("should fail if not authenticated", async () => {
    const res = await request(app).get("/api/recommendations/me");
    assert.strictEqual(res.status, 401);
  });

  it("should return empty recommendations if no profile exists for candidate", async () => {
    const freshUser = await createUser("candidate");
    const freshToken = generateTestToken(freshUser);

    const res = await request(app)
      .get("/api/recommendations/me")
      .set("Authorization", `Bearer ${freshToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.deepStrictEqual(res.body.data.recommendations, []);
  });

  it("should return empty recommendations if profile is empty / has no skills", async () => {
    const freshUser = await createUser("candidate");
    const freshToken = generateTestToken(freshUser);
    await CandidateProfile.create({
      userId: freshUser._id,
      skills: [],
      resume: {
        parsedData: {
          skills: []
        }
      }
    });

    const res = await request(app)
      .get("/api/recommendations/me")
      .set("Authorization", `Bearer ${freshToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.deepStrictEqual(res.body.data.recommendations, []);
  });

  it("should return empty recommendations if jobs collection is empty", async () => {
    const res = await request(app)
      .get("/api/recommendations/me")
      .set("Authorization", `Bearer ${candidateToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.deepStrictEqual(res.body.data.recommendations, []);
  });

  it("should match jobs based on candidate skills (exact, case-insensitive, partial matching) and filter non-matching jobs", async () => {
    // Candidate profile (from factories.js) has: skills: ["Node.js", "MongoDB", "React"] and resume parsed: ["Node.js", "Express", "MongoDB"]
    // Let's create matching jobs:
    const mernJob = await createTestJob(company._id, employer._id, {
      title: "MERN Stack Developer",
      skills: ["MongoDB", "Express", "React", "Node.js"]
    });

    const nodeJob = await createTestJob(company._id, employer._id, {
      title: "Backend Node.js Developer",
      skills: ["node.js", "express", "javascript"]
    });

    const javascriptJob = await createTestJob(company._id, employer._id, {
      title: "Full Stack JavaScript Developer",
      skills: ["JavaScript", "React", "NodeJS"] // Case variation "NodeJS" vs "Node.js"
    });

    // Create non-matching jobs:
    const flutterJob = await createTestJob(company._id, employer._id, {
      title: "Flutter Developer",
      skills: ["Flutter", "Dart"],
      requirements: ["Flutter", "Dart", "Mobile App Development"]
    });

    const designJob = await createTestJob(company._id, employer._id, {
      title: "Graphic Designer",
      skills: ["Photoshop", "Illustrator"],
      requirements: ["Photoshop", "Illustrator", "Creative Design"]
    });

    const res = await request(app)
      .get("/api/recommendations/me")
      .set("Authorization", `Bearer ${candidateToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const recs = res.body.data.recommendations;
    assert.ok(recs.length > 0);

    // Verify matching jobs are in recommendations
    const matchingTitles = recs.map(r => r.job.title);
    assert.ok(matchingTitles.includes("MERN Stack Developer"));
    assert.ok(matchingTitles.includes("Backend Node.js Developer"));
    assert.ok(matchingTitles.includes("Full Stack JavaScript Developer"));

    // Verify non-matching jobs are NOT in recommendations
    assert.ok(!matchingTitles.includes("Flutter Developer"));
    assert.ok(!matchingTitles.includes("Graphic Designer"));

    // Ensure scores are reasonable
    recs.forEach(rec => {
      assert.ok(rec.score >= 30 && rec.score <= 100);
      assert.ok(rec.reason);
    });
  });

  it("should apply query parameter filters correctly", async () => {
    // Setup jobs with different locations and jobTypes
    await createTestJob(company._id, employer._id, {
      title: "Node Developer Cairo",
      skills: ["Node.js"],
      location: "Cairo"
    });

    await createTestJob(company._id, employer._id, {
      title: "Node Developer Alexandria",
      skills: ["Node.js"],
      location: "Alexandria"
    });

    // Filter by location=Cairo
    const res = await request(app)
      .get("/api/recommendations/me?location=Cairo")
      .set("Authorization", `Bearer ${candidateToken}`);

    assert.strictEqual(res.status, 200);
    const recs = res.body.data.recommendations;
    assert.strictEqual(recs.length, 1);
    assert.strictEqual(recs[0].job.title, "Node Developer Cairo");
  });
});

import test, { describe, before, after, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../../app.js";
import { connectDB } from "../../config/db.config.js";
import { aiAutomationQueue, trackingQueue, feedbackQueue } from "../../config/queues.js";
import { redisConnection } from "../../config/redis.config.js";
import {
  createTestCandidate,
  createTestCandidateWithoutResume,
  createTestJob,
  createClosedJob,
  createUser,
  createApplication
} from "../helpers/factories.js";
import { generateTestToken } from "../helpers/jwt.js";
import Application from "../../modules/applications/application.model.js";
import Job from "../../modules/jobs/job.model.js";
import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import User from "../../modules/auth/user.model.js";
import Company from "../../modules/company/company.model.js";

describe("POST /api/v1/applications/quick-apply", () => {
  let validJob;
  let closedJob;

  before(async () => {
    // connect to test database
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

    // Create common resources
    validJob = await createTestJob();
    closedJob = await createClosedJob();
    mock.restoreAll();
  });

  it("Test 1: Candidate with valid resume creates application", async () => {
    const { user, profile } = await createTestCandidate(true);
    const token = generateTestToken(user);

    let queueAddCalled = false;
    let queuedPayload = null;
    mock.method(aiAutomationQueue, "add", async (name, payload) => {
      queueAddCalled = true;
      queuedPayload = payload;
      return { id: "job-123" };
    });

    const res = await request(app)
      .post("/api/v1/applications/quick-apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: validJob._id });

    if (res.status !== 201) console.log(res.body);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data._id);

    // Verify DB
    const application = await Application.findById(res.body.data._id);
    assert.ok(application);
    assert.strictEqual(application.aiScreening.status, "queued");
    assert.strictEqual(application.appliedResume.url, profile.resume.url);

    // Verify Queue
    assert.strictEqual(queueAddCalled, true);
    assert.strictEqual(queuedPayload.applicationId.toString(), application._id.toString());
    assert.strictEqual(queuedPayload.jobId.toString(), validJob._id.toString());
    assert.strictEqual(queuedPayload.cvUrl, profile.resume.url);
  });

  it("Test 2: Candidate without resume returns 400", async () => {
    const { user } = await createTestCandidateWithoutResume();
    const token = generateTestToken(user);

    const res = await request(app)
      .post("/api/v1/applications/quick-apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: validJob._id });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /upload a resume before using Quick Apply/);

    const apps = await Application.countDocuments();
    assert.strictEqual(apps, 0);
  });

  it("Test 3: Duplicate application returns 409", async () => {
    const { user } = await createTestCandidate(true);
    const token = generateTestToken(user);

    // Initial apply
    await createApplication(validJob._id, user._id, validJob.company);

    const res = await request(app)
      .post("/api/v1/applications/quick-apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: validJob._id });

    assert.strictEqual(res.status, 409);
    assert.match(res.body.message, /already applied/);

    const apps = await Application.countDocuments();
    assert.strictEqual(apps, 1);
  });

  it("Test 4: Closed job returns 400", async () => {
    const { user } = await createTestCandidate(true);
    const token = generateTestToken(user);

    const res = await request(app)
      .post("/api/v1/applications/quick-apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: closedJob._id });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /not accepting applications/);
  });

  it("Test 5: Invalid jobId format returns 400", async () => {
    const { user } = await createTestCandidate(true);
    const token = generateTestToken(user);

    const res = await request(app)
      .post("/api/v1/applications/quick-apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: "invalid-id" });

    assert.strictEqual(res.status, 400);
    // Validation middleware sends 400
  });

  it("Test 6: Unauthorized user returns 401", async () => {
    const res = await request(app)
      .post("/api/v1/applications/quick-apply")
      .send({ jobId: validJob._id });

    assert.strictEqual(res.status, 401);
  });

  it("Test 7: Employer tries Quick Apply returns 403", async () => {
    const employer = await createUser("employer");
    const token = generateTestToken(employer);

    const res = await request(app)
      .post("/api/v1/applications/quick-apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: validJob._id });

    assert.strictEqual(res.status, 403);
  });
});

import test, { describe, before, after, it, beforeEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../../app.js";
import { connectDB } from "../../config/db.config.js";
import Job from "../../modules/jobs/job.model.js";
import User from "../../modules/auth/user.model.js";
import Company from "../../modules/company/company.model.js";
import { createTestCandidate, createTestJob } from "../helpers/factories.js";
import { generateTestToken } from "../helpers/jwt.js";
import { aiAutomationQueue, trackingQueue, feedbackQueue } from "../../config/queues.js";
import { redisConnection } from "../../config/redis.config.js";

describe("Jobs API Integration Tests", () => {
  let validJob;
  let employerToken;
  let candidateToken;
  let companyId;

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
    await Job.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});

    // Setup an Employer
    const employerRes = await request(app).post("/api/auth/register").send({
      email: "employer@example.com",
      password: "Password123!",
      fullName: "Employer",
      role: "employer",
    });
    
    // We must manually activate the employer so they can post jobs
    await User.updateOne({ email: "employer@example.com" }, { status: "active", isActive: true });
    
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "employer@example.com",
      password: "Password123!",
    });
    employerToken = loginRes.body.accessToken;

    // Create a Company
    const compRes = await request(app)
      .post("/api/companies")
      .set("Authorization", `Bearer ${employerToken}`)
      .send({
        name: "Test Company",
        website: "https://test.com",
        industry: "Tech",
        description: "A cool company",
        location: "Remote",
        size: "11-50",
      });
    companyId = compRes.body.data._id;
    await Company.findByIdAndUpdate(companyId, { status: "active", ActivationDate: new Date() });

    // Setup a Candidate
    const { user } = await createTestCandidate();
    candidateToken = generateTestToken(user);

    validJob = await createTestJob(companyId, loginRes.body.user.id);
  });

  it("should create a new job successfully as an employer", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${employerToken}`)
      .send({
        title: "Frontend Developer",
        description: "We need a frontend dev.",
        requirements: ["React", "CSS"],
        salaryRange: { min: 60, max: 80, currency: "USD" },
        location: "Remote",
        jobType: "remote",
        employmentType: "full-time",
        company: companyId,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, "Frontend Developer");
  });

  it("should fail to create a job as a candidate", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${candidateToken}`)
      .send({
        title: "Frontend Developer",
        description: "We need a frontend dev.",
        requirements: ["React"],
        salaryRange: { min: 60, max: 80, currency: "USD" },
        location: "Remote",
        jobType: "remote",
        employmentType: "full-time",
        company: companyId,
      });

    assert.strictEqual(res.status, 403);
  });

  it("should fetch all jobs with authentication", async () => {
    const res = await request(app)
      .get("/api/jobs")
      .set("Authorization", `Bearer ${candidateToken}`);
    
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.data));
    assert.ok(res.body.data.data.length >= 1);
  });

  it("should fetch a specific job by ID", async () => {
    const res = await request(app).get(`/api/jobs/${validJob._id}`);
    
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, validJob.title);
  });
});

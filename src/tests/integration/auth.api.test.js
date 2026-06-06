import test, { describe, before, after, it, beforeEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../../app.js";
import { connectDB } from "../../config/db.config.js";
import User from "../../modules/auth/user.model.js";
import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import EmployerProfile from "../../modules/auth/employerProfile.model.js";
import Company from "../../modules/company/company.model.js";
import { aiAutomationQueue, trackingQueue, feedbackQueue } from "../../config/queues.js";
import { redisConnection } from "../../config/redis.config.js";

describe("Auth API Integration Tests", () => {
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
    await User.deleteMany({});
    await CandidateProfile.deleteMany({});
    await EmployerProfile.deleteMany({});
    await Company.deleteMany({});
  });

  it("should register a new candidate successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newcandidate@example.com",
      password: "Password123!",
      fullName: "New Candidate",
      role: "candidate",
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.user);
    assert.strictEqual(res.body.user.email, "newcandidate@example.com");
  });

  it("should fail to register with an existing email", async () => {
    await request(app).post("/api/auth/register").send({
      email: "duplicate@example.com",
      password: "Password123!",
      fullName: "User 1",
      role: "candidate",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "duplicate@example.com",
      password: "Password123!",
      fullName: "User 2",
      role: "employer",
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Email is already registered/i);
  });

  it("should login successfully and return tokens", async () => {
    await request(app).post("/api/auth/register").send({
      email: "loginuser@example.com",
      password: "Password123!",
      fullName: "Login User",
      role: "candidate",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "loginuser@example.com",
      password: "Password123!",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.accessToken);
  });

  it("should fail login with incorrect password", async () => {
    await request(app).post("/api/auth/register").send({
      email: "wrongpass@example.com",
      password: "Password123!",
      fullName: "Login User",
      role: "candidate",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "wrongpass@example.com",
      password: "WrongPassword!",
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid email or password/i);
  });
});

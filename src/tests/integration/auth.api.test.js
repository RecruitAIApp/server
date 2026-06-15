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
    process.env.NODE_ENV = "test";
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

  // ──────────────────────────────────────────────────────────────────
  // Forgot Password — User Enumeration Prevention
  // ──────────────────────────────────────────────────────────────────

  it("should return generic success for a known email (forgot-password)", async () => {
    // Seed a real user
    await request(app).post("/api/auth/register").send({
      email: "known@example.com",
      password: "Password123!",
      fullName: "Known User",
      role: "candidate",
    });

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "known@example.com" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(
      res.body.message,
      /If an account exists for this email, a password reset link has been sent/i,
    );
  });

  it("should return the SAME generic success for a non-existing email (no enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@example.com" });

    // Must NOT return 404 — attacker gets no signal
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(
      res.body.message,
      /If an account exists for this email, a password reset link has been sent/i,
    );
  });

  it("should NOT return 404 for a non-existing email (enumeration guard)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    assert.notStrictEqual(res.status, 404);
  });

  it("should return 400 validation error when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({});

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  it("should return 400 validation error for an invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "not-an-email" });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  it("should only set a reset token for an existing user (email sent only for real accounts)", async () => {
    // Seed user
    await request(app).post("/api/auth/register").send({
      email: "realuser@example.com",
      password: "Password123!",
      fullName: "Real User",
      role: "candidate",
    });

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "realuser@example.com" });

    const user = await User.findOne({ email: "realuser@example.com" }).select(
      "+passwordResetToken +passwordResetExpires"
    );
    assert.ok(user.passwordResetToken, "Reset token should be set for existing user");
    assert.ok(user.passwordResetExpires, "Reset expiry should be set for existing user");
  });
});


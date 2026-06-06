import test, { describe, before, after, it, beforeEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../../app.js";
import { connectDB } from "../../config/db.config.js";
import User from "../../modules/auth/user.model.js";
import Company from "../../modules/company/company.model.js";
import { generateTestToken } from "../helpers/jwt.js";
import { aiAutomationQueue, trackingQueue, feedbackQueue } from "../../config/queues.js";
import { redisConnection } from "../../config/redis.config.js";

describe("Company API Integration Tests", () => {
  let employerUser;
  let employerToken;

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
    await Company.deleteMany({});

    employerUser = await User.create({
      email: "testemployer@example.com",
      password: "Password123!",
      fullName: "Test Employer",
      role: "employer",
      status: "active",
      isActive: true
    });
    employerToken = generateTestToken(employerUser);
  });

  it("should create a new company", async () => {
    const res = await request(app)
      .post("/api/companies")
      .set("Authorization", `Bearer ${employerToken}`)
      .send({
        name: "Acme Corp",
        website: "https://acme.com",
        industry: "Manufacturing",
        description: "We make anvils.",
        location: "New York",
        size: "51-200",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, "Acme Corp");
  });

  it("should fail to create a company without authorization", async () => {
    const res = await request(app)
      .post("/api/companies")
      .send({
        name: "Acme Corp",
        website: "https://acme.com",
      });

    assert.strictEqual(res.status, 401);
  });
});

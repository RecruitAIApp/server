import test, { describe, before, after, it, beforeEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../../app.js";
import { connectDB } from "../../config/db.config.js";
import User from "../../modules/auth/user.model.js";
import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import { createTestCandidate } from "../helpers/factories.js";
import { generateTestToken } from "../helpers/jwt.js";
import { aiAutomationQueue, trackingQueue, feedbackQueue } from "../../config/queues.js";
import { redisConnection } from "../../config/redis.config.js";

describe("Profiles API Integration Tests", () => {
  let candidateUser;
  let candidateToken;
  let profileId;

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

    const data = await createTestCandidate();
    candidateUser = data.user;
    candidateToken = generateTestToken(candidateUser);
    
    const profile = await CandidateProfile.findOne({ userId: candidateUser._id });
    profileId = profile._id;
  });

  it("should fetch the candidate's own profile", async () => {
    const res = await request(app)
      .get("/api/profiles/me")
      .set("Authorization", `Bearer ${candidateToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.profile.basicInfo.headline, "Backend Dev");
  });

  it("should fail to fetch profile if unauthorized", async () => {
    const res = await request(app).get("/api/profiles/me");
    assert.strictEqual(res.status, 401);
  });
});

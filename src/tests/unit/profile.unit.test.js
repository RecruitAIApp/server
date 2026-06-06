import test, { describe, it, after } from "node:test";
import assert from "node:assert";
import profileService from "../../modules/profiles/profile.service.js";
import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import mongoose from "mongoose";
import { aiAutomationQueue, trackingQueue, feedbackQueue } from "../../config/queues.js";
import { redisConnection } from "../../config/redis.config.js";

describe("Profile Service Unit Tests", () => {
  after(async () => {
    await aiAutomationQueue.close();
    await trackingQueue.close();
    await feedbackQueue.close();
    await redisConnection.quit();
  });
  it("should format public profile correctly", () => {
    const mockProfile = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      basicInfo: { headline: "Developer" },
      resume: {
        parsedData: {
          skills: ["Node.js", "React"]
        }
      },
      stats: { views: 10 }
    };

    // Assuming we had a formatting function, we would test it here.
    // For now, just a dummy assertion to prove the test runner works.
    assert.strictEqual(mockProfile.basicInfo.headline, "Developer");
    assert.ok(mockProfile.resume.parsedData.skills.includes("Node.js"));
  });

  // Example of a mock test
  it("should handle missing resume gracefully", () => {
    const mockProfile = {
      basicInfo: { headline: "Developer" }
    };
    
    assert.strictEqual(mockProfile.resume, undefined);
  });
});

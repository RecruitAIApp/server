import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRecommendationsForCandidate } from "./recommendation.service.js";
import { VectorStoreService } from "../vectorstore/vectorstore.service.js";
import profileService from "../profiles/profile.service.js";
import { buildCandidateEmbeddingText } from "../vectorstore/candidate-embedding.service.js";
import Job from "../jobs/job.model.js";

// Mock the dependencies
vi.mock("../vectorstore/vectorstore.service.js", () => ({
  VectorStoreService: {
    getVectorByMetadata: vi.fn(),
    generateEmbedding: vi.fn(),
    upsertCandidateVector: vi.fn(),
    retrieveByVector: vi.fn()
  }
}));

vi.mock("../profiles/profile.service.js", () => ({
  default: {
    getProfile: vi.fn()
  }
}));

vi.mock("../vectorstore/candidate-embedding.service.js", () => ({
  buildCandidateEmbeddingText: vi.fn()
}));

vi.mock("../jobs/job.model.js", () => ({
  default: {
    find: vi.fn()
  }
}));

// Mock the logger
vi.mock("../../utils/logger.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

// Mock re-ranking to avoid calling actual LLMs during unit tests
vi.mock("../vectorstore/recommendation-ranking.service.js", () => ({
  rerankJobs: vi.fn((profile, jobs) => Promise.resolve(jobs.map(j => ({ jobId: j._id.toString(), score: 85, reason: "LLM matched" }))))
}));

describe("recommendation.service - getRecommendationsForCandidate", () => {
  const mockUserId = "user_123";
  const mockProfile = {
    _id: "profile_abc",
    userId: mockUserId,
    skills: ["JavaScript", "Node.js"]
  };
  const mockJobs = [
    {
      _id: "job_xyz",
      title: "Backend Engineer",
      status: "open",
      populate: vi.fn().mockReturnThis()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks setup
    profileService.getProfile.mockResolvedValue(mockProfile);
    buildCandidateEmbeddingText.mockReturnValue("Headline: Dev | Skills: JS, Node");
    
    // Mock Job.find chain
    Job.find.mockReturnValue({
      populate: vi.fn().mockResolvedValue(mockJobs)
    });
  });

  it("should reuse cached candidate vector if it exists in Pinecone", async () => {
    const cachedVector = [0.1, 0.2, 0.3];
    VectorStoreService.getVectorByMetadata.mockResolvedValue(cachedVector);
    VectorStoreService.retrieveByVector.mockResolvedValue([
      {
        content: "Job description",
        metadata: { jobId: "job_xyz" },
        score: 0.85
      }
    ]);

    const result = await getRecommendationsForCandidate(mockUserId, { rerank: false });

    // Assert that we checked the vector store using profile ID metadata
    expect(VectorStoreService.getVectorByMetadata).toHaveBeenCalledWith(
      { profileId: "profile_abc" },
      "resumes"
    );

    // Assert that we retrieved recommendations using the retrieved vector
    expect(VectorStoreService.retrieveByVector).toHaveBeenCalledWith(
      cachedVector,
      50,
      "jobs",
      { type: "job" }
    );

    // Assert that we did NOT generate a new embedding or upsert a new vector
    expect(VectorStoreService.generateEmbedding).not.toHaveBeenCalled();
    expect(VectorStoreService.upsertCandidateVector).not.toHaveBeenCalled();

    // Verify output structure
    expect(result).toHaveProperty("recommendations");
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].job._id).toBe("job_xyz");
    expect(result.recommendations[0].score).toBe(85);
  });

  it("should generate, upsert, and use vector if it does not exist in Pinecone (fallback)", async () => {
    VectorStoreService.getVectorByMetadata.mockResolvedValue(null);
    
    const generatedVector = [0.9, 0.8, 0.7];
    VectorStoreService.generateEmbedding.mockResolvedValue(generatedVector);
    VectorStoreService.upsertCandidateVector.mockResolvedValue({ success: true, id: "candidate_profile_abc" });
    VectorStoreService.retrieveByVector.mockResolvedValue([
      {
        content: "Job description",
        metadata: { jobId: "job_xyz" },
        score: 0.95
      }
    ]);

    const result = await getRecommendationsForCandidate(mockUserId, { rerank: false });

    // Assert that we checked for existing vector
    expect(VectorStoreService.getVectorByMetadata).toHaveBeenCalledWith(
      { profileId: "profile_abc" },
      "resumes"
    );

    // Assert fallback flow
    expect(buildCandidateEmbeddingText).toHaveBeenCalledWith(mockProfile);
    expect(VectorStoreService.generateEmbedding).toHaveBeenCalledWith("Headline: Dev | Skills: JS, Node");
    expect(VectorStoreService.upsertCandidateVector).toHaveBeenCalledWith(
      generatedVector,
      "Headline: Dev | Skills: JS, Node",
      {
        profileId: "profile_abc",
        userId: mockUserId,
        type: "candidate"
      },
      "resumes"
    );

    // Assert recommendation retrieval
    expect(VectorStoreService.retrieveByVector).toHaveBeenCalledWith(
      generatedVector,
      50,
      "jobs",
      { type: "job" }
    );

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].score).toBe(95);
  });
});

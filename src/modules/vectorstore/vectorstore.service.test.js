import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock functions so they are initialized before vi.mock calls are evaluated
const {
  mockUpsert,
  mockQuery,
  mockDeleteMany,
  mockDescribeIndex,
  mockEmbedQuery
} = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockQuery: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockDescribeIndex: vi.fn(),
  mockEmbedQuery: vi.fn()
}));

// Mock Pinecone before importing VectorStoreService
vi.mock("@pinecone-database/pinecone", () => {
  const MockPinecone = vi.fn().mockImplementation(function() {
    this.Index = vi.fn().mockImplementation(function() {
      return {
        namespace: vi.fn().mockImplementation(function() {
          return {
            upsert: mockUpsert,
            query: mockQuery,
            deleteMany: mockDeleteMany
          };
        })
      };
    });
    this.describeIndex = mockDescribeIndex;
  });
  return { Pinecone: MockPinecone };
});

// Mock LangChain embeddings before importing
vi.mock("@langchain/google-genai", () => {
  const MockEmbeddings = vi.fn().mockImplementation(function() {
    this.embedQuery = mockEmbedQuery;
  });
  return { GoogleGenerativeAIEmbeddings: MockEmbeddings };
});

// Now import VectorStoreService
import { VectorStoreService } from "./vectorstore.service.js";

describe("VectorStoreService New Methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateEmbedding", () => {
    it("should call embeddings.embedQuery and return the embedding", async () => {
      const mockVector = [0.1, 0.2, 0.3];
      mockEmbedQuery.mockResolvedValue(mockVector);

      const result = await VectorStoreService.generateEmbedding("hello world");

      expect(mockEmbedQuery).toHaveBeenCalledWith("hello world");
      expect(result).toEqual(mockVector);
    });
  });

  describe("upsertCandidateVector", () => {
    it("should upsert vector to Pinecone index namespace with text in metadata", async () => {
      mockUpsert.mockResolvedValue({});

      const vector = [0.1, 0.2, 0.3];
      const text = "Candidate Profile Text";
      const metadata = { profileId: "123", userId: "456", type: "candidate" };

      const result = await VectorStoreService.upsertCandidateVector(vector, text, metadata, "resumes");

      expect(mockUpsert).toHaveBeenCalledWith([
        {
          id: "candidate_123",
          values: vector,
          metadata: {
            profileId: "123",
            userId: "456",
            type: "candidate",
            text: "Candidate Profile Text"
          }
        }
      ]);
      expect(result).toEqual({ success: true, id: "candidate_123" });
    });
  });

  describe("getVectorByMetadata", () => {
    it("should return the vector values if found in Pinecone via metadata query", async () => {
      mockDescribeIndex.mockResolvedValue({ dimension: 3 });
      mockQuery.mockResolvedValue({
        matches: [
          {
            id: "candidate_123",
            values: [0.9, 0.8, 0.7],
            metadata: { profileId: "123" }
          }
        ]
      });

      const metadata = { profileId: "123" };
      const result = await VectorStoreService.getVectorByMetadata(metadata, "resumes");

      expect(mockQuery).toHaveBeenCalledWith({
        vector: [0, 0, 0],
        filter: metadata,
        topK: 1,
        includeVectors: true,
        includeMetadata: true
      });
      expect(result).toEqual([0.9, 0.8, 0.7]);
    });

    it("should return null if no vector matches the metadata", async () => {
      mockDescribeIndex.mockResolvedValue({ dimension: 3 });
      mockQuery.mockResolvedValue({ matches: [] });

      const metadata = { profileId: "999" };
      const result = await VectorStoreService.getVectorByMetadata(metadata, "resumes");

      expect(result).toBeNull();
    });
  });

  describe("retrieveByVector", () => {
    it("should query Pinecone by vector directly and return mapped matches", async () => {
      mockQuery.mockResolvedValue({
        matches: [
          {
            id: "job_1",
            score: 0.95,
            metadata: {
              jobId: "job_1",
              text: "Backend job details",
              company: "Google"
            }
          }
        ]
      });

      const queryVector = [0.1, 0.2, 0.3];
      const result = await VectorStoreService.retrieveByVector(queryVector, 5, "jobs", { type: "job" });

      expect(mockQuery).toHaveBeenCalledWith({
        vector: queryVector,
        topK: 5,
        filter: { type: "job" },
        includeMetadata: true
      });

      expect(result).toEqual([
        {
          content: "Backend job details",
          metadata: {
            jobId: "job_1",
            company: "Google"
            // text should be deleted
          },
          score: 0.95
        }
      ]);
    });
  });
});

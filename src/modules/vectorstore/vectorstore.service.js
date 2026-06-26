import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import crypto from "crypto";
import config from "../../config/index.js";

const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: config.embedding.model || "gemini-embedding-2",
  apiKey: config.llm.google.apiKey,
});

const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

const index = pinecone.Index(config.pinecone.indexName);

let cachedDimension = null;

async function getIndexDimension() {
  if (cachedDimension) return cachedDimension;
  try {
    if (typeof pinecone.describeIndex === "function") {
      const desc = await pinecone.describeIndex(config.pinecone.indexName);
      if (desc && desc.dimension) {
        cachedDimension = desc.dimension;
        return cachedDimension;
      }
    }
  } catch (err) {
    console.warn(`[VectorStoreService] Could not describe index, using fallback dimension:`, err.message);
  }
  
  // Fallback dimension for gemini-embedding-2 is 768
  cachedDimension = 768;
  return cachedDimension;
}

export const VectorStoreService = {
  async generateEmbedding(text) {
    try {
      return await embeddings.embedQuery(text);
    } catch (error) {
      console.error("[VectorStoreService] Error in generateEmbedding:", error.message);
      throw error;
    }
  },

  async getVectorByMetadata(metadata = {}, namespace = "resumes") {
    try {
      if (Object.keys(metadata).length === 0) {
        throw new Error("Metadata filter is required to retrieve a vector.");
      }

      const dimension = await getIndexDimension();

      // Query with a zero-vector and metadata filter to retrieve the stored candidate vector
      const queryResponse = await index.namespace(namespace).query({
        vector: Array(dimension).fill(0),
        filter: metadata,
        topK: 1,
        includeVectors: true,
        includeMetadata: true
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        return queryResponse.matches[0].values;
      }
      return null;
    } catch (error) {
      console.error("[VectorStoreService] Error in getVectorByMetadata:", error.message);
      throw error;
    }
  },

  async retrieveByVector(vector, limit = 5, namespace = "default", filter = {}) {
    try {
      const queryResponse = await index.namespace(namespace).query({
        vector,
        topK: limit,
        filter,
        includeMetadata: true
      });

      return (queryResponse.matches || []).map(match => {
        const metadata = match.metadata ? { ...match.metadata } : {};
        const content = metadata.text || "";
        delete metadata.text; // Align with similaritySearch representation
        
        return {
          content,
          metadata,
          score: match.score
        };
      });
    } catch (error) {
      console.error("[VectorStoreService] Error in retrieveByVector:", error.message);
      throw error;
    }
  },

  async upsertCandidateVector(vector, text, metadata = {}, namespace = "resumes") {
    try {
      const id = metadata.profileId ? `candidate_${metadata.profileId}` : crypto.randomUUID();
      
      const pineconeMetadata = {
        ...metadata,
        text
      };

      await index.namespace(namespace).upsert([{
        id,
        values: vector,
        metadata: pineconeMetadata
      }]);

      return { success: true, id };
    } catch (error) {
      console.error("[VectorStoreService] Error in upsertCandidateVector:", error.message);
      throw error;
    }
  },

  async embedAndSave(text, metadata = {}, namespace = "default", chunkOptions = {}) {
    try {
      // Default to skipChunking: true as requested for jobs/cvs
      const { 
        skipChunking = true, 
        chunkSize = 1000, 
        chunkOverlap = 200 
      } = chunkOptions;

      let docs;
      
      if (skipChunking) {
        // Create a single document without splitting
        docs = [{
          pageContent: text,
          metadata: metadata
        }];
      } else {
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize,
          chunkOverlap,
        });
        docs = await splitter.createDocuments([text], [metadata]);
      }

      await PineconeStore.fromDocuments(docs, embeddings, {
        pineconeIndex: index,
        namespace,
        textKey: "text",
      });

      return { success: true, chunks: docs.length };
    } catch (error) {
      console.error("[VectorStoreService] Error in embedAndSave:", error.message);
      throw error;
    }
  },

  async retrieve(query, limit = 5, namespace = "default", filter = {}) {
    try {
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: index,
        namespace,
        textKey: "text",
      });

      const results = await vectorStore.similaritySearch(query, limit, filter);
      
      return results.map(res => ({
        content: res.pageContent,
        metadata: res.metadata
      }));
    } catch (error) {
      console.error("[VectorStoreService] Error in retrieve:", error.message);
      throw error;
    }
  },

  // query is the raw text of candidate 
  async retrieveWithScore(query, limit = 5, namespace = "default", filter = {}) {
    try {
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: index,
        namespace,
        textKey: "text",
      });

      const results = await vectorStore.similaritySearchWithScore(query, limit, filter);
      
      return results.map(([res, score]) => ({
        content: res.pageContent,
        metadata: res.metadata,
        score
      }));
    } catch (error) {
      console.error("[VectorStoreService] Error in retrieveWithScore:", error.message);
      throw error;
    }
  },

  async deleteByFilter(namespace = "default", filter = {}) {
    try {
      if (Object.keys(filter).length === 0) {
        throw new Error("Filter is required to delete vectors safely.");
      }

      await index.namespace(namespace).deleteMany(filter);
      
      return { success: true };
    } catch (error) {
      console.error("[VectorStoreService] Error in deleteByFilter:", error.message);
      throw error;
    }
  }
};

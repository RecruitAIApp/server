import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import config from "../../config/index.js";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: config.llm.google.apiKey,
  modelName: config.embedding.model || "gemini-embedding-2",
});

const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

const index = pinecone.Index(config.pinecone.indexName);


export const VectorStoreService = {
  async embedAndSave(text, metadata = {}, namespace = "default", chunkOptions = {}) {
    try {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: chunkOptions.chunkSize || 1000,
        chunkOverlap: chunkOptions.chunkOverlap || 200,
      });

      const docs = await splitter.createDocuments([text], [metadata]);

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
  }
};

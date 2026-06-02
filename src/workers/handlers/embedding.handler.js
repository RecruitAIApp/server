import { VectorStoreService } from "../../modules/vectorstore/vectorstore.service.js";

export async function handleEmbedding(data) {
  await VectorStoreService.embedAndSave(data.text, data.metadata, "resumes");
}

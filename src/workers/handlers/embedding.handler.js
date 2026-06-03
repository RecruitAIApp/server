import { VectorStoreService } from "../../modules/vectorstore/vectorstore.service.js";

export async function handleEmbedding(data) {
  const { text, metadata, namespace = "resumes", chunkOptions = {} } = data;
  await VectorStoreService.embedAndSave(text, metadata, namespace, chunkOptions);
}

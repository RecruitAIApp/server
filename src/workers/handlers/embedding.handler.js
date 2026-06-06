import { VectorStoreService } from "../../modules/vectorstore/vectorstore.service.js";

export async function handleEmbedding(data) {
  const { text, metadata, namespace = "resumes", chunkOptions = {} } = data;
  await VectorStoreService.embedAndSave(text, metadata, namespace, chunkOptions);
}

export async function handleDeleteEmbedding(data) {
  const { filter, namespace = "resumes" } = data;
  await VectorStoreService.deleteByFilter(namespace, filter);
}

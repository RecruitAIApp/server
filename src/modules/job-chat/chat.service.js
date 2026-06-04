import JobChat from "./chat.model.js";
import Job from "../jobs/job.model.js";
import { LLMFactory } from "../llm/llm.service.js";
import { ROLES } from "../llm/llm.constants.js";

class JobChatService {
  constructor() {
    this.llmClient = LLMFactory.create("groq"); 
  }

  async getChat(userId, jobId) {
    let chat = await JobChat.findOne({ userId, jobId });
    if (!chat) {
      chat = await JobChat.create({ userId, jobId, messages: [] });
    }
    return chat;
  }

  async addMessage(userId, jobId, content) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const chat = await this.getChat(userId, jobId);

    const systemPrompt = this._generateSystemPrompt(job);

    const session = this.llmClient.createChatSession({
      systemPrompt,
      maxHistory: 20,
    });

    const history = chat.messages.map(m => ({
      role: m.role === "human" ? ROLES.HUMAN : ROLES.AI,
      content: m.content
    }));
    session.loadHistory(history);

    const response = await session.send(content);

    chat.messages.push({ role: "human", content });
    chat.messages.push({ role: "ai", content: response.content });
    await chat.save();

    return response.content;
  }

  async getAllMessages(userId, jobId) {
    const chat = await JobChat.findOne({ userId, jobId });
    return chat ? chat.messages : [];
  }

  async deleteChat(userId, jobId) {
    return await JobChat.findOneAndDelete({ userId, jobId });
  }

  _generateSystemPrompt(job) {
    const jobContext = `
JOB TITLE: ${job.title}
JOB DESCRIPTION: ${job.description}
REQUIREMENTS: ${job.requirements.join(", ")}
LOCATION: ${job.location}
JOB TYPE: ${job.jobType}
EMPLOYMENT TYPE: ${job.employmentType}
EXPERIENCE LEVEL: ${job.experienceLevel}
SALARY RANGE: ${job.salaryRange.min} - ${job.salaryRange.max} ${job.salaryRange.currency}
SKILLS REQUIRED: ${job.skills.join(", ")}
    `.trim();

    return `
You are a highly efficient recruitment assistant specialized in answering questions about a specific job opening.

### YOUR GOAL:
Provide accurate, helpful, and concise information to candidates regarding the job listed below.

### CONSTRAINTS:
1. ONLY answer questions related to this specific job.
2. If a question is outside the scope of this job (e.g., general career advice, other jobs, personal questions), politely decline and refocus the conversation on this job.
3. Use only the provided JOB DETAILS to answer. If information is missing, state that you don't have that specific information.
4. Maintain a professional and welcoming tone.

### JOB DETAILS:
${jobContext}

### RESPONSE STYLE:
- Be concise.
- Use bullet points if listing facts.
- Do not hallucinate details not present in the job description.
    `.trim();
  }
}

export default new JobChatService();

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
    const job = await Job.findById(jobId).populate("company");
    if (!job) {
      throw new Error("Job not found");
    }

    const chat = await this.getChat(userId, jobId);

    const systemPrompt = this._generateSystemPrompt(job, job.company);

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

  _generateSystemPrompt(job, company) {
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

    const companyContext = company ? `
COMPANY NAME: ${company.name}
COMPANY DESCRIPTION: ${company.description}
INDUSTRY: ${company.industry}
COMPANY SIZE: ${company.size}
WEBSITE: ${company.website}
LOCATION: ${company.location}
    `.trim() : "No specific company details available.";

    return `
You are a highly efficient recruitment assistant specialized in answering questions about a specific job opening and the company offering it.

### COMPANY OVERVIEW:
${companyContext}

### JOB DETAILS:
${jobContext}

### YOUR GOAL:
Provide accurate, helpful, and concise information to candidates regarding the job and the company.

### CONSTRAINTS:
1. ONLY answer questions related to this specific job or company.
2. If a question is outside the scope (e.g., general career advice, other jobs, personal questions), politely decline and refocus.
3. Use only the provided information. If information is missing (e.g. specific benefit not listed), state that you don't have that specific info.
4. Maintain a professional, informative, and welcoming tone.
5. If asked about the application process, explain that they can use the "Quick Apply" or "Custom CV" buttons on the page.

### RESPONSE STYLE:
- Be concise and direct.
- Use bullet points for readability.
- Formatting: Use Markdown (bold, lists).
    `.trim();
  }
}

export default new JobChatService();

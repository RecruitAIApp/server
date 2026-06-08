import { z } from "zod";
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { 
  HumanMessage, 
  AIMessage, 
  ToolMessage,
} from "@langchain/core/messages";
import { LLMFactory } from "../llm/llm.service.js";
import { ROLES } from "../llm/llm.constants.js";
import { 
  getApplicationsTool, 
  searchCVsTool, 
  searchCandidateProfilesTool 
} from "./application-chat.tools.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("hr-agent");


function toPlainMessages(messages) {
  return messages.map(msg => {
    const type = msg._getType();
    let role;
    if (type === "human") role = ROLES.HUMAN;
    else if (type === "ai") role = ROLES.AI;
    else if (type === "system") role = ROLES.SYSTEM;
    else if (type === "tool") role = ROLES.TOOL;
    else role = ROLES.AI;

    const content = typeof msg.content === "string"
      ? msg.content
      : JSON.stringify(msg.content || "");

    return {
      role,
      content,
      ...(msg.tool_calls?.length && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
    };
  });
}

const withLogging = (name, fn) => async (args) => {
  logger.info(`→ Tool called: ${name}`, args);
  const result = await fn(args);
  
  let logResult = result;
  try {
    if (typeof result === "string") {
      logResult = JSON.parse(result);
    }
  } catch (e) {
  }
  
  logger.info(`← Tool result: ${name}`, { result: logResult });
  return result;
};


const get_applications = tool(
  withLogging("get_applications", async ({ jobId, stage, min_score, min_exp }) => {
    return await getApplicationsTool(jobId, { stage, minScore: min_score, minExp: min_exp });
  }),
  {
    name: "get_applications",
    description:
      "Retrieve all job applications for this job. Optionally filter by hiring stage (e.g. 'applied', 'shortlisted'), minimum AI screening score (0-100), or minimum years of experience.",
    schema: z.object({
      jobId: z.string().describe("The Job ID to fetch applications for. Always pass the jobId from context."),
      stage: z.string().optional().describe("Hiring stage filter e.g. 'applied', 'shortlisted', 'interview'"),
      min_score: z.number().optional().describe("Minimum AI screening score 0-100"),
      min_exp: z.number().optional().describe("Minimum years of experience"),
    }),
  }
);

const search_profiles = tool(
  withLogging("search_profiles", async ({ jobId, skills, min_exp, location, institution }) => {
    return await searchCandidateProfilesTool({ jobId, skills, minExp: min_exp, location, institution });
  }),
  {
    name: "search_profiles",
    description:
      "Search candidate profiles by structured attributes. Use this to find candidates with specific skills, a minimum experience level, a city/location, or an educational institution. Always filter by jobId to restrict to job applicants.",
    schema: z.object({
      jobId: z.string().describe("The Job ID to restrict search to job applicants. Always provide this."),
      skills: z.array(z.string()).optional().describe("Required skills e.g. ['Python', 'NLP']"),
      min_exp: z.number().optional().describe("Minimum years of experience"),
      location: z.string().optional().describe("City name e.g. 'Cairo'"),
      institution: z.string().optional().describe("University or school name e.g. 'State University'"),
    }),
  }
);

const search_cvs = tool(
  withLogging("search_cvs", async ({ jobId, query }) => {
    return await searchCVsTool(jobId, query);
  }),
  {
    name: "search_cvs",
    description:
      "Perform semantic search on resumes/CVs using natural language. Use this for open-ended queries about background, projects, interests, or content not captured in structured profile fields. Returns matching snippets with a candidateId for reference.",
    schema: z.object({
      jobId: z.string().describe("The Job ID to scope the CV search."),
      query: z.string().describe("Natural language query e.g. 'experience with transformer models'"),
    }),
  }
);

const toolList = [get_applications, search_profiles, search_cvs];
const toolNode = new ToolNode(toolList);

const finalAnswerSchema = z.object({
  answer: z.string().describe("Clear, concise answer to the HR question, grounded only in tool data."),
  candidates: z.array(z.object({
    id: z.string().describe("The userId or applicationId of the candidate"),
    name: z.string().describe("Full name of the candidate"),
    highlight: z.string().describe("Key reason this candidate is relevant to the question"),
  })).describe("List of directly relevant candidates. Leave empty if none found."),
});

const baseClient = LLMFactory.create("google", {model: "gemini-2.5-flash"});
const agentClient = baseClient.bindTools(toolList);

export const AgentState = Annotation.Root({
  jobId: Annotation(),
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  final_answer: Annotation(),
});


const SYSTEM_PROMPT = (jobId) => `\
You are a professional HR AI Assistant helping recruiters analyze candidates for Job ID: ${jobId}.

## Your Capabilities
- get_applications: Fetch all applicants with their AI screening data and candidate info.
- search_profiles: Search by structured attributes — skills, experience, location, or education.
- search_cvs: Semantic CV search for open-ended questions about background or projects.

## Strict Rules
1. ALWAYS pass the jobId argument when calling any tool.
2. NEVER fabricate or assume candidate information. Your answer MUST be 100% based on tool results.
3. If a tool returns "No results found", acknowledge it honestly. Do not infer data.
4. For questions about education, institution, or specific background details — use search_profiles with the institution field, or search_cvs with a descriptive query.
5. NO REDUNDANT CALLS: Check your message history. If you already called a tool with the same arguments and got a result, DO NOT call it again. If the data isn't there, it doesn't exist.
6. Once you have sufficient information, stop calling tools and provide your final answer.
7. Call one tool at a time unless parallel calls are truly necessary.`;

async function callAgentNode(state) {
  const { messages, jobId } = state;
  logger.info(`[agent] Reasoning — job=${jobId}, history_len=${messages.length}`);

  const plainMessages = toPlainMessages(messages);

  const response = await agentClient.send([
    { role: ROLES.SYSTEM, content: SYSTEM_PROMPT(jobId) },
    ...plainMessages
  ]);

  const toolCalls = response.toolCalls || [];
  if (toolCalls.length > 0) {
    logger.info(`[agent] Tool calls: ${toolCalls.map(t => t.name).join(", ")}`);
  } else {
    logger.info("[agent] No tool calls — moving to finalize.");
  }

  return {
    messages: [new AIMessage({ content: response.content || "", tool_calls: toolCalls })],
  };
}

async function finalizeNode(state) {
  const { messages, jobId } = state;
  logger.info(`[finalize] Generating structured answer for job=${jobId}`);

  const finalizePrompt = `\
You are summarizing findings for an HR recruiter regarding Job ID: ${jobId}.
Based ONLY on the conversation and tool results above, produce a structured final answer.
- answer: Direct, evidence-based response to the recruiter's question.
- candidates: Only candidates explicitly found in the tool results. Do NOT invent or assume candidates.`;

  const plainMessages = toPlainMessages(messages);

  const response = await baseClient.sendStructured([
    { role: ROLES.SYSTEM, content: finalizePrompt },
    ...plainMessages
  ], finalAnswerSchema);

  logger.info("[finalize] Answer generated.");
  return { final_answer: response.data };
}

const workflow = new StateGraph(AgentState)
  .addNode("agent", callAgentNode)
  .addNode("tools", toolNode)
  .addNode("finalize", finalizeNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition, {
    tools: "tools",
    [END]: "finalize",
  })
  .addEdge("tools", "agent")
  .addEdge("finalize", END);

const hrAgentGraph = workflow.compile();

export async function runHRAgent(jobId, history) {
  const initialMessages = history.map(h => {
    if (h.role === "human") return new HumanMessage(h.content);
    if (h.role === "tool") return new ToolMessage({ content: h.content, tool_call_id: h.tool_call_id || "unknown" });
    return new AIMessage({ content: h.content, tool_calls: h.tool_calls || [] });
  });

  logger.info(`[runHRAgent] Invoking graph — job=${jobId}, history=${initialMessages.length}`);

  const result = await hrAgentGraph.invoke({ jobId, messages: initialMessages });

  const newRawMessages = result.messages.slice(initialMessages.length);
  const newMessages = toPlainMessages(newRawMessages);

  logger.info(`[runHRAgent] Done — answer="${result.final_answer?.answer?.slice(0, 80)}..."`);

  return {
    finalAnswer: result.final_answer,
    newMessages,
  };
}

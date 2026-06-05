import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { fetchMissingSkillsNode, generateEmailWithLLMNode } from "./feedback.nodes.js";

const FeedbackStateAnnotation = Annotation.Root({
  applicationId: Annotation(),
  hrNotes: Annotation(),
  candidateName: Annotation(),
  candidateEmail: Annotation(),
  missingSkills: Annotation(),
  jobTitle: Annotation(),
  stageKey: Annotation(),
  decision: Annotation(),
  generatedEmail: Annotation(),
});

const workflow = new StateGraph(FeedbackStateAnnotation)
  .addNode("fetchMissingSkillsNode", fetchMissingSkillsNode)
  .addNode("generateEmailWithLLMNode", generateEmailWithLLMNode)
  .addEdge(START, "fetchMissingSkillsNode")
  .addEdge("fetchMissingSkillsNode", "generateEmailWithLLMNode")
  .addEdge("generateEmailWithLLMNode", END);

export const feedbackAgent = workflow.compile();

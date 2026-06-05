import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import Application from "../application.model.js";
import { fetchApplicationDataNode, evaluateRulesAndUpdateDBNode } from "./tracking.nodes.js";

const TrackingStateAnnotation = Annotation.Root({
  applicationId: Annotation(),
  overallScore: Annotation(),
  redFlags: Annotation(),
  currentStage: Annotation(),
  nextStage: Annotation(),
});

const workflow = new StateGraph(TrackingStateAnnotation)
  .addNode("fetchApplicationDataNode", fetchApplicationDataNode)
  .addNode("evaluateRulesAndUpdateDBNode", evaluateRulesAndUpdateDBNode)
  .addEdge(START, "fetchApplicationDataNode")
  .addEdge("fetchApplicationDataNode", "evaluateRulesAndUpdateDBNode")
  .addEdge("evaluateRulesAndUpdateDBNode", END);

export const trackingAgent = workflow.compile();

/**
 * This is the main function for the tracking agent.
 * It is called by the screening queue when an application is enqueued.
 * @param {*} applicationId 
 * @returns 
 */
export const runTrackingAgent = async (applicationId) => {
  const trackingGraphState = {
    applicationId,
    overallScore: null,
    redFlags: null,
    currentStage: null,
    nextStage: null,
  };

  const result = await trackingAgent.invoke(trackingGraphState);

  console.log(`[Tracking Agent] Application ${applicationId} processed. Next stage: ${result.nextStage}`);

  return result;
}
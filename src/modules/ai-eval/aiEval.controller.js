import * as aiEvalService from "./aiEval.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

export const saveEvalResult = async (req, res, next) => {
  try {
    const data = await aiEvalService.saveEvalResultService(req.body);
    return sendResponse(res, 201, true, "Evaluation result saved", data);
  } catch (err) {
    next(err);
  }
};

export const getEvalSummary = async (req, res, next) => {
  try {
    const data = await aiEvalService.getEvalSummaryService(
      req.query.agentName,
      req.query.days,
    );
    return sendResponse(res, 200, true, "Evaluation summary fetched", data);
  } catch (err) {
    next(err);
  }
};

export const getEvalFailures = async (req, res, next) => {
  try {
    const data = await aiEvalService.getEvalFailuresService(
      req.query.agentName,
      req.query.page,
      req.query.limit,
    );
    return sendResponse(res, 200, true, "Evaluation failures fetched", data);
  } catch (err) {
    next(err);
  }
};

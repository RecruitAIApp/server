import { applicationChatService } from "./application-chat.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

export const getChatHistory = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const history = await applicationChatService.getChatHistory(userId, jobId);
    
    return sendResponse(res, 200, true, "Chat history retrieved successfully", history);
  } catch (error) {
    return sendResponse(res, error.statusCode || 500, false, error.message);
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    const response = await applicationChatService.handleNewMessage(userId, jobId, message);
    
    return sendResponse(res, 200, true, "Message sent successfully", response);
  } catch (error) {
    return sendResponse(res, error.statusCode || 500, false, error.message);
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    await applicationChatService.deleteChat(userId, jobId);
    
    return sendResponse(res, 204, true, "Chat history deleted successfully", null);
  } catch (error) {
    return sendResponse(res, error.statusCode || 500, false, error.message);
  }
};

import chatService from "./chat.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

export const sendMessage = async (req, res) => {
  try {
    const { jobId, message } = req.body;
    const userId = req.user.id;

    if (!jobId || !message) {
      return sendResponse(res, 400, false, "jobId and message are required");
    }

    const response = await chatService.addMessage(userId, jobId, message);

    return sendResponse(res, 200, true, "Message sent successfully", response);
  } catch (err) {
    return sendResponse(res, 500, false, err.message || "Failed to send message");
  }
};

export const getHistory = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    if (!jobId) {
      return sendResponse(res, 400, false, "jobId is required");
    }

    const messages = await chatService.getAllMessages(userId, jobId);

    return sendResponse(res, 200, true, "Chat history fetched successfully", messages);
  } catch (err) {
    return sendResponse(res, 500, false, err.message || "Failed to fetch history");
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    if (!jobId) {
      return sendResponse(res, 400, false, "jobId is required");
    }

    await chatService.deleteChat(userId, jobId);

    return sendResponse(res, 200, true, "Chat history deleted successfully");
  } catch (err) {
    return sendResponse(res, 500, false, err.message || "Failed to delete chat");
  }
};

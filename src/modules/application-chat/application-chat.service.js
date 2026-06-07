import mongoose, { Types } from "mongoose";
import ApplicationChat from "./application-chat.model.js";
import { runHRAgent } from "./application-chat.agent.js";
import { AppError } from "../../utils/error.js";

export const applicationChatService = {
  async getChatHistory(userId, jobId) {
    const chats = await ApplicationChat.aggregate([
      { $match: { userId: new Types.ObjectId(userId), jobId: new Types.ObjectId(jobId) } },
      {
        $project: {
          userId: 1,
          jobId: 1,
          createdAt: 1,
          updatedAt: 1,
          messages: {
            $filter: {
              input: "$messages",
              as: "msg",
              cond: { $ne: ["$$msg.role", "tool"] }
            }
          }
        }
      }
    ]);

    if (chats.length === 0) {
      const newChat = await ApplicationChat.create({ userId, jobId, messages: [] });
      return newChat;
    }

    return chats[0];
  },

  async handleNewMessage(userId, jobId, content) {
    let chat = await ApplicationChat.findOne({ userId, jobId });
    if (!chat) {
      chat = await ApplicationChat.create({ userId, jobId, messages: [] });
    }

    chat.messages.push({ role: "human", content });
    await chat.save();

    const history = chat.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
    }));

    const result = await runHRAgent(jobId, history);

    for (const msg of result.newMessages) {
      chat.messages.push({
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id
      });
    }

    chat.messages.push({
      role: "ai",
      content: result.finalAnswer.answer,
      candidates: result.finalAnswer.candidates || []
    });

    await chat.save();

    return {
      answer: result.finalAnswer.answer,
      candidates: result.finalAnswer.candidates || []
    };
  },

  async deleteChat(userId, jobId) {
    const result = await ApplicationChat.deleteOne({ userId, jobId });
    if (result.deletedCount === 0) {
      throw new AppError("Chat history not found", 404);
    }
    return { message: "Chat history deleted successfully" };
  },
};

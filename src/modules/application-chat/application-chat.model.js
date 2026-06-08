import { Schema, model, Types } from "mongoose";

const messageSchema = new Schema({
  role: {
    type: String,
    enum: ["human", "ai", "tool"],
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  tool_calls: [{
    type: Object,
  }],
  tool_call_id: {
    type: String,
  },
  candidates: [{
    type: Object,
  }],
  isFinal: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const applicationChatSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: Types.ObjectId,
      ref: "Job",
      required: true,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

applicationChatSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export default model("ApplicationChat", applicationChatSchema);

import { Schema, model, Types } from "mongoose";

const messageSchema = new Schema({
  role: {
    type: String,
    enum: ["human", "ai"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const jobChatSchema = new Schema(
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

jobChatSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export default model("JobChat", jobChatSchema);

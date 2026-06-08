import Application from "../applications/application.model.js";
import Job from "../jobs/job.model.js";
import User from "../auth/user.model.js";
import mongoose from "mongoose";

/**
 * Hiring funnel — how many applications are in each stage
 * Used for: FunnelChart on analytics dashboard
 */
export const getHiringFunnelService = async (companyId) => {
  const match = { deletedAt: { $exists: false } };
  if (companyId) match.companyId = new mongoose.Types.ObjectId(companyId);

  const result = await Application.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$stage.key",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Ensure all stages always appear even if count is 0
  const stages = [
    "applied",
    "shortlisted",
    "interview",
    "offer",
    "hired",
    "rejected",
  ];
  const map = {};
  result.forEach((r) => {
    map[r._id] = r.count;
  });

  return stages.map((stage) => ({
    stage,
    count: map[stage] || 0,
  }));
};

/**
 * Applications over time — daily application volume for last N days
 * Used for: LineChart on analytics dashboard
 */
export const getApplicationsOverTimeService = async (companyId, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const match = {
    createdAt: { $gte: startDate },
    deletedAt: { $exists: false },
  };
  if (companyId) match.companyId = new mongoose.Types.ObjectId(companyId);

  const result = await Application.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result.map((r) => ({ date: r._id, count: r.count }));
};

/**
 * AI screening score distribution
 * Used for: BarChart showing score ranges
 */
export const getAIScoreDistributionService = async (companyId) => {
  const match = {
    "aiScreening.status": "completed",
    "aiScreening.overallScore": { $exists: true },
    deletedAt: { $exists: false },
  };
  if (companyId) match.companyId = new mongoose.Types.ObjectId(companyId);

  const result = await Application.aggregate([
    { $match: match },
    {
      $bucket: {
        groupBy: "$aiScreening.overallScore",
        boundaries: [0, 20, 40, 60, 80, 100],
        default: "other",
        output: { count: { $sum: 1 } },
      },
    },
  ]);

  const labels = ["0-20", "20-40", "40-60", "60-80", "80-100"];
  return result
    .filter((r) => r._id !== "other")
    .map((r, i) => ({ range: labels[i] || r._id, count: r.count }));
};

/**
 * Top performing jobs — jobs with most applications
 * Used for: Table or BarChart
 */
export const getTopJobsService = async (companyId, limit = 5) => {
  const match = { deletedAt: { $exists: false } };
  if (companyId) match.companyId = new mongoose.Types.ObjectId(companyId);

  const result = await Application.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$jobId",
        applicationCount: { $sum: 1 },
        avgAIScore: { $avg: "$aiScreening.overallScore" },
      },
    },
    { $sort: { applicationCount: -1 } },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: "jobs",
        localField: "_id",
        foreignField: "_id",
        as: "job",
      },
    },
    { $unwind: "$job" },
    {
      $project: {
        jobTitle: "$job.title",
        jobType: "$job.jobType",
        applicationCount: 1,
        avgAIScore: { $round: ["$avgAIScore", 1] },
      },
    },
  ]);

  return result;
};

/**
 * Platform-level user growth over time (admin only)
 * Used for: LineChart on admin analytics
 */
export const getUserGrowthService = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          role: "$role",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  return result.map((r) => ({
    date: r._id.date,
    role: r._id.role,
    count: r.count,
  }));
};

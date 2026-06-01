import mongoose from "mongoose";
import EmployerProfile from "../auth/employerProfile.model.js";
import Company from "../company/company.model.js";
import Job from "../jobs/job.model.js";
import Application from "../applications/application.model.js";

/**
 * Get all company memberships for the employer.
 */
export const getMembershipsService = async (userId) => {
  const profiles = await EmployerProfile.find({ userId }).populate({
    path: "companyId",
    match: { status: { $ne: "inactive" } },
  });

  // Filter out any profiles where companyId is null (doesn't exist or is soft-deleted/inactive)
  return profiles
    .filter((profile) => profile.companyId)
    .map((profile) => ({
      _id: profile._id,
      role: profile.role,
      company: profile.companyId,
    }));
};

/**
 * Get scoped company dashboard metrics & data.
 */
export const getCompanyDashboardService = async (companyId) => {
  // Confirm company exists and is active
  const company = await Company.findById(companyId);
  if (!company || company.status === "inactive") {
    const error = new Error("Company not found or inactive");
    error.statusCode = 404;
    throw error;
  }

  const [
    totalJobs,
    activeJobs,
    totalApplications,
    hiredCount,
    interviewingCount,
    recentJobs,
    recentApplications,
    teamProfiles,
  ] = await Promise.all([
    Job.countDocuments({ company: companyId }),
    Job.countDocuments({ company: companyId, status: "open" }),
    Application.countDocuments({ companyId, deletedAt: { $exists: false } }),
    Application.countDocuments({
      companyId,
      "stage.key": "hired",
      deletedAt: { $exists: false },
    }),
    Application.countDocuments({
      companyId,
      "stage.key": "interview",
      deletedAt: { $exists: false },
    }),
    Job.find({ company: companyId }).sort({ createdAt: -1 }).limit(5).lean(),
    Application.find({ companyId, deletedAt: { $exists: false } })
      .populate("candidateId", "fullName email")
      .populate("jobId", "title")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    EmployerProfile.find({ companyId })
      .populate("userId", "fullName email status role")
      .limit(5)
      .lean(),
  ]);

  // Aggregate average AI screening score
  const avgResult = await Application.aggregate([
    {
      $match: {
        companyId: new mongoose.Types.ObjectId(companyId),
        "aiScreening.status": "completed",
        "aiScreening.overallScore": { $exists: true },
        deletedAt: { $exists: false },
      },
    },
    {
      $group: {
        _id: null,
        avgScore: { $avg: "$aiScreening.overallScore" },
      },
    },
  ]);
  const averageAiScore =
    avgResult.length > 0 ? Math.round(avgResult[0].avgScore) : null;

  // Format team
  const team = teamProfiles.map((p) => ({
    _id: p._id,
    role: p.role,
    user: p.userId,
  }));

  return {
    company,
    stats: {
      totalJobs,
      activeJobs,
      totalApplications,
      hiredCount,
      interviewingCount,
      averageAiScore,
    },
    recentJobs,
    recentApplications,
    team,
  };
};

/**
 * Get company team members.
 */
export const getCompanyTeamService = async (companyId) => {
  const company = await Company.findById(companyId);
  if (!company || company.status === "inactive") {
    const error = new Error("Company not found or inactive");
    error.statusCode = 404;
    throw error;
  }

  const profiles = await EmployerProfile.find({ companyId })
    .populate("userId", "fullName email status role")
    .lean();

  return profiles.map((p) => ({
    _id: p._id,
    role: p.role,
    user: p.userId,
  }));
};

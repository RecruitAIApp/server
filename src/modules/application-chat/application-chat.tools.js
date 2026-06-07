import Application from "../applications/application.model.js";
import CandidateProfile from "../auth/candidateProfile.model.js";
import User from "../auth/user.model.js";
import mongoose from "mongoose";
import { VectorStoreService } from "../vectorstore/vectorstore.service.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("hr-agent-tools");


function formatCandidateData(user, profile) {
  if (!user) return null;
  return {
    userId: user._id.toString(),
    name: user.fullName,
    email: user.email,
    skills: profile?.skills || [],
    experienceYears: profile?.resume?.parsedData?.experienceYears ?? null,
    github: profile?.basicInfo?.socialLinks?.github ?? null,
    location: profile?.basicInfo?.location?.city ?? null,
    experience: profile?.experience?.map(exp => ({
      company: exp.company,
      title: exp.title,
      from: exp.startDate?.getFullYear() ?? null,
      to: exp.endDate?.getFullYear() ?? "Present",
    })) || [],
    education: profile?.education?.map(edu => ({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
    })) || [],
  };
}


function formatApplication(app, user, profile) {
  return {
    applicationId: app._id.toString(),
    stage: app.stage?.key ?? "applied",
    appliedAt: app.createdAt,
    aiScore: app.aiScreening?.overallScore ?? null,
    aiSummary: app.aiScreening?.summary ?? null,
    matchedSkills: app.aiScreening?.matchedSkills ?? [],
    missingSkills: app.aiScreening?.missingSkills ?? [],
    internalRating: app.internalRating?.average ?? null,
    candidate: formatCandidateData(user, profile),
  };
}


export async function getApplicationsTool(jobId, filters = {}) {
  logger.info(`getApplicationsTool: job=${jobId}`, filters);

  const query = { jobId: new mongoose.Types.ObjectId(jobId) };
  if (filters.stage) query["stage.key"] = filters.stage;
  if (filters.minScore) query["aiScreening.overallScore"] = { $gte: Number(filters.minScore) };

  const applications = await Application.find(query)
    .sort({ "aiScreening.overallScore": -1 })
    .lean();

  if (applications.length === 0) {
    logger.info("getApplicationsTool: no applications found");
    return "No applications found for this job.";
  }

  const userIds = applications.map(app => app.candidateId).filter(Boolean);

  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("fullName email").lean(),
    CandidateProfile.find({ userId: { $in: userIds } }).lean(),
  ]);

  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

  let results = applications.map(app => {
    const uid = app.candidateId.toString();
    return formatApplication(app, userMap.get(uid), profileMap.get(uid));
  });

  if (filters.minExp) {
    results = results.filter(r => (r.candidate?.experienceYears || 0) >= Number(filters.minExp));
  }

  const trimmed = results.slice(0, 15);
  logger.info(`getApplicationsTool: returning ${trimmed.length} results`);
  return JSON.stringify(trimmed);
}


export async function searchCandidateProfilesTool(criteria = {}) {
  logger.info("searchCandidateProfilesTool:", criteria);

  const profileQuery = {};

  if (criteria.skills?.length > 0) {
    profileQuery.skills = { $all: criteria.skills };
  }

  if (criteria.minExp) {
    profileQuery["resume.parsedData.experienceYears"] = { $gte: Number(criteria.minExp) };
  }

  if (criteria.location) {
    profileQuery["basicInfo.location.city"] = new RegExp(criteria.location, "i");
  }

  if (criteria.institution) {
    profileQuery["education.institution"] = new RegExp(criteria.institution, "i");
  }

  if (criteria.jobId) {
    const apps = await Application.find({ jobId: new mongoose.Types.ObjectId(criteria.jobId) })
      .select("candidateId")
      .lean();
    const applicantUserIds = apps.map(a => a.candidateId);
    profileQuery.userId = { $in: applicantUserIds };
  }

  const profiles = await CandidateProfile.find(profileQuery).limit(10).lean();

  if (profiles.length === 0) {
    logger.info("searchCandidateProfilesTool: no profiles found");
    return "No candidate profiles match the given criteria.";
  }

  const userIds = profiles.map(p => p.userId);
  const users = await User.find({ _id: { $in: userIds } }).select("fullName email").lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  const results = profiles.map(p => formatCandidateData(userMap.get(p.userId.toString()), p));

  logger.info(`searchCandidateProfilesTool: returning ${results.length} results`);
  return JSON.stringify(results);
}


export async function searchCVsTool(jobId, query) {
  logger.info(`searchCVsTool: job=${jobId}, query="${query}"`);

  const searchResults = await VectorStoreService.retrieve(query, 10, "resumes", {
    jobId: jobId.toString(),
  });

  if (searchResults.length === 0) {
    logger.info("searchCVsTool: no CV matches found");
    return "No CV content matched the query.";
  }

  const results = searchResults.map(r => ({
    candidateId: r.metadata?.candidateId ?? null,
    cvText: r.content,
  }));

  logger.info(`searchCVsTool: returning ${results.length} matches`);
  return JSON.stringify(results);
}

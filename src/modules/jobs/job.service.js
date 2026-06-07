import Job from "./job.model.js";
import Company from "../company/company.model.js";
import employerProfile from "../auth/employerProfile.model.js";
import {
  buildJobFilters,
  buildPaginationOptions,
  buildPaginatedResponse,
} from "../../common/helpers/queryBuilder.helper.js";
import { enqueueJobEmbedding, enqueueJobDelete } from "./queues/job.queue.js";

export const createJobService = async (data, userId) => {
  const company = await Company.findById(data.company);
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  if (company.status !== "active") {
    const error = new Error("Jobs can only be posted for approved companies");
    error.statusCode = 403;
    throw error;
  }

  const profile = await employerProfile.findOne({
    userId,
    companyId: data.company,
  });

  if (!profile) {
    const error = new Error(
      "Forbidden: only the company owner or an assigned HR can post jobs",
    );
    error.statusCode = 403;
    throw error;
  }

  const job = await Job.create({ ...data, postedBy: userId });

  // Enqueue embedding task
  try {
    // Populate company info for better context in embedding
    const populatedJob = await Job.findById(job._id).populate("company", "name industry description");
    await enqueueJobEmbedding(populatedJob);
    console.log(`[JobService] Job ${job._id} enqueued for embedding`);
  } catch (error) {
    console.error(`[JobService] Failed to enqueue job embedding: ${error.message}`);
  }

  return job;
};

export const getJobByIdService = async (id) => {
  const job = await Job.findById(id)
    .populate("company", "name logo industry location")
    .populate("postedBy", "name email");

  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  return job;
};

export const getAllJobsService = async (query , userRole = null) => {
  const filter = buildJobFilters(query);
  if (userRole !== "employer") {
    filter.status = filter.status || "open"; // Default to open for non-employers
  }
  const { skip, limit, sort, page } = buildPaginationOptions(query);

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate("company", "name logo industry")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  return buildPaginatedResponse(jobs, total, page, limit);
};

export const getJobsByEmployerService = async (userId, query , userRole) => {
  const filter = { postedBy: userId, ...buildJobFilters(query) };
  if (userRole !== "employer") {
    filter.status = filter.status || "open"; // Default to open for non-employers
  }
  const { skip, limit, sort, page } = buildPaginationOptions(query);

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate("company", "name logo")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  return buildPaginatedResponse(jobs, total, page, limit);
};

export const getJobsByCompanyService = async (companyId, query, user = null) => {
  const company = await Company.findById(companyId);
  if (!company || company.status !== "active") {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  
  let isMember = false;
  if (user && user.role === "employer") {
    const profile = await employerProfile.findOne({
      userId: user.id,
      companyId,
    });
    if (profile) {
      isMember = true;
    }
  }

  const filter = { company: companyId, ...buildJobFilters(query) };
  if (!isMember) {
    filter.status = "open";
  } else if (query.status) {
    filter.status = query.status;
  }

  const { skip, limit, sort, page } = buildPaginationOptions(query);

  const [jobs, total] = await Promise.all([
    Job.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Job.countDocuments(filter),
  ]);

  return buildPaginatedResponse(jobs, total, page, limit);
};

export const updateJobService = async (id, data) => {
  const job = await Job.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true },
  ).populate("company", "name logo industry description");

  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  // Update embedding task: Delete old one first to avoid duplicates
  try {
    await enqueueJobDelete(id);
    await enqueueJobEmbedding(job);
    console.log(`[JobService] Job ${job._id} re-enqueued for embedding update`);
  } catch (error) {
    console.error(`[JobService] Failed to re-enqueue job embedding: ${error.message}`);
  }

  return job;
};

export const deleteJobService = async (id) => {
  const job = await Job.findByIdAndDelete(id);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  // Cleanup embedding task
  try {
    await enqueueJobDelete(job._id);
    console.log(`[JobService] Job ${job._id} enqueued for embedding deletion`);
  } catch (error) {
    console.error(`[JobService] Failed to enqueue job embedding deletion: ${error.message}`);
  }

  return job;
};

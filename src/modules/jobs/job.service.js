import Job from "./job.model.js";
import Company from "../company/company.model.js";
import {
  buildJobFilters,
  buildPaginationOptions,
  buildPaginatedResponse,
} from "../../common/helpers/queryBuilder.helper.js";

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

  const isOwner = company.owner.toString() === userId;
  const isHR = company.HRs.map((id) => id.toString()).includes(userId);

  if (!isOwner && !isHR) {
    const error = new Error(
      "Forbidden: only the company owner or an assigned HR can post jobs"
    );
    error.statusCode = 403;
    throw error;
  }

  const job = await Job.create({ ...data, postedBy: userId });
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

export const getAllJobsService = async (query) => {
  const filter = buildJobFilters(query);
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

export const getJobsByEmployerService = async (userId, query) => {
  const filter = { postedBy: userId, ...buildJobFilters(query) };
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

export const getJobsByCompanyService = async (companyId, query) => {
  const filter = { company: companyId, ...buildJobFilters(query) };
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
    { new: true, runValidators: true }
  ).populate("company", "name logo industry");

  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
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
  return job;
};
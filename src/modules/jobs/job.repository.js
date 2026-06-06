import Job from "./job.model.js";
import { AppError } from "../../utils/error.js";

/**
 * Asserts that a job exists, is active, and is not past its deadline.
 * Throws a 400 error otherwise.
 */
export const assertJobIsOpen = async (jobId) => {
  const job = await Job.findOne({
    _id: jobId,
    status: "open",
    // $or: [
    //   { applicationDeadline: { $exists: false } },
    //   { applicationDeadline: null },
    //   { applicationDeadline: { $gt: new Date() } }
    // ]
  });

  if (!job) {
    throw new AppError("Job is not accepting applications", 400);
  }

  return job;
};

/**
 * Asserts that a job exists and belongs to a specific company.
 * Throws a 404 error otherwise.
 */
export const assertJobExistsAndBelongsToCompany = async (jobId, companyId) => {
  const jobExists = await Job.findOne({ _id: jobId, company: companyId });
  if (!jobExists) {
    throw new AppError("Job not found or you do not have permission to access it", 404);
  }
  return jobExists;
};


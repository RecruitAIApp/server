import { QueueService } from "../../../common/services/queue.service.js";

/**
 * Enqueues a job for embedding in Pinecone
 * @param {object} job - The job document (should be populated with company)
 */
export const enqueueJobEmbedding = async (job) => {
  // Rich context string for embedding
  const jobText = `
    Job Title: ${job.title}
    Company: ${job.company?.name || "N/A"}
    Industry: ${job.company?.industry || "N/A"}
    Company Description: ${job.company?.description || "N/A"}
    Location: ${job.location}
    Job Type: ${job.jobType}
    Employment Type: ${job.employmentType}
    Experience Level: ${job.experienceLevel}
    Salary: ${job.salaryRange?.min} - ${job.salaryRange?.max} ${job.salaryRange?.currency}
    Description: ${job.description}
    Requirements: ${job.requirements?.join(", ") || "N/A"}
    Skills: ${job.skills?.join(", ") || "N/A"}
  `.trim();

  await QueueService.addJob("background-tasks", "EMBED_JOB", {
    type: "EMBED_JOB",
    data: {
      text: jobText,
      metadata: {
        jobId: job._id.toString(),
        companyId: job.company?._id?.toString() || job.company?.toString(),
        type: "job",
        status: job.status || "open",
        location: job.location || "",
        employmentType: job.employmentType || "",
        experienceLevel: job.experienceLevel || ""
      },
      namespace: "jobs"
    }
  });
};

/**
 * Enqueues a task to delete a job's vectors from Pinecone
 * @param {string} jobId - The ID of the job to delete
 */
export const enqueueJobDelete = async (jobId) => {
  await QueueService.addJob("background-tasks", "DELETE_JOB_EMBEDDING", {
    type: "DELETE_EMBEDDING",
    data: {
      filter: { jobId: jobId.toString() },
      namespace: "jobs"
    }
  });
};

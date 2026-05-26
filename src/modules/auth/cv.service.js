import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.config.js";
import cloudinary from "../../config/cloudinary.config.js";
import { Readable } from "stream";

/** BullMQ queue for async CV parsing */
export const cvParseQueue = new Queue("cv-parse", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Upload a PDF buffer to Cloudinary and return { url, publicId, fileName }.
 */
export async function uploadCVToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "recruiter_ai/resumes",
        resource_type: "raw",
        type: "upload",
        access_mode: "public",
        public_id: `cv_${Date.now()}_${originalName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, "_")}`,
        // Store original file name separately; public_id omits extension for proper Cloudinary download.
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          fileName: originalName,
        });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

/**
 * Build a signed download URL so the worker can fetch raw PDFs (avoids 401 on delivery).
 */
export function getSignedCVDownloadUrl(publicId) {
  return cloudinary.utils.private_download_url(publicId, "pdf", {
    resource_type: "raw",
    type: "upload",
    format: "pdf",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });
}

/**
 * Enqueue a CV parsing job.
 * @param {string} profileId - CandidateProfile _id
 * @param {string} cvUrl - Cloudinary URL (fallback)
 * @param {string} publicId - Cloudinary public_id for signed download
 */
export async function enqueueCVParse(profileId, cvUrl, publicId) {
  await cvParseQueue.add(
    "parse-cv",
    { profileId, cvUrl, publicId },
    { jobId: `cv-parse-${profileId}` },
  );
}

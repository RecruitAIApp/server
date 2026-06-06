import mongoose from "mongoose";
import User from "../../modules/auth/user.model.js";
import Company from "../../modules/company/company.model.js";
import Job from "../../modules/jobs/job.model.js";
import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import Application from "../../modules/applications/application.model.js";

export const createUser = async (role = "candidate", extra = {}) => {
  return await User.create({
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    password: "password123",
    role,
    fullName: "Test User",
    status: "active",
    isActive: true,
    ...extra,
  });
};

export const createCompany = async (ownerId) => {
  const owner = ownerId || (await createUser("employer"))._id;
  return await Company.create({
    name: `Test Company ${Date.now()}`,
    description: "A test company description",
    industry: "Tech",
    owner,
    status: "active",
  });
};

export const createTestJob = async (companyId, postedById, overrides = {}) => {
  const company = companyId || (await createCompany())._id;
  const postedBy = postedById || (await Company.findById(company)).owner;
  
  return await Job.create({
    title: "Senior Node.js Engineer",
    description: "We are looking for a senior node.js engineer.",
    requirements: ["Node.js", "Express", "MongoDB"],
    salaryRange: { min: 100, max: 150, currency: "USD" },
    location: "Remote",
    jobType: "remote",
    employmentType: "full-time",
    company,
    postedBy,
    status: "open",
    ...overrides
  });
};

export const createClosedJob = async (companyId, postedById) => {
  return await createTestJob(companyId, postedById, {
    status: "closed",
    deadline: new Date(Date.now() - 100000) // Past deadline
  });
};

export const createTestCandidate = async (withResume = true) => {
  const user = await createUser("candidate");
  
  const resumeData = withResume ? {
    resume: {
      url: "https://example.com/resume.pdf",
      publicId: "resume_123",
      fileName: "resume.pdf",
      parsedData: {
        skills: ["Node.js", "Express", "MongoDB"],
        experienceYears: 5,
        jobTitles: ["Backend Developer"],
        summary: "Experienced Node.js dev"
      }
    }
  } : {};

  const profile = await CandidateProfile.create({
    userId: user._id,
    basicInfo: { headline: "Backend Dev", bio: "Loves code" },
    skills: ["Node.js", "MongoDB", "React"],
    ...resumeData
  });

  return { user, profile };
};

export const createTestCandidateWithoutResume = async () => {
  return await createTestCandidate(false);
};

export const createApplication = async (jobId, candidateId, companyId) => {
  return await Application.create({
    candidateId,
    companyId,
    jobId,
    appliedResume: {
      url: "https://example.com/resume.pdf",
      publicId: "resume_123",
      fileName: "resume.pdf",
    },
    stage: {
      key: "applied",
      changedAt: new Date(),
      changedBy: candidateId,
    },
    aiScreening: {
      status: "queued"
    },
    timeline: []
  });
};

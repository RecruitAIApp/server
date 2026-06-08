import User from "../auth/user.model.js";
import Job from "../jobs/job.model.js";
import Company from "../company/company.model.js";
import Application from "../applications/application.model.js";
import { sendResponse } from "../../utils/responseHandler.js";
import EmployerProfile from "../auth/employerProfile.model.js";

// GET all users with pagination + filters
export const getAllUsersService = async (query) => {
  const { page = 1, limit = 10, role, status, search } = query;
  const filter = {};

  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { fullName: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password -passwordResetToken -passwordResetExpires")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

// BAN a user
export const banUserService = async (userId, reason) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (user.role === "admin") {
    const err = new Error("Cannot ban an admin user");
    err.statusCode = 403;
    throw err;
  }

  // Ban the user
  user.isBanned = true;
  user.status = "suspended";
  await user.save();

  // If employer owner — deactivate their company and close their jobs
  if (user.role === "employer") {
    const profile = await EmployerProfile.findOne({
      userId: user._id,
      role: "owner",
    });

    if (profile && profile.companyId) {
      // Deactivate the company
      await Company.findByIdAndUpdate(profile.companyId, {
        $set: { status: "inactive" },
      });

      // Close all open jobs under that company
      await Job.updateMany(
        { company: profile.companyId, status: "open" },
        { $set: { status: "closed" } },
      );
    }
  }

  return user;
};

// UNBAN a user
export const unbanUserService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (!user.isBanned) {
    const err = new Error("User is not banned");
    err.statusCode = 400;
    throw err;
  }

  // Unban the user
  user.isBanned = false;
  user.status = "active";
  await user.save();

  // If employer owner — reactivate their company and reopen closed jobs
  if (user.role === "employer") {
    const profile = await EmployerProfile.findOne({
      userId: user._id,
      role: "owner",
    });

    if (profile && profile.companyId) {
      await Company.findByIdAndUpdate(profile.companyId, {
        $set: { status: "active" },
      });

      await Job.updateMany(
        { company: profile.companyId, status: "closed" },
        { $set: { status: "open" } },
      );
    }
  }

  return user;
};

// DELETE a job (admin force delete)
export const deleteJobService = async (jobId) => {
  const job = await Job.findByIdAndDelete(jobId);
  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }
  return job;
};

// GET platform overview stats
export const getPlatformStatsService = async () => {
  const [
    totalUsers,
    totalCandidates,
    totalEmployers,
    totalAdmins,
    totalJobs,
    openJobs,
    totalApplications,
    totalCompanies,
    pendingEmployers,
    bannedUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "candidate" }),
    User.countDocuments({ role: "employer" }),
    User.countDocuments({ role: "admin" }),
    Job.countDocuments(),
    Job.countDocuments({ status: "open" }),
    Application.countDocuments(),
    Company.countDocuments(),
    Company.countDocuments({ status: "pending" }),
    User.countDocuments({ isBanned: true }),
  ]);

  return {
    users: {
      total: totalUsers,
      candidates: totalCandidates,
      employers: totalEmployers,
      admins: totalAdmins,
      banned: bannedUsers,
    },
    companies: { total: totalCompanies, pending: pendingCompanies },
    jobs: { total: totalJobs, open: openJobs },
    applications: { total: totalApplications },
    companies: { total: totalCompanies },
  };
};

// Get all companies pending admin approval

export const getPendingCompaniesService = async () => {
  const companies = await Company.find({ status: "pending" })
    .populate("owner", "fullName email")
    .sort({ createdAt: -1 })
    .lean();
  return companies;
};

// Approve a company after reviewing license

export const approveCompanyService = async (companyId) => {
  const company = await Company.findById(companyId);
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }
  if (company.status === "active") {
    const err = new Error("Company is already approved");
    err.statusCode = 400;
    throw err;
  }
  if (!company.licenses?.secure_url) {
    const err = new Error("Company has not uploaded a license yet");
    err.statusCode = 400;
    throw err;
  }

  company.status = "active";
  company.ActivationDate = new Date();
  await company.save();

  return company;
};

// Reject a company after reviewing license

export const rejectCompanyService = async (companyId, reason) => {
  const company = await Company.findById(companyId);
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }
  if (company.status !== "pending") {
    const err = new Error("Only pending companies can be rejected");
    err.statusCode = 400;
    throw err;
  }

  company.rejectionReason = reason || "License rejected by admin";
  await company.save();

  return company;
};

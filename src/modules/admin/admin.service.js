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

// APPROVE employer (pending_approval → active)

export const approveEmployerService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (user.role !== "employer") {
    const err = new Error("User is not an employer");
    err.statusCode = 400;
    throw err;
  }
  if (user.status !== "pending_approval") {
    const err = new Error(
      "This employer is not pending approval — only owners pending approval can be approved",
    );
    err.statusCode = 400;
    throw err;
  }

  // Check they are an owner not an HR
  const EmployerProfile = (await import("../auth/employerProfile.model.js"))
    .default;
  const profile = await EmployerProfile.findOne({
    userId: user._id,
    role: "owner",
  });

  if (!profile) {
    const err = new Error(
      "This employer is an HR member — HR accounts do not require admin approval",
    );
    err.statusCode = 400;
    throw err;
  }

  user.status = "active";
  user.isActive = true;
  await user.save();

  // Activate their company
  await Company.updateMany(
    { owner: userId, status: "pending" },
    { $set: { status: "active", ActivationDate: new Date() } },
  );

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
    User.countDocuments({ role: "employer", status: "pending_approval" }),
    User.countDocuments({ isBanned: true }),
  ]);

  return {
    users: {
      total: totalUsers,
      candidates: totalCandidates,
      employers: totalEmployers,
      admins: totalAdmins,
      pendingApproval: pendingEmployers,
      banned: bannedUsers,
    },
    jobs: { total: totalJobs, open: openJobs },
    applications: { total: totalApplications },
    companies: { total: totalCompanies },
  };
};

// GET pending employers list
export const getPendingEmployersService = async () => {
  return await User.find({ role: "employer", status: "pending_approval" })
    .select("-password -passwordResetToken -passwordResetExpires")
    .sort({ createdAt: -1 })
    .lean();
};

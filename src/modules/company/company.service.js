import cloudinary from "../../config/cloud.config.js";
import Company from "./company.model.js";
import Job from "../jobs/job.model.js";
import EmployerProfile from "../auth/employerProfile.model.js";
import User from "../auth/user.model.js";
import HRInvitation from "./hrInvitation.model.js";
import { sendEmail } from "../../utils/email.js";
import crypto from "crypto";

export const createCompanyService = async (data, ownerId) => {
  const existing = await Company.findOne({
    name: { $regex: `^${data.name}$`, $options: "i" },
  });
  if (existing) {
    const error = new Error("A company with this name already exists");
    error.statusCode = 409;
    throw error;
  }

  const user = await User.findById(ownerId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const company = await Company.create({ ...data, owner: ownerId });

  // Create EmployerProfile for the owner
  await EmployerProfile.create({
    userId: ownerId,
    companyId: company._id,
    role: "owner",
  });

  return company;
};

export const addLicensesService = async (id, filePath) => {
  const company = await Company.findById(id);

  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  const options = {
    folder: `RecruitAi/company/${company.name}/licenses`,
    resource_type: "auto",
  };

  const { secure_url, public_id } = await cloudinary.uploader.upload(
    filePath,
    options,
  );

  company.licenses = { secure_url, public_id };
  await company.save();
  return company;
};

export const getCompanyByIdService = async (id) => {
  const company = await Company.findById(id).populate("owner", "name email");

  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  if (company.status !== "active") {
    const error = new Error("Company not found"); // Intentionally vague — do not reveal existence
    error.statusCode = 404;
    throw error;
  }

  return company;
};

export const getMyCompaniesService = async (ownerId) => {
  const profiles = await EmployerProfile.find({ userId: ownerId }).select("companyId");
  const companyIds = profiles.map(p => p.companyId);
  return Company.find({ _id: { $in: companyIds }, status: { $ne: "inactive" } }).sort({ createdAt: -1 });
};

export const updateCompanyService = async (id, data) => {
  const allowedFields = [
    "name",
    "description",
    "logo",
    "website",
    "industry",
    "size",
    "location",
    "socialLinks",
  ];
  const safeData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) safeData[key] = data[key];
  }
  const company = await Company.findByIdAndUpdate(
    id,
    { $set: safeData },
    { new: true, runValidators: true },
  );
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  return company;
};

export const deleteCompanyService = async (id) => {
  const company = await Company.findByIdAndUpdate(
    id,
    { $set: { status: "inactive" } },
    { new: true },
  );
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  await Job.updateMany({ company: id, status: "open" }, { $set: { status: "closed" } });
  return company;
};

export const addHRService = async (companyId, hrUserId) => {
  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  if (company.owner.toString() === hrUserId) {
    const error = new Error("Owner cannot be added as an HR");
    error.statusCode = 400;
    throw error;
  }

  // Check if EmployerProfile already exists
  let profile = await EmployerProfile.findOne({ userId: hrUserId, companyId });
  if (profile) {
    if (profile.role === "hr") {
      return company; // already HR, no action needed
    } else {
      const error = new Error("User is already owner of this company");
      error.statusCode = 400;
      throw error;
    }
  }

  // Create the profile
  await EmployerProfile.create({
    userId: hrUserId,
    companyId,
    role: "hr",
  });

  return company;
};

export const removeHRService = async (companyId, hrUserId) => {
  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  const deleted = await EmployerProfile.findOneAndDelete({
    userId: hrUserId,
    companyId,
    role: "hr",
  });

  if (!deleted) {
    const error = new Error("HR member not found in this company");
    error.statusCode = 404;
    throw error;
  }

  return company;
};

export const inviteHRService = async ({
  companyId,
  invitedBy,
  email,
  origin,
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if the company exists
  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Check if user is already a member of this company (owner or hr)
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const existingProfile = await EmployerProfile.findOne({
      userId: existingUser._id,
      companyId,
    });
    if (existingProfile) {
      const error = new Error("User is already a member of this company");
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. Prevent duplicate active invites (accepted: false, expiresAt > Date.now())
  const activeInvite = await HRInvitation.findOne({
    companyId,
    email: normalizedEmail,
    accepted: false,
    expiresAt: { $gt: new Date() },
  });

  if (activeInvite) {
    const error = new Error(
      "An active invitation has already been sent to this email address",
    );
    error.statusCode = 400;
    throw error;
  }

  // 4. Generate secure token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  // 5. Set expiration date (e.g. 48 hours)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // 6. Save invitation
  const invitation = await HRInvitation.create({
    companyId,
    invitedBy,
    email: normalizedEmail,
    token: hashedToken,
    expiresAt,
  });

  // 7. Get inviter's user information
  const inviter = await User.findById(invitedBy);
  const inviterName = inviter?.name || inviter?.email?.split("@")[0] || "Company Owner";

  // 8. Build invitation URL
  const inviteUrl = `${origin}/accept-invite?token=${rawToken}`;

  // 9. Send invitation email using sendEmail utility
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <h2 style="color: #2563eb; text-align: center; margin-bottom: 24px; font-weight: 700;">MASAR Recruiter — Team Invitation</h2>
      <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hello,</p>
      <p style="font-size: 16px; color: #334155; line-height: 1.6;">
        <strong>${inviterName}</strong> has invited you to join <strong>${company.name}</strong> as an HR team member on MASAR Recruiter.
      </p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Accept Invitation</a>
      </div>
      <p style="font-size: 14px; color: #e11d48; font-weight: 500; margin-top: 20px; text-align: center;">
        ⚠️ This invitation is valid for 48 hours and will expire on ${expiresAt.toLocaleString()}.
      </p>
      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-top: 30px;">
        If the button above does not work, please copy and paste the following link into your browser:
      </p>
      <p style="word-break: break-all; color: #2563eb; font-size: 14px; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9;">
        ${inviteUrl}
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        MASAR Recruiter &copy; 2026. All rights reserved.
      </p>
    </div>
  `;

  const emailSent = await sendEmail({
    to: normalizedEmail,
    subject: `Join ${company.name} on MASAR Recruiter`,
    html,
  });

  if (!emailSent) {
    await HRInvitation.findByIdAndDelete(invitation._id);
    const error = new Error("Failed to send invitation email");
    error.statusCode = 500;
    throw error;
  }

  return {
    email: normalizedEmail,
    expiresAt,
  };
};

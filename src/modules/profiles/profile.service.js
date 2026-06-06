import CandidateProfile from "../auth/candidateProfile.model.js";
import User from "../auth/user.model.js";
import { uploadCVToCloudinary, enqueueCVParse } from "../auth/cv.service.js";
import cloudinary from "../../config/cloudinary.config.js";
import { Readable } from "stream";
import { createError } from "../../utils/error.js";
import { enqueueResumeEmbedding } from "../vectorstore/candidate-embedding.service.js";

class ProfileService {
  /**
   * Ensure user is a candidate
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async ensureCandidateUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw createError(404, "User not found.");
    }

    if (user.role !== "candidate") {
      throw createError(
        403,
        "Candidate profile is only available for candidate accounts.",
      );
    }

    return user;
  }

  /**
   * Get candidate profile with user full name
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getProfile(userId) {
    const user = await this.ensureCandidateUser(userId);

    let profile = await CandidateProfile.findOne({ userId });
    if (!profile) {
      profile = await CandidateProfile.create({ userId });
    }

    return {
      ...profile.toObject(),
      fullName: user.fullName ?? null,
    };
  }

  /**
   * Calculate profile completion percentage
   * @param {Object} user
   * @param {Object} profile
   * @returns {number}
   */
  calculateProfileCompletion(user, profile) {
    let completion = 0;
    const basic = profile.basicInfo ?? {};
    const location = basic.location ?? {};

    if (user.fullName?.trim()) completion += 10;
    if (basic.headline?.trim()) completion += 10;
    if (basic.phone?.trim()) completion += 5;
    if (location.city?.trim() || location.country?.trim()) completion += 10;
    if (basic.bio?.trim()) completion += 10;

    if (profile.skills?.length > 0) completion += 15;
    if (profile.experience?.length > 0) completion += 15;
    else if (profile.education?.length > 0) completion += 10;

    if (profile.resume?.url || profile.resume?.fileName) completion += 15;
    if (profile.resume?.parseStatus === "done") completion += 10;

    return Math.min(100, completion);
  }

  /**
   * Update candidate profile
   * @param {string} userId
   * @param {Object} profileData
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, profileData) {
    const user = await this.ensureCandidateUser(userId);

    if (profileData.fullName !== undefined) {
      user.fullName = profileData.fullName?.trim() || undefined;
      await user.save();
    }

    let profile = await CandidateProfile.findOne({ userId });
    if (!profile) {
      profile = new CandidateProfile({ userId });
    }

    if (profileData.basicInfo) {
      const { fullName: legacyFullName, ...basicInfoRest } =
        profileData.basicInfo;

      if (legacyFullName !== undefined) {
        user.fullName = legacyFullName?.trim() || undefined;
        await user.save();
      }

      const existingBasic =
        profile.basicInfo?.toObject?.() ?? profile.basicInfo ?? {};
      profile.basicInfo = { ...existingBasic, ...basicInfoRest };
    }

    if (profileData.skills) {
      profile.skills = profileData.skills;
    }

    if (profileData.experience) {
      profile.experience = profileData.experience;
    }

    if (profileData.education) {
      profile.education = profileData.education;
    }

    if (profileData.resume) {
      const existingResume =
        profile.resume?.toObject?.() ?? profile.resume ?? {};
      profile.resume = { ...existingResume, ...profileData.resume };
    }

    if (profileData.onboardingCompleted !== undefined) {
      profile.onboardingCompleted = Boolean(profileData.onboardingCompleted);
    }

    profile.profileCompletion = this.calculateProfileCompletion(user, profile);
    await profile.save();

    // Trigger candidate embedding generation in the background asynchronously
    await enqueueResumeEmbedding(profile);

    return {
      ...profile.toObject(),
      fullName: user.fullName ?? null,
    };
  }

  /**
   * Upload CV/Resume to Cloudinary
   * @param {string} userId
   * @param {Object} file
   * @returns {Promise<Object>}
   */
  async uploadCV(userId, file) {
    const user = await this.ensureCandidateUser(userId);

    if (!file?.buffer) {
      throw createError(400, "CV file is required.");
    }

    let profile = await CandidateProfile.findOne({ userId });
    if (!profile) {
      profile = await CandidateProfile.create({ userId });
    }

    const { url, publicId, fileName } = await uploadCVToCloudinary(
      file.buffer,
      file.originalname || "resume.pdf",
    );

    const existingResume = profile.resume?.toObject?.() ?? profile.resume ?? {};

    profile.resume = {
      ...existingResume,
      url,
      publicId,
      fileName,
      uploadedAt: new Date(),
      parseStatus: "pending",
      parseError: null,
      parsedAt: null,
    };

    profile.profileCompletion = this.calculateProfileCompletion(user, profile);
    await profile.save();

    await enqueueCVParse(profile._id.toString(), url, publicId);

    return {
      ...profile.toObject(),
      fullName: user.fullName ?? null,
    };
  }

  /**
   * Recalculate profile completion after async CV parsing completes.
   * @param {string} profileId
   * @returns {Promise<Object>}
   */
  async syncProfileCompletion(profileId) {
    const profile = await CandidateProfile.findById(profileId);
    if (!profile) return null;

    const user = await User.findById(profile.userId);
    if (!user) return null;

    profile.profileCompletion = this.calculateProfileCompletion(user, profile);
    await profile.save();
    
    // Trigger candidate embedding generation in the background asynchronously
    await enqueueResumeEmbedding(profile);
    
    return profile;
  }
  /**
   * Upload avatar image to Cloudinary and save to profile.
   * @param {string} userId
   * @param {Object} file
   * @returns {Promise<Object>}
   */
  async uploadAvatar(userId, file) {
    const user = await this.ensureCandidateUser(userId);

    if (!file?.buffer) throw createError(400, "Image file is required.");

    let profile = await CandidateProfile.findOne({ userId });
    if (!profile) profile = await CandidateProfile.create({ userId });

    // Delete old avatar from Cloudinary if exists
    if (profile.profilePicture?.publicId) {
      await cloudinary.uploader.destroy(profile.profilePicture.publicId).catch(() => {});
    }

    const { url, public_id } = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "recruiter_ai/avatars", transformation: [{ width: 300, height: 300, crop: "fill" }] },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(stream);
    });

    profile.profilePicture = { url, publicId: public_id };
    await profile.save();

    return { ...profile.toObject(), fullName: user.fullName ?? null };
  }

  /**
   * Save a job for a candidate
   * @param {string} userId
   * @param {string} jobId
   * @returns {Promise<Array>}
   */
  async saveJob(userId, jobId) {
    await this.ensureCandidateUser(userId);
    let profile = await CandidateProfile.findOne({ userId });
    if (!profile) profile = await CandidateProfile.create({ userId });

    if (!profile.savedJobs.includes(jobId)) {
      profile.savedJobs.push(jobId);
      await profile.save();
    }
    return profile.savedJobs;
  }

  /**
   * Unsave a job for a candidate
   * @param {string} userId
   * @param {string} jobId
   * @returns {Promise<Array>}
   */
  async unsaveJob(userId, jobId) {
    await this.ensureCandidateUser(userId);
    const profile = await CandidateProfile.findOne({ userId });
    if (!profile) return [];

    profile.savedJobs = profile.savedJobs.filter((id) => id.toString() !== jobId.toString());
    await profile.save();
    return profile.savedJobs;
  }

  /**
   * Get saved jobs for a candidate
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getSavedJobs(userId) {
    await this.ensureCandidateUser(userId);
    const profile = await CandidateProfile.findOne({ userId }).populate({
      path: "savedJobs",
      populate: { path: "company" }
    });
    if (!profile) return [];
    return profile.savedJobs;
  }

  /**
   * Get public profile by candidateId and record a view if viewer is different
   * @param {string} candidateId
   * @param {string} viewerId
   * @returns {Promise<Object>}
   */
  async getProfileById(candidateId, viewerId) {
    const user = await User.findById(candidateId);
    if (!user || user.role !== "candidate") {
      throw createError(404, "Candidate not found.");
    }

    let profile = await CandidateProfile.findOne({ userId: candidateId });
    if (!profile) {
      profile = await CandidateProfile.create({ userId: candidateId });
    }

    if (viewerId && viewerId.toString() !== candidateId.toString()) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      profile.views = (profile.views || []).filter(v => v.viewedAt >= oneMonthAgo);
      profile.views.push({
        viewerId,
        viewedAt: new Date()
      });
      await profile.save();
    }

    return {
      ...profile.toObject(),
      fullName: user.fullName ?? null,
    };
  }

  /**
   * Record a view manually
   * @param {string} candidateId
   * @param {string} viewerId
   * @returns {Promise<void>}
   */
  async recordView(candidateId, viewerId) {
    if (viewerId && viewerId.toString() === candidateId.toString()) {
      return;
    }
    const profile = await CandidateProfile.findOne({ userId: candidateId });
    if (!profile) return;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    profile.views = (profile.views || []).filter(v => v.viewedAt >= oneMonthAgo);

    profile.views.push({
      viewerId,
      viewedAt: new Date()
    });
    await profile.save();
  }

  /**
   * Get Candidate Dashboard Statistics
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getDashboardStats(userId) {
    const profile = await CandidateProfile.findOne({ userId });
    
    let profileViewsCount = 0;
    let viewsChange = "+0%";
    let viewsTrend = "up";

    if (profile) {
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Keep only last month's views
      const activeViews = (profile.views || []).filter(v => v.viewedAt >= oneMonthAgo);
      profileViewsCount = activeViews.length;

      // Calculate this week vs last week views
      const thisWeekViews = activeViews.filter(v => v.viewedAt >= oneWeekAgo).length;
      const lastWeekViews = activeViews.filter(v => v.viewedAt >= twoWeeksAgo && v.viewedAt < oneWeekAgo).length;

      if (lastWeekViews === 0) {
        viewsChange = thisWeekViews > 0 ? `+${thisWeekViews}` : "0";
        viewsTrend = "up";
      } else {
        const diff = thisWeekViews - lastWeekViews;
        const pct = Math.round((diff / lastWeekViews) * 100);
        viewsChange = pct >= 0 ? `+${pct}%` : `${pct}%`;
        viewsTrend = pct >= 0 ? "up" : "down";
      }
    }

    // Import Application dynamically to avoid circular references
    const Application = (await import("../applications/application.model.js")).default;
    const totalApps = await Application.countDocuments({ candidateId: userId });
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekApps = await Application.countDocuments({
      candidateId: userId,
      createdAt: { $gte: oneWeekAgo }
    });
    const lastWeekApps = await Application.countDocuments({
      candidateId: userId,
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
    });

    const appsChange = thisWeekApps >= lastWeekApps 
      ? `+${thisWeekApps - lastWeekApps}` 
      : `-${lastWeekApps - thisWeekApps}`;
    const appsTrend = thisWeekApps >= lastWeekApps ? "up" : "down";

    // Get avg match score
    const completedScreenings = await Application.find({
      candidateId: userId,
      "aiScreening.status": "completed",
      "aiScreening.overallScore": { $exists: true, $ne: null }
    }).select("aiScreening.overallScore");

    let avgScore = 0;
    if (completedScreenings.length > 0) {
      const totalScore = completedScreenings.reduce((sum, app) => sum + app.aiScreening.overallScore, 0);
      avgScore = Math.round(totalScore / completedScreenings.length);
    }

    return {
      profileViews: { value: profileViewsCount.toString(), change: viewsChange, trend: viewsTrend },
      applications: { value: totalApps.toString(), change: appsChange, trend: appsTrend },
      avgMatchScore: { value: avgScore > 0 ? `${avgScore}%` : "0%", change: "+0%", trend: "up" }
    };
  }
}

const profileService = new ProfileService();
export default profileService;
export { profileService };

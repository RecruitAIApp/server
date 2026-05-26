import CandidateProfile from "../auth/candidateProfile.model.js";
import User from "../auth/user.model.js";
import { uploadCVToCloudinary, enqueueCVParse } from "../auth/cv.service.js";
import { createError } from "../../utils/error.js";

class ProfileService {
  /**
   * Ensure user is a candidate
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

    return {
      ...profile.toObject(),
      fullName: user.fullName ?? null,
    };
  }

  /**
   * Upload CV/Resume to Cloudinary
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
   */
  async syncProfileCompletion(profileId) {
    const profile = await CandidateProfile.findById(profileId);
    if (!profile) return null;

    const user = await User.findById(profile.userId);
    if (!user) return null;

    profile.profileCompletion = this.calculateProfileCompletion(user, profile);
    await profile.save();
    return profile;
  }
}

const profileService = new ProfileService();
export default profileService;
export { profileService };

import profileService from "./profile.service.js";

class ProfileController {
  async getProfile(req, res) {
    try {
      const result = await profileService.getProfile(req.user.id);
      return res.status(200).json({
        success: true,
        profile: result,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Failed to retrieve candidate profile.",
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const result = await profileService.updateProfile(req.user.id, req.body);
      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        profile: result,
      });
    } catch (err) {
      return res.status(err.status || 400).json({
        success: false,
        message: err.message || "Failed to update candidate profile.",
      });
    }
  }

  async uploadCV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "PDF resume file is required.",
        });
      }

      const result = await profileService.uploadCV(req.user.id, req.file);
      return res.status(200).json({
        success: true,
        message: "Resume uploaded. Parsing started.",
        profile: result,
      });
    } catch (err) {
      return res.status(err.status || 400).json({
        success: false,
        message: err.message || "Failed to upload resume.",
      });
    }
  }
  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Image file is required." });
      }
      const result = await profileService.uploadAvatar(req.user.id, req.file);
      return res.status(200).json({ success: true, message: "Avatar uploaded.", profile: result });
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, message: err.message || "Failed to upload avatar." });
    }
  }

  async saveJob(req, res) {
    try {
      const { jobId } = req.params;
      const result = await profileService.saveJob(req.user.id, jobId);
      return res.status(200).json({ success: true, message: "Job saved successfully.", savedJobs: result });
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, message: err.message || "Failed to save job." });
    }
  }

  async unsaveJob(req, res) {
    try {
      const { jobId } = req.params;
      const result = await profileService.unsaveJob(req.user.id, jobId);
      return res.status(200).json({ success: true, message: "Job unsaved successfully.", savedJobs: result });
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, message: err.message || "Failed to unsave job." });
    }
  }

  async getSavedJobs(req, res) {
    try {
      const result = await profileService.getSavedJobs(req.user.id);
      return res.status(200).json({ success: true, savedJobs: result });
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, message: err.message || "Failed to retrieve saved jobs." });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const result = await profileService.getDashboardStats(req.user.id);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Failed to retrieve dashboard stats.",
      });
    }
  }

  async getProfileById(req, res) {
    try {
      const { candidateId } = req.params;
      const viewerId = req.user?.id;
      const result = await profileService.getProfileById(candidateId, viewerId);
      return res.status(200).json({
        success: true,
        profile: result,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Failed to retrieve candidate profile.",
      });
    }
  }

  async recordView(req, res) {
    try {
      const { candidateId } = req.params;
      const viewerId = req.user?.id;
      await profileService.recordView(candidateId, viewerId);
      return res.status(200).json({
        success: true,
        message: "Profile view recorded successfully."
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Failed to record profile view."
      });
    }
  }
}

const profileController = new ProfileController();
export default profileController;
export { profileController };

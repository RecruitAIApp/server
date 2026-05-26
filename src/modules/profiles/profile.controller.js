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
}

const profileController = new ProfileController();
export default profileController;
export { profileController };

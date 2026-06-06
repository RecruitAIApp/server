import notificationService from "./notification.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

class NotificationController {
  async getMyNotifications(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const notifications = await notificationService.getUserNotifications(userId);
      return sendResponse(res, 200, true, "Notifications fetched successfully", notifications);
    } catch (error) {
      return sendResponse(res, 500, false, "Failed to fetch notifications", error.message);
    }
  }

  async deleteNotification(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { id } = req.params;
      const result = await notificationService.deleteNotification(id, userId);
      
      if (!result) {
        return sendResponse(res, 404, false, "Notification not found or unauthorized");
      }

      return sendResponse(res, 200, true, "Notification deleted successfully");
    } catch (error) {
      return sendResponse(res, 500, false, "Failed to delete notification", error.message);
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, userId);
      
      if (!notification) {
        return sendResponse(res, 404, false, "Notification not found or unauthorized");
      }

      return sendResponse(res, 200, true, "Notification marked as read", notification);
    } catch (error) {
      return sendResponse(res, 500, false, "Failed to update notification", error.message);
    }
  }
}

export default new NotificationController();

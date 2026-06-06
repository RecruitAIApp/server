import Notification from "./notification.model.js";
import { sendNotificationToUser } from "../../config/socket.config.js";

class NotificationService {

  async notify(userId, { type, title, message, data = {} }) {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
    });
    
    sendNotificationToUser(userId.toString(), notification);
    
    return notification;
  }


  async getUserNotifications(userId) {
    return Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);
  }


  async deleteNotification(notificationId, userId) {
    return Notification.findOneAndDelete({
      _id: notificationId,
      user: userId, 
    });
  }


  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true },
      { new: true }
    );
  }
  

  async markAllAsRead(userId) {
    return Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );
  }
}

export default new NotificationService();

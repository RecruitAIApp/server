import express from "express";
import notificationController from "./notification.controller.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";

const router = express.Router();


router.get("/", authenticate, notificationController.getMyNotifications);


router.patch("/read-all", authenticate, notificationController.markAllAsRead);


router.patch("/:id/read", authenticate, notificationController.markAsRead);

router.delete("/:id", authenticate, notificationController.deleteNotification);

export default router;

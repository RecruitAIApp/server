import express from "express";
import * as applicationChatController from "./application-chat.controller.js";
import { authenticate, allowRoles } from "../../common/middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(allowRoles("employer", "admin"));

router
  .route("/:jobId")
  .get(applicationChatController.getChatHistory)
  .post(applicationChatController.sendMessage)
  .delete(applicationChatController.deleteChat);

export default router;

import { Router } from "express";
import { sendMessage, getHistory, deleteChat } from "./chat.controller.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/messages", sendMessage);

router.get("/messages/:jobId", getHistory);

router.delete("/:jobId", deleteChat);

export default router;

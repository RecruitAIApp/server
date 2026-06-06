import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRouter from "./src/modules/auth/auth.routes.js";
import applicationRouter from "./src/modules/applications/applications.routes.js";
import companyRouter from "./src/modules/company/company.routes.js";
import jobsRouter from "./src/modules/jobs/jobs.routes.js";
import profileRouter from "./src/modules/profiles/profile.routes.js";
import employerRouter from "./src/modules/employer/employer.routes.js";
import jobChatRouter from "./src/modules/job-chat/chat.routes.js";
import testRouter from "./src/routes/test.routes.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "UP",
    timestamp: new Date(),
  });
});

// Auth routes
app.use("/api/auth", authRouter);
app.use("/api/v1/applications", applicationRouter);

app.use("/api/companies", companyRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/employer", employerRouter);

// Profile routes
app.use("/api/profiles", profileRouter);

// Job Chat routes
app.use("/api/v1/job-chat", jobChatRouter);

// Test routes (for development/testing)
app.use("/api/test", testRouter);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

export default app;

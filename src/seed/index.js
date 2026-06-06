import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "../config/db.config.js";
import seedUsersAndCompanies from "./users.seed.js";
import seedJobs from "./jobs.seed.js";
import seedApplications from "./applications.seed.js";

dotenv.config();

async function runSeed() {
  try {
    await connectDB();
    console.log("🌱 Database connected. Clearing old data...");
    
    // Clear all
    await mongoose.connection.db.dropDatabase();
    console.log("🧹 Database cleared.");

    console.log("Starting seed process...");
    
    const { employers, companies, candidates } = await seedUsersAndCompanies();
    const jobs = await seedJobs(employers, companies);
    await seedApplications(candidates, jobs, companies);

    console.log("✅ Seed process completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

runSeed();

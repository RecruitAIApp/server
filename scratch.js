import mongoose from "mongoose";
import dotenv from "dotenv";
import Job from "./src/modules/jobs/job.model.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const jobs = await Job.find().sort({ createdAt: -1 });
  console.log(`Found ${jobs.length} jobs in DB.`);
  
  jobs.forEach(job => {
    console.log(`Job Title: ${job.title} | Created At: ${job.createdAt}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);

import mongoose from "mongoose";
import config from "./config/index.js";
import User from "./modules/auth/user.model.js";
import Company from "./modules/company/company.model.js";
import Job from "./modules/jobs/job.model.js";
import employerProfile from "./modules/auth/employerProfile.model.js";
import CandidateProfile from "./modules/auth/candidateProfile.model.js";

async function seed() {
  try {
    console.log("Connecting to MongoDB at:", config.mongoUri);
    await mongoose.connect(config.mongoUri);
    console.log("Connected successfully.");

    // Clear existing collections
    console.log("Cleaning up existing database collections...");
    await Job.deleteMany({});
    await Company.deleteMany({});
    await employerProfile.deleteMany({});
    await CandidateProfile.deleteMany({});
    await User.deleteMany({});
    console.log("Database cleared.");

    // 1. Seed Users (passwords will be hashed automatically by the pre-save hook)
    console.log("Creating users...");
    const employerUser = await User.create({
      email: "employer@example.com",
      password: "password123",
      role: "employer",
      fullName: "Tech Recruiter",
      status: "active",
      isActive: true,
    });

    const candidate1 = await User.create({
      email: "newuser123@example.com",
      password: "password123",
      role: "candidate",
      fullName: "John Doe",
      status: "active",
      isActive: true,
    });

    const candidate2 = await User.create({
      email: "jane@example.com",
      password: "password123",
      role: "candidate",
      fullName: "Jane Smith",
      status: "active",
      isActive: true,
    });

    console.log("Users created successfully:");
    console.log(`- Employer: employer@example.com (PW: password123)`);
    console.log(`- Candidate 1: newuser123@example.com (PW: password123)`);
    console.log(`- Candidate 2: jane@example.com (PW: password123)`);

    // 2. Create Active Company
    console.log("Creating active company...");
    const company = await Company.create({
      name: "Cc",
      description: "Next-gen tech enterprise specializing in web solutions.",
      industry: "Technology",
      size: "11-50",
      location: "San Francisco, CA",
      owner: employerUser._id,
      status: "active",
      website: "https://techcorp.example.com",
    });
    console.log("Company 'Cc' created successfully.");

    // 3. Create Employer Profile linking employer user to company
    await employerProfile.create({
      userId: employerUser._id,
      companyId: company._id,
      role: "owner",
    });
    console.log("Employer Profile created.");

    // 4. Create Candidate Profiles
    console.log("Creating candidate profiles...");
    const profile1 = await CandidateProfile.create({
      userId: candidate1._id,
      basicInfo: {
        headline: "Frontend React Developer",
        bio: "Experienced frontend engineer with a passion for building beautiful user experiences.",
        phone: "+1234567890",
        location: { country: "Egypt", city: "Cairo" },
        socialLinks: {
          linkedin: "https://linkedin.com/in/johndoe",
          github: "https://github.com/johndoe",
          portfolio: "https://johndoe.dev",
        },
      },
      skills: ["React", "TypeScript", "JavaScript", "HTML", "CSS", "Git"],
      profileCompletion: 80,
      onboardingCompleted: true,
    });

    const profile2 = await CandidateProfile.create({
      userId: candidate2._id,
      basicInfo: {
        headline: "Full Stack Engineer",
        bio: "Versatile developer experienced with React, Node.js, and databases.",
        phone: "+9876543210",
        location: { country: "Egypt", city: "Giza" },
        socialLinks: {
          linkedin: "https://linkedin.com/in/janesmith",
          github: "https://github.com/janesmith",
        },
      },
      skills: ["React", "Node.js", "Express.js", "MongoDB", "JavaScript"],
      profileCompletion: 75,
      onboardingCompleted: true,
    });
    console.log("Candidate Profiles created.");

    // 5. Seed Jobs linked to the company and employer
    console.log("Creating jobs...");
    const mockJobsToSeed = [
      {
        title: "Senior Frontend Developer",
        description: "Looking for an experienced React developer to join our growing team. You will be responsible for building and maintaining high-quality web applications using modern technologies.",
        requirements: [
          "5+ years of experience with React and TypeScript",
          "Strong understanding of modern frontend architecture",
          "Experience with state management (Redux, MobX, or similar)",
          "Excellent communication and collaboration skills"
        ],
        salaryRange: {
          min: 120000,
          max: 160000,
          currency: "$"
        },
        location: "San Francisco, CA",
        company: company._id,
        postedBy: employerUser._id,
        jobType: "remote",
        employmentType: "full-time",
        experienceLevel: "senior",
        skills: ["React", "TypeScript", "Node.js"],
        status: "open"
      },
      {
        title: "React Engineer",
        description: "Join our fast-paced startup building the future of e-commerce. You will own front-end features and improve user interactions.",
        requirements: [
          "3+ years of professional React experience",
          "Experience with Apollo Client / GraphQL API integration",
          "Proficient in TailwindCSS and modern responsive UI development"
        ],
        salaryRange: {
          min: 100000,
          max: 140000,
          currency: "$"
        },
        location: "Remote",
        company: company._id,
        postedBy: employerUser._id,
        jobType: "remote",
        employmentType: "full-time",
        experienceLevel: "mid",
        skills: ["React", "GraphQL", "AWS"],
        status: "open"
      },
      {
        title: "Full Stack Developer",
        description: "We are seeking a talented full-stack developer with strong React skills and database schema knowledge to support our analytics pipeline.",
        requirements: [
          "4+ years of full-stack engineering experience",
          "Strong coding standards in Python (Django/FastAPI) or Node.js",
          "Experience writing optimized SQL queries on PostgreSQL"
        ],
        salaryRange: {
          min: 110000,
          max: 150000,
          currency: "$"
        },
        location: "New York, NY",
        company: company._id,
        postedBy: employerUser._id,
        jobType: "hybrid",
        employmentType: "full-time",
        experienceLevel: "mid",
        skills: ["React", "Python", "PostgreSQL"],
        status: "open"
      },
      {
        title: "UI/UX Engineer",
        description: "Create beautiful, user-friendly interfaces for our diverse client portfolio. Bridging high-fidelity designs and React builds.",
        requirements: [
          "Deep aesthetic intuition and layout building",
          "Experience translating Figma exports into clean React/Tailwind code"
        ],
        salaryRange: {
          min: 90000,
          max: 130000,
          currency: "$"
        },
        location: "Austin, TX",
        company: company._id,
        postedBy: employerUser._id,
        jobType: "onsite",
        employmentType: "full-time",
        experienceLevel: "mid",
        skills: ["React", "Figma", "CSS"],
        status: "open"
      },
      {
        title: "Frontend Lead",
        description: "Lead our frontend team in building scalable financial reporting applications. Shape architecture guidelines.",
        requirements: [
          "7+ years of frontend application experience",
          "Proven history mentoring and leading engineers"
        ],
        salaryRange: {
          min: 140000,
          max: 180000,
          currency: "$"
        },
        location: "Seattle, WA",
        company: company._id,
        postedBy: employerUser._id,
        jobType: "hybrid",
        employmentType: "full-time",
        experienceLevel: "lead",
        skills: ["React", "Team Lead", "Architecture"],
        status: "open"
      },
      {
        title: "JavaScript Developer",
        description: "Contract position for an experienced JavaScript developer to aid migration of legacy systems into unified React architectures.",
        requirements: [
          "Advanced vanilla JS and React skills"
        ],
        salaryRange: {
          min: 80000,
          max: 110000,
          currency: "$"
        },
        location: "Remote",
        company: company._id,
        postedBy: employerUser._id,
        jobType: "remote",
        employmentType: "contract",
        experienceLevel: "mid",
        skills: ["JavaScript", "React", "Vue"],
        status: "open"
      }
    ];

    const seededJobs = await Job.insertMany(mockJobsToSeed);
    console.log(`Successfully seeded ${seededJobs.length} jobs.`);

    // 6. Link one job to candidate's saved list for testing saved jobs page
    profile1.savedJobs.push(seededJobs[0]._id);
    await profile1.save();
    console.log(`Bookmarked job "${seededJobs[0].title}" in John Doe's profile.`);

    console.log("\nDatabase seeding completed successfully! 🎉");
  } catch (err) {
    console.error("Error during seeding process:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seed();

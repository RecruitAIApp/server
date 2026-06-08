import Job from "../modules/jobs/job.model.js";

export default async function seedJobs(employers, companies) {
  console.log("Seeding Jobs...");

  const job1 = await Job.create({
    title: "Senior Frontend Engineer",
    description: "Looking for an expert React developer to join our remote team and build scalable interfaces.",
    requirements: ["React", "Next.js", "Tailwind CSS"],
    salaryRange: { min: 120, max: 150, currency: "USD" },
    location: "Remote",
    jobType: "remote",
    employmentType: "full-time",
    company: companies[0]._id,
    postedBy: employers[0]._id,
    status: "open",
  });

  const job2 = await Job.create({
    title: "Backend Node.js Developer",
    description: "Join our core backend team to build robust APIs using Express and MongoDB.",
    requirements: ["Node.js", "MongoDB", "Express", "REST APIs"],
    salaryRange: { min: 100, max: 130, currency: "USD" },
    location: "New York, NY",
    jobType: "hybrid",
    employmentType: "full-time",
    company: companies[0]._id,
    postedBy: employers[0]._id,
    status: "open",
  });

  const job3 = await Job.create({
    title: "Lead UX/UI Designer",
    description: "Lead the design of our next-generation web applications.",
    requirements: ["Figma", "Prototyping", "User Research", "UI Design"],
    salaryRange: { min: 90, max: 125, currency: "USD" },
    location: "San Francisco, CA",
    jobType: "onsite",
    employmentType: "full-time",
    company: companies[1]._id,
    postedBy: employers[1]._id,
    status: "open",
  });

  const job4 = await Job.create({
    title: "QA Automation Engineer",
    description: "Looking for a QA engineer to build automated test suites using Playwright or Cypress.",
    requirements: ["Playwright", "Cypress", "JavaScript", "CI/CD"],
    salaryRange: { min: 80, max: 110, currency: "USD" },
    location: "Remote",
    jobType: "remote",
    employmentType: "full-time",
    company: companies[0]._id,
    postedBy: employers[0]._id,
    status: "open",
  });

  const job5 = await Job.create({
    title: "Python AI Developer",
    description: "Build AI-driven pipelines using LangChain, OpenAI, and Python.",
    requirements: ["Python", "LangChain", "OpenAI", "FastAPI"],
    salaryRange: { min: 130, max: 170, currency: "USD" },
    location: "Remote",
    jobType: "remote",
    employmentType: "full-time",
    company: companies[0]._id,
    postedBy: employers[0]._id,
    status: "open",
  });

  return [job1, job2, job3, job4, job5];
}

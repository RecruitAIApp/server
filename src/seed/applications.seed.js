import Application from "../modules/applications/application.model.js";

export default async function seedApplications(candidates, jobs, companies) {
  console.log("Seeding Applications...");

  await Application.create({
    candidateId: candidates[0]._id, // Jane Doe
    companyId: companies[0]._id, // TechCorp
    jobId: jobs[0]._id, // Frontend Engineer
    appliedResume: {
      url: "https://example.com/cv.pdf",
      publicId: "cv_1",
      fileName: "jane_doe_cv.pdf",
    },
    stage: {
      key: "shortlisted",
      changedAt: new Date(),
      changedBy: companies[0].owner,
    },
    aiScreening: {
      status: "completed",
      overallScore: 92,
      analysis: {
        skills: { score: 95, details: "Strong React skills." },
        experience: { score: 90, details: "Meets experience requirements." },
        culture: { score: 85, details: "Good fit for remote work." },
        education: { score: 100, details: "Relevant degree found." }
      }
    },
    timeline: [
      {
        action: "applied",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        performedBy: candidates[0]._id
      },
      {
        action: "shortlisted",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        performedBy: companies[0].owner
      }
    ]
  });

  await Application.create({
    candidateId: candidates[1]._id, // John Smith
    companyId: companies[0]._id, // TechCorp
    jobId: jobs[1]._id, // Backend Developer
    appliedResume: {
      url: "https://example.com/cv2.pdf",
      publicId: "cv_2",
      fileName: "john_smith_cv.pdf",
    },
    stage: {
      key: "applied",
      changedAt: new Date(),
      changedBy: candidates[1]._id,
    },
    aiScreening: {
      status: "completed",
      overallScore: 88,
      analysis: {
        skills: { score: 90, details: "Solid Node.js experience." },
        experience: { score: 85, details: "Slightly less experience than requested but strong projects." },
        culture: { score: 95, details: "Highly adaptable." },
        education: { score: 80, details: "Self-taught, strong portfolio." }
      }
    },
    timeline: [
      {
        action: "applied",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        performedBy: candidates[1]._id
      }
    ]
  });

  await Application.create({
    candidateId: candidates[2]._id, // Sarah Lee
    companyId: companies[1]._id, // Innovate Solutions
    jobId: jobs[2]._id, // UX Designer
    appliedResume: {
      url: "https://example.com/cv3.pdf",
      publicId: "cv_3",
      fileName: "sarah_lee_cv.pdf",
    },
    stage: {
      key: "interviewing",
      changedAt: new Date(),
      changedBy: companies[1].owner,
    },
    aiScreening: {
      status: "completed",
      overallScore: 96,
      analysis: {
        skills: { score: 98, details: "Exceptional UI/UX portfolio." },
        experience: { score: 95, details: "Extensive experience in similar roles." },
        culture: { score: 90, details: "Great team player." },
        education: { score: 100, details: "Design degree." }
      }
    },
    timeline: [
      {
        action: "applied",
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        performedBy: candidates[2]._id
      },
      {
        action: "shortlisted",
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        performedBy: companies[1].owner
      },
      {
        action: "interviewing",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        performedBy: companies[1].owner
      }
    ]
  });
}

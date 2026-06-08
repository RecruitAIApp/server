import Application from "../modules/applications/application.model.js";

export default async function seedApplications(candidates, jobs, companies) {
  console.log("Seeding Applications...");

  // Job 1: Senior Frontend Engineer (TechCorp)
  // 1. Jane Doe - shortlisted
  await Application.create({
    candidateId: candidates[0]._id,
    companyId: companies[0]._id,
    jobId: jobs[0]._id,
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
      { action: "applied", date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), performedBy: candidates[0]._id },
      { action: "shortlisted", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), performedBy: companies[0].owner }
    ]
  });

  // 2. Daniel Thomas - applied
  await Application.create({
    candidateId: candidates[7]._id,
    companyId: companies[0]._id,
    jobId: jobs[0]._id,
    appliedResume: {
      url: "https://example.com/cv8.pdf",
      publicId: "cv_8",
      fileName: "daniel_thomas_cv.pdf",
    },
    stage: {
      key: "applied",
      changedAt: new Date(),
      changedBy: candidates[7]._id,
    },
    aiScreening: {
      status: "completed",
      overallScore: 95,
      analysis: {
        skills: { score: 97, details: "Excellent React and TypeScript." },
        experience: { score: 95, details: "7 years of frontend experience." },
        culture: { score: 90, details: "Highly collaborative." },
        education: { score: 95, details: "Bachelor in Computer Science." }
      }
    },
    timeline: [
      { action: "applied", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), performedBy: candidates[7]._id }
    ]
  });

  // 3. Michael Brown - interview
  await Application.create({
    candidateId: candidates[3]._id,
    companyId: companies[0]._id,
    jobId: jobs[0]._id,
    appliedResume: {
      url: "https://example.com/cv4.pdf",
      publicId: "cv_4",
      fileName: "michael_brown_cv.pdf",
    },
    stage: {
      key: "interview",
      changedAt: new Date(),
      changedBy: companies[0].owner,
    },
    aiScreening: {
      status: "completed",
      overallScore: 89,
      analysis: {
        skills: { score: 91, details: "Strong React Native and JS skills." },
        experience: { score: 88, details: "Good cross-platform experience." },
        culture: { score: 85, details: "Proactive and motivated." },
        education: { score: 90, details: "Engineering degree." }
      }
    },
    timeline: [
      { action: "applied", date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), performedBy: candidates[3]._id },
      { action: "shortlisted", date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), performedBy: companies[0].owner },
      { action: "interview", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), performedBy: companies[0].owner }
    ]
  });

  // Job 2: Backend Node.js Developer (TechCorp)
  // 4. John Smith - applied
  await Application.create({
    candidateId: candidates[1]._id,
    companyId: companies[0]._id,
    jobId: jobs[1]._id,
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
        experience: { score: 85, details: "Slightly less experience than requested." },
        culture: { score: 95, details: "Highly adaptable." },
        education: { score: 80, details: "Self-taught developer." }
      }
    },
    timeline: [
      { action: "applied", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), performedBy: candidates[1]._id }
    ]
  });

  // 5. Emily Davis - shortlisted
  await Application.create({
    candidateId: candidates[4]._id,
    companyId: companies[0]._id,
    jobId: jobs[1]._id,
    appliedResume: {
      url: "https://example.com/cv5.pdf",
      publicId: "cv_5",
      fileName: "emily_davis_cv.pdf",
    },
    stage: {
      key: "shortlisted",
      changedAt: new Date(),
      changedBy: companies[0].owner,
    },
    aiScreening: {
      status: "completed",
      overallScore: 91,
      analysis: {
        skills: { score: 93, details: "Excellent Docker, AWS, and Node.js." },
        experience: { score: 89, details: "4 years of backend experience." },
        culture: { score: 90, details: "Great communication skills." },
        education: { score: 90, details: "Bachelor degree." }
      }
    },
    timeline: [
      { action: "applied", date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), performedBy: candidates[4]._id },
      { action: "shortlisted", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), performedBy: companies[0].owner }
    ]
  });

  // Job 4: QA Automation Engineer (TechCorp)
  // 6. David Wilson - applied
  await Application.create({
    candidateId: candidates[5]._id,
    companyId: companies[0]._id,
    jobId: jobs[3]._id,
    appliedResume: {
      url: "https://example.com/cv6.pdf",
      publicId: "cv_6",
      fileName: "david_wilson_cv.pdf",
    },
    stage: {
      key: "applied",
      changedAt: new Date(),
      changedBy: candidates[5]._id,
    },
    aiScreening: {
      status: "completed",
      overallScore: 87,
      analysis: {
        skills: { score: 90, details: "Great Cypress and Playwright skills." },
        experience: { score: 82, details: "3 years of automation testing." },
        culture: { score: 88, details: "Detail-oriented." },
        education: { score: 85, details: "CS background." }
      }
    },
    timeline: [
      { action: "applied", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), performedBy: candidates[5]._id }
    ]
  });

  // Job 5: Python AI Developer (TechCorp)
  // 7. Jessica Taylor - interview
  await Application.create({
    candidateId: candidates[6]._id,
    companyId: companies[0]._id,
    jobId: jobs[4]._id,
    appliedResume: {
      url: "https://example.com/cv7.pdf",
      publicId: "cv_7",
      fileName: "jessica_taylor_cv.pdf",
    },
    stage: {
      key: "interview",
      changedAt: new Date(),
      changedBy: companies[0].owner,
    },
    aiScreening: {
      status: "completed",
      overallScore: 94,
      analysis: {
        skills: { score: 96, details: "Strong Python, LangChain, and FastAPI." },
        experience: { score: 92, details: "5 years of software engineering." },
        culture: { score: 90, details: "Passionate about AI." },
        education: { score: 98, details: "Master's degree." }
      }
    },
    timeline: [
      { action: "applied", date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), performedBy: candidates[6]._id },
      { action: "shortlisted", date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), performedBy: companies[0].owner },
      { action: "interview", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), performedBy: companies[0].owner }
    ]
  });

  // Job 3: Lead UX/UI Designer (Innovate Solutions)
  // 8. Sarah Lee - interview
  await Application.create({
    candidateId: candidates[2]._id,
    companyId: companies[1]._id,
    jobId: jobs[2]._id,
    appliedResume: {
      url: "https://example.com/cv3.pdf",
      publicId: "cv_3",
      fileName: "sarah_lee_cv.pdf",
    },
    stage: {
      key: "interview",
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
      { action: "applied", date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), performedBy: candidates[2]._id },
      { action: "shortlisted", date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), performedBy: companies[1].owner },
      { action: "interview", date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), performedBy: companies[1].owner }
    ]
  });
}

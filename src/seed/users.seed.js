import User from "../modules/auth/user.model.js";
import Company from "../modules/company/company.model.js";
import CandidateProfile from "../modules/auth/candidateProfile.model.js";

export default async function seedUsersAndCompanies() {
  console.log("Seeding Users and Companies...");

  const employer1 = await User.create({
    email: "employer@techcorp.com",
    password: "password123",
    role: "employer",
    fullName: "TechCorp Admin",
    status: "active",
    isActive: true,
  });

  const company1 = await Company.create({
    name: "TechCorp",
    description: "Leading tech solutions provider.",
    industry: "Technology",
    owner: employer1._id,
    status: "active",
  });

  const employer2 = await User.create({
    email: "hr@innovatesolutions.com",
    password: "password123",
    role: "employer",
    fullName: "Innovate HR",
    status: "active",
    isActive: true,
  });

  const company2 = await Company.create({
    name: "Innovate Solutions",
    description: "Creative design and product agency.",
    industry: "Design",
    owner: employer2._id,
    status: "active",
  });

  const candidate1 = await User.create({
    email: "candidate@example.com",
    password: "password123",
    role: "candidate",
    fullName: "Jane Doe",
    status: "active",
    isActive: true,
  });

  await CandidateProfile.create({
    userId: candidate1._id,
    basicInfo: { headline: "Senior Frontend Engineer", bio: "Passionate about React." },
    skills: ["React", "Node.js", "JavaScript"],
    resume: {
      url: "https://example.com/cv.pdf",
      publicId: "cv_1",
      fileName: "jane_doe_cv.pdf",
      parseStatus: "done",
      parsedData: {
        skills: ["React", "JavaScript"],
        experienceYears: 4,
        jobTitles: ["Frontend Engineer"],
        summary: "Frontend expert"
      }
    }
  });

  const candidate2 = await User.create({
    email: "john.smith@example.com",
    password: "password123",
    role: "candidate",
    fullName: "John Smith",
    status: "active",
    isActive: true,
  });

  await CandidateProfile.create({
    userId: candidate2._id,
    basicInfo: { headline: "Backend Developer", bio: "Node.js and MongoDB enthusiast." },
    skills: ["Node.js", "MongoDB", "Express"],
    resume: {
      url: "https://example.com/cv2.pdf",
      publicId: "cv_2",
      fileName: "john_smith_cv.pdf",
      parseStatus: "done",
      parsedData: {
        skills: ["Node.js", "MongoDB"],
        experienceYears: 3,
        jobTitles: ["Backend Developer"],
        summary: "Backend specialist"
      }
    }
  });

  const candidate3 = await User.create({
    email: "sarah.lee@example.com",
    password: "password123",
    role: "candidate",
    fullName: "Sarah Lee",
    status: "active",
    isActive: true,
  });

  await CandidateProfile.create({
    userId: candidate3._id,
    basicInfo: { headline: "UI/UX Designer", bio: "Creating beautiful and intuitive user experiences." },
    skills: ["Figma", "Sketch", "Prototyping"],
    resume: {
      url: "https://example.com/cv3.pdf",
      publicId: "cv_3",
      fileName: "sarah_lee_cv.pdf",
      parseStatus: "done",
      parsedData: {
        skills: ["Figma", "UI Design"],
        experienceYears: 5,
        jobTitles: ["UX Designer"],
        summary: "Creative designer"
      }
    }
  });

  return { 
    employers: [employer1, employer2], 
    companies: [company1, company2], 
    candidates: [candidate1, candidate2, candidate3] 
  };
}

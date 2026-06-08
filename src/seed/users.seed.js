import User from "../modules/auth/user.model.js";
import Company from "../modules/company/company.model.js";
import CandidateProfile from "../modules/auth/candidateProfile.model.js";
import EmployerProfile from "../modules/auth/employerProfile.model.js";

export default async function seedUsersAndCompanies() {
  console.log("Seeding Users and Companies...");

  // 1. TechCorp Company & Employees
  const owner1 = await User.create({
    email: "owner@techcorp.com",
    password: "password123",
    role: "employer",
    fullName: "TechCorp Owner",
    status: "active",
    isActive: true,
  });

  const company1 = await Company.create({
    name: "TechCorp",
    description: "Leading tech solutions provider.",
    industry: "Technology",
    owner: owner1._id,
    status: "active",
  });

  await EmployerProfile.create({
    userId: owner1._id,
    companyId: company1._id,
    role: "owner",
  });

  const hr1 = await User.create({
    email: "hr@techcorp.com",
    password: "password123",
    role: "employer",
    fullName: "TechCorp HR",
    status: "active",
    isActive: true,
  });

  await EmployerProfile.create({
    userId: hr1._id,
    companyId: company1._id,
    role: "hr",
  });

  // 2. Innovate Solutions Company & Employees
  const owner2 = await User.create({
    email: "hr@innovatesolutions.com",
    password: "password123",
    role: "employer",
    fullName: "Innovate HR & Owner",
    status: "active",
    isActive: true,
  });

  const company2 = await Company.create({
    name: "Innovate Solutions",
    description: "Creative design and product agency.",
    industry: "Design",
    owner: owner2._id,
    status: "active",
  });

  await EmployerProfile.create({
    userId: owner2._id,
    companyId: company2._id,
    role: "owner",
  });

  // 3. Candidates
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

  const candidate4 = await User.create({
    email: "michael.brown@example.com",
    password: "password123",
    role: "candidate",
    fullName: "Michael Brown",
    status: "active",
    isActive: true,
  });

  await CandidateProfile.create({
    userId: candidate4._id,
    basicInfo: { headline: "Senior React Native Developer", bio: "Cross-platform mobile apps expert." },
    skills: ["React Native", "TypeScript", "JavaScript"],
    resume: {
      url: "https://example.com/cv4.pdf",
      publicId: "cv_4",
      fileName: "michael_brown_cv.pdf",
      parseStatus: "done",
      parsedData: {
        skills: ["React Native", "TypeScript"],
        experienceYears: 6,
        jobTitles: ["Mobile Engineer"],
        summary: "Mobile app developer"
      }
    }
  });

  const candidate5 = await User.create({
    email: "emily.davis@example.com",
    password: "password123",
    role: "candidate",
    fullName: "Emily Davis",
    status: "active",
    isActive: true,
  });

  await CandidateProfile.create({
    userId: candidate5._id,
    basicInfo: { headline: "Backend Engineer", bio: "Microservices and cloud solutions architecture." },
    skills: ["Node.js", "Express", "Docker", "AWS"],
    resume: {
      url: "https://example.com/cv5.pdf",
      publicId: "cv_5",
      fileName: "emily_davis_cv.pdf",
      parseStatus: "done",
      parsedData: {
        skills: ["Node.js", "AWS", "Docker"],
        experienceYears: 4,
        jobTitles: ["Backend Developer"],
        summary: "Cloud and API engineer"
      }
    }
  });

  const candidate6 = await User.create({
    email: "david.wilson@example.com",
    password: "password123",
    role: "candidate",
    fullName: "David Wilson",
    status: "active",
    isActive: true,
  });

  await CandidateProfile.create({
    userId: candidate6._id,
    basicInfo: { headline: "QA Automation Engineer", bio: "Obsessed with bug-free code and automation." },
    skills: ["Playwright", "Cypress", "Selenium", "JavaScript"],
    resume: {
      url: "https://example.com/cv6.pdf",
      publicId: "cv_6",
      fileName: "david_wilson_cv.pdf",
      parseStatus: "done",
      parsedData: {
        skills: ["Playwright", "Cypress"],
        experienceYears: 3,
        jobTitles: ["QA Engineer"],
        summary: "Automation specialist"
      }
    }
  });

  const candidate7 = await User.create({
    email: "jessica.taylor@example.com",
    password: "password123",
    role: "candidate",
    fullName: "Jessica Taylor",
    status: "active",
    isActive: true,
  });

  await CandidateProfile.create({
    userId: candidate7._id,
    basicInfo: { headline: "Python AI Developer", bio: "Building intelligent agents and LLM applications." },
    skills: ["Python", "FastAPI", "LangChain", "OpenAI"],
    resume: {
      url: "https://example.com/cv7.pdf",
      publicId: "cv_7",
      fileName: "jessica_taylor_cv.pdf",
      parseStatus: "done",
      parsedData: {
        skills: ["Python", "LangChain"],
        experienceYears: 5,
        jobTitles: ["AI Developer"],
        summary: "AI systems engineer"
      }
    }
  });

  const candidate8 = await User.create({
    email: "daniel.thomas@example.com",
    password: "password123",
    role: "candidate",
    fullName: "Daniel Thomas",
    status: "active",
    isActive: true,
  });

  await CandidateProfile.create({
    userId: candidate8._id,
    basicInfo: { headline: "Senior React Developer", bio: "Specialized in styling, animation, and performance." },
    skills: ["React", "TypeScript", "Tailwind CSS", "Redux"],
    resume: {
      url: "https://example.com/cv8.pdf",
      publicId: "cv_8",
      fileName: "daniel_thomas_cv.pdf",
      parseStatus: "done",
      parsedData: {
        skills: ["React", "TypeScript", "Tailwind CSS"],
        experienceYears: 7,
        jobTitles: ["Senior Frontend Developer"],
        summary: "React and UI expert"
      }
    }
  });

  return { 
    employers: [owner1, owner2], 
    companies: [company1, company2], 
    candidates: [
      candidate1, 
      candidate2, 
      candidate3, 
      candidate4, 
      candidate5, 
      candidate6, 
      candidate7, 
      candidate8
    ] 
  };
}

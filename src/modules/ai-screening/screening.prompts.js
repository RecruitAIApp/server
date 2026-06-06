export function buildScreeningPrompt({ job, candidate, application, company, cvText }) {
  const { title, description, requirements, salaryRange, location, jobType, employmentType, experienceLevel, skills: jobSkills } = job;
  const { name: companyName, industry, description: companyDesc } = company;
  
  const { basicInfo, skills: candidateSkills, experience, education, resume } = candidate;
  const parsedData = resume?.parsedData || {};

  // Extract education details
  const educationLevel = education?.map(e => `${e.degree} in ${e.field} from ${e.institution} (${e.startYear}-${e.endYear})`).join(", ") || "No education history provided";

  // Format experience
  const experienceHistory = experience?.map(e => `${e.title} at ${e.company} (${new Date(e.startDate).getFullYear()}-${e.currentlyWorking ? 'Present' : new Date(e.endDate).getFullYear()})\n  ${e.description}`).join("\n") || "No experience history provided";

  return `
You are an expert technical recruiter AI. Your task is to evaluate a candidate's fit for a specific job opening.

### COMPANY CONTEXT
Company: ${companyName} (${industry})
Company Description: ${companyDesc}

### JOB REQUIREMENTS
Job Title: ${title}
Job Type: ${jobType}, ${employmentType}
Experience Level: ${experienceLevel}
Location: ${location}
Salary Range: ${salaryRange?.min} - ${salaryRange?.max} ${salaryRange?.currency}
Required Skills: ${(jobSkills || []).join(", ")}
Job Description:
${description}
Specific Requirements:
${(requirements || []).join("\n- ")}

### CANDIDATE PROFILE
Name: ${basicInfo?.headline || "Unknown Candidate"}
Headline: ${basicInfo?.headline || ""}
Summary: ${basicInfo?.bio || parsedData.summary || ""}
Skills (from Profile): ${(candidateSkills || []).join(", ")}
Skills (from CV Parsed Data): ${(parsedData.skills || []).join(", ")}
Parsed Experience Years: ${parsedData.experienceYears || 0}
Parsed Job Titles: ${(parsedData.jobTitles || []).join(", ")}

Education History:
${educationLevel}

Experience History:
${experienceHistory}

### FULL EXTRACTED CV TEXT
${cvText || "No raw CV text available."}

---

### INSTRUCTIONS
Based on the job requirements and the candidate's profile/CV, evaluate the candidate's fit for the role.

Return ONLY valid JSON matching this exact schema:
{
  "confidence": <number 0-100>,
  "scoreBreakdown": {
    "skills": <number 0-100>,
    "experience": <number 0-100>,
    "education": <number 0-100>,
    "cultureFit": <number 0-100>
  },
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "summary": "<3-4 sentence professional summary of fit>",
  "redFlags": [
    { "type": "string", "severity": "low|medium|high", "message": "string" }
  ]
}
`.trim();
}

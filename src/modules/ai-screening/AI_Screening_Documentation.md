# RecruitAI: AI Screening & Core Architecture Documentation

This document serves as a comprehensive guide to the architectural backend updates implemented in **RecruitAI** over the past week. 

It covers the introduction of the LangGraph-based AI Screening pipeline, crucial database schema changes in the Job and Application modules, and detailed instructions on how the frontend should consume and display these new features.

---

## 1. AI Screening Pipeline (LangGraph & BullMQ)

We integrated an advanced AI Screening system designed to evaluate candidate resumes against job requirements using LangGraph for workflow orchestration and BullMQ for robust background processing.

### Architecture Overview
When a candidate applies to a job, we do **not** block the HTTP request to wait for the LLM to process the resume. This ensures the frontend feels incredibly fast. Instead:
1. The `quickApply` API immediately saves the `Application` with `aiScreening.status = "pending"` and returns `201 Created`.
2. A job is added to a Redis-backed background queue (`PROCESSING_QUEUE` in BullMQ).
3. A background worker picks up the job and executes the **LangGraph Screening Graph**.

### LangGraph Implementation (`screening.graph.js`)
The screening process is orchestrated as a state machine using `@langchain/langgraph`:
- **Load Application Node**: Fetches the newly created `Application`, the `CandidateProfile`, the `Job` description, and the `Company` context.
- **Extract CV Node**: Attempts to extract raw text from the uploaded PDF resume using `pdf-parse`. 
  - *Fallback Strategy*: If no PDF URL exists, it gracefully falls back to using the `parsedData.skills` stored in the candidate's profile.
- **Screen Candidate Node**: Sends the extracted context to the LLM (OpenAI via our `LLMProvider.js`). The prompt forces the LLM to return strict JSON containing a `confidence` score, a breakdown of scores (skills, experience, education, culture fit), matched/missing skills, and a summary.
- **Save Result Node**: Parses the JSON response and updates the `Application` document with the results, officially changing `aiScreening.status` to `"completed"`.

### Fault Tolerance
- **Retries**: BullMQ is configured to automatically retry processing up to 3 times with an exponential backoff (starting at 5 seconds) if the LLM times out or returns malformed, non-JSON output.
- **Error Handling**: If the maximum retries are reached, the application's `aiScreening.status` is safely set to `"failed"`.

---

## 2. Core Schema & Logic Changes

To support the AI Screening and fix existing bugs, several changes were made to other core modules:

### Job Module Updates
- **`applicationDeadline` Standardization**: The deadline field in the `Job` schema was renamed to `applicationDeadline` to ensure naming consistency across the platform. 
- **Validation Fix**: In `job.repository.js`, the `assertJobIsOpen` function was updated to correctly reference `applicationDeadline` instead of `deadline`. This ensures candidates cannot apply to jobs that have closed.

### Application Module Updates
- **`aiScreening` Schema Injection**: Added a complex `aiScreening` object to the `Application` schema to store the LLM's evaluation results.
  ```javascript
  aiScreening: {
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    overallScore: { type: Number, min: 0, max: 100 },
    scoreBreakdown: {
      skills: Number,
      experience: Number,
      education: Number,
      cultureFit: Number,
    },
    matchedSkills: [String],
    missingSkills: [String],
    summary: String,
    redFlags: [String],
  }
  ```

### Profile Module Context
- **CV Parsing**: AI Screening now directly utilizes `profile.resume.parsedData.skills` from the Candidate's profile as a fallback if the candidate applies using the Quick Apply feature without a newly uploaded PDF. 

---

## 3. How to Consume the AI Screening API (Frontend Guide)

Because screening happens asynchronously in the background, the frontend must account for the `"pending"` state.

### Fetching Applications for a Job (Employer View)
When an employer views the applicants for their job, you will call:
`GET /api/v1/applications/job/:jobId`

The response will contain an array of `Application` objects. You should display the AI screening progress to the employer based on the `aiScreening.status` field.

### Suggested Frontend Polling Implementation
If the status is `"pending"`, the frontend should poll the endpoint every few seconds until it completes.

```javascript
import { useEffect, useState } from 'react';

function ApplicationCard({ application }) {
    const [screenStatus, setScreenStatus] = useState(application.aiScreening.status);

    // Poll every 5 seconds if status is pending
    useEffect(() => {
        let interval;
        if (screenStatus === 'pending') {
            interval = setInterval(async () => {
                const response = await fetch(`/api/v1/applications/${application._id}`);
                const data = await response.json();
                
                if (data.application.aiScreening.status !== 'pending') {
                    setScreenStatus(data.application.aiScreening.status);
                    clearInterval(interval);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [screenStatus, application._id]);

    // 1. Render Loading State
    if (screenStatus === "pending") {
        return <div className="spinner">AI is actively analyzing this resume...</div>;
    }

    // 2. Render Failure State
    if (screenStatus === "failed") {
        return <div className="alert alert-error">AI Screening failed to process this resume.</div>;
    }

    // 3. Render Success State!
    return (
        <div className="application-card">
            <h3>Overall Match: {application.aiScreening.overallScore}%</h3>
            <p><strong>Summary:</strong> {application.aiScreening.summary}</p>
            
            <div className="skills">
                <h4>Matched Skills</h4>
                <ul>
                    {application.aiScreening.matchedSkills.map(s => <li key={s}>{s}</li>)}
                </ul>
                
                <h4>Missing Skills</h4>
                <ul>
                    {application.aiScreening.missingSkills.map(s => <li key={s}>{s}</li>)}
                </ul>
            </div>
        </div>
    );
}
```

### Candidate View (Quick Apply)
When a candidate presses "Quick Apply", the endpoint `POST /api/v1/applications/quick-apply` is called.
Since the endpoint returns `201 Created` instantly, the candidate UI should immediately show a success message like *"Application Submitted! Your profile is currently being reviewed by our AI system."*

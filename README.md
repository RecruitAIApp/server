<div align="center">
  <h1>🚀 RecruitAI - Intelligent Backend API Server</h1>
  <p><strong>Next-Generation Applicant Tracking & AI-Driven Talent Acquisition System</strong></p>
</div>

> [!NOTE]
> **This is the Backend (Server) side of the RecruitAI full-stack application.**
> - 🖥️ **Backend Repository:** [RecruitAIApp/server](https://github.com/RecruitAIApp/server)
> - 🎨 **Frontend Repository:** [RecruitAIApp/client](https://github.com/RecruitAIApp/client)

---

## 🌟 The Core Idea: What is RecruitAI?

**RecruitAI** was built to solve a critical problem in modern hiring: **Information Overload**. Recruiters often receive hundreds or thousands of CVs for a single position, making it impossible to evaluate every candidate thoroughly and fairly. 

RecruitAI acts as a **copilot for HR professionals**. Instead of just storing resumes like a traditional ATS (Applicant Tracking System), RecruitAI actively **reads, comprehends, and scores** every applicant in the background. It maps candidates against specific job requirements using advanced LLMs (Large Language Models) and semantic search, allowing recruiters to instantly see the top 10% of candidates sorted by compatibility score. 

Simultaneously, it offers a seamless experience for candidates, providing real-time chats with HR, push notifications for application status updates, and automated email workflows.

---

## 🚀 Key Features & Implementation Details

Here is a deep dive into the features that power RecruitAI, the technologies behind them, and how they are implemented.

### 1. 🤖 Asynchronous AI Screening Engine
The crown jewel of RecruitAI is its automated CV screening pipeline. Processing heavy PDF files and pinging LLMs can take seconds or even minutes, which would normally crash a Node.js server.
- **How it works:** When a candidate applies, the API immediately responds with a success message and pushes the candidate's CV data into a background queue. Dedicated worker processes pick up these tasks, parse the CV text, and send it to an LLM to evaluate strengths, weaknesses, and a match score (0-100) based on the job description.
- **Technologies Used:** 
  - **BullMQ & Redis:** Handles the robust, reliable queueing system.
  - **pdf-parse & multer:** Extracts raw text from uploaded candidate resumes.
  - **LangChain & LangGraph:** Orchestrates the complex prompts and chains sent to the AI.
  - **Groq & Google GenAI (Gemini):** The LLMs that perform the actual reasoning and text analysis.

### 2. 🎯 Semantic Job Matching & Recommendations
Traditional search relies on exact keyword matching. RecruitAI uses **Vector Similarity Search** to recommend jobs to candidates (and candidates to jobs) based on the *meaning* of their experience.
- **How it works:** Candidate profiles and Job Descriptions are converted into mathematical vectors (embeddings) by an LLM. When a user requests recommendations, the system queries the vector database for the closest mathematical matches in multi-dimensional space, surfacing highly relevant results even if exact keywords don't match.
- **Technologies Used:**
  - **Pinecone:** A blazing-fast, serverless Vector Database used to store and query high-dimensional embeddings.
  - **LangChain (Pinecone integration):** Bridges our Node.js server with the Pinecone index.

### 3. ⚡ Real-Time Communications (Chat & Notifications)
Hiring moves fast. RecruitAI enables real-time messaging between candidates and HR regarding specific job applications, as well as instant push notifications.
- **How it works:** Persistent WebSocket connections are established when a user logs in. If a recruiter messages a candidate, or if a candidate's application status is updated (e.g., moved to "Shortlisted"), the server emits a real-time event directly to the client UI.
- **Technologies Used:**
  - **Socket.io:** Handles bi-directional, real-time event-based communication.
  - **Express Integration:** Socket instances are shared with the Express `app` object to allow REST endpoints to trigger WebSocket emissions.

### 4. 🔄 Automated Application Pipelines (Kanban)
Recruiters manage candidates on a Kanban board (Applied ➔ Shortlisted ➔ Interview Scheduled ➔ Offer Sent ➔ Hired/Rejected). 
- **How it works:** Updating a candidate's status via a REST `PUT` request updates the MongoDB document and simultaneously triggers background side-effects.
- **Technologies Used:**
  - **Mongoose / MongoDB:** Document-oriented storage perfect for complex, nested application states.
  - **Nodemailer:** Automatically dispatches branded, formatted HTML emails to candidates notifying them of their status change.

### 5. 🔐 Role-Based Access Control & Security
Security is paramount when handling PII (Personally Identifiable Information) like resumes and contact details.
- **How it works:** Routes are protected by middleware that decodes tokens and checks user roles (`candidate`, `recruiter`, `admin`).
- **Technologies Used:**
  - **jsonwebtoken (JWT):** Stateless authentication via signed tokens.
  - **bcryptjs:** Hashes passwords with salt before storing them in MongoDB.
  - **Zod & Joi:** Strict runtime validation of incoming request bodies to prevent NoSQL injection and malformed data crashes.
  - **Helmet & CORS:** Secures HTTP headers and enforces strict cross-origin resource sharing rules.

---

## 🗄️ Database Entity Relationship

Our MongoDB database is structured to support complex relationships efficiently:
- **`Users`**: The core authentication entity. Can be linked to either a `Profile` (Candidate) or a `Company` (Recruiter).
- **`Companies`**: Holds recruiter details, branding, and billing info.
- **`Jobs`**: Created by Companies, contains requirements, embeddings (for Pinecone sync), and active status.
- **`Applications`**: The junction between `Users` and `Jobs`. This entity is heavy, storing the uploaded CV link, AI matching score (0-100), detailed AI feedback (strengths/weaknesses), and the Kanban status.

---

## 🏎️ Performance Optimizations

To ensure RecruitAI can scale to thousands of concurrent users and applications, several optimizations have been engineered into the backend:

1. **Event Loop Protection (Offloading):** By utilizing **BullMQ workers**, CPU-intensive tasks (like parsing large PDFs and waiting for LangChain API calls) are entirely offloaded from the main Node.js thread. This ensures API response times remain under 50ms for basic requests.
2. **Database Indexing:** Mongoose schemas employ compound indexes on frequently queried fields (e.g., `companyId`, `status`, `jobId`). This turns O(N) linear database scans into O(log N) operations, drastically speeding up dashboard loading times.
3. **Rate Limiting:** `express-rate-limit` is implemented on public routes (like login and registration) to prevent Brute Force attacks and API abuse, preserving server bandwidth.
4. **Connection Pooling:** The MongoDB and Redis connections utilize optimal pooling strategies to reuse existing TCP connections, reducing latency on subsequent database queries.

---

## 🔌 API Usage Examples

Here is a quick glimpse of how clean the API surface is.

**Applying to a Job (Candidate Route):**
```bash
curl -X POST http://localhost:5001/api/v1/applications/apply \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "jobId=65a123bcdef..." \
  -F "resume=@/path/to/my_resume.pdf"
```
*Returns HTTP 202 Accepted. The AI screening begins in the background immediately.*

**Fetching AI Recommendations (Recruiter Route):**
```bash
curl -X GET "http://localhost:5001/api/recommendations/candidates?jobId=65a123bcdef..." \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```
*Returns a JSON array of candidates sorted by Pinecone vector similarity distance.*

---

## 🛠️ Complete Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Core** | Node.js (v24), Express.js (v5) | Server runtime and HTTP routing |
| **Database** | MongoDB, Mongoose | Primary data storage (NoSQL) |
| **Vector DB** | Pinecone | Storing AI embeddings for semantic search |
| **Queueing** | Redis, BullMQ | Background job processing |
| **AI / LLMs** | LangChain, Groq, Google GenAI | Intelligent text processing and evaluation |
| **Real-Time** | Socket.io | WebSockets for Chat & Notifications |
| **Security** | JWT, Bcrypt, Helmet, CORS | Auth and HTTP protection |
| **Validation** | Zod, Joi | Request body/params type checking |
| **Testing** | Vitest, Supertest | Unit & E2E API Testing |
| **Utilities** | Multer, pdf-parse, Nodemailer | File uploads, PDF text extraction, Emailing |

---

## 📂 Architecture Directory Structure

```text
server/
├── ⚙️ config/              # Infrastructure setup (DB, Redis, Socket)
├── 📁 src/
│   ├── 🧩 common/          # Shared Middlewares (Auth check, Error handler)
│   ├── 📦 modules/         # Domain-Driven Modules (The Core Logic)
│   │   ├── 🔐 auth/        # Registration, Login, Token generation
│   │   ├── 💼 jobs/        # Job posting & querying 
│   │   ├── 📄 applications/# Status tracking & CV submission
│   │   ├── 💬 job-chat/    # Socket.io chat handlers & REST history
│   │   ├── 👑 admin/       # System-wide metrics and control
│   │   └── 🎯 recommendations/ # Pinecone vector search matching
│   ├── 🛤️ routes/          # Aggregated API routes
│   ├── 🌱 seed/            # Mock data generation for local dev
│   ├── 🧪 tests/           # Unit and Integration test suites
│   └── 👷 workers/         # BullMQ queue consumers for AI
├── 📝 app.js               # Express middleware & router aggregation
└── 🚀 server.js            # Node HTTP server & DB startup logic
```

---

## ⚙️ Setup & Installation

**Prerequisites:** 
- Node.js (v24+)
- Docker (for Redis, optional but recommended)
- MongoDB instance (local or Atlas)

1. **Clone & Install:**
   ```bash
   git clone https://github.com/RecruitAIApp/server.git
   cd server
   npm install
   ```

2. **Environment Variables (`.env`):**
   ```env
   PORT=5001
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGO_URI=mongodb://localhost:27017/recruitai
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   JWT_SECRET=super_secret_key
   # AI Keys
   GROQ_API_KEY=your_key
   PINECONE_API_KEY=your_key
   ```

3. **Start Services:**
   We provide handy NPM scripts to spin up dependencies:
   ```bash
   npm run redis  # Starts a Redis instance via Docker
   ```

4. **Launch Server & Workers:**
   ```bash
   npm run dev:all
   ```
   *Note: `dev:all` uses `concurrently` to boot the main Express server alongside the AI queue workers in parallel.*

---

## 🧪 Testing & Code Quality

We utilize **Vitest** for blazing fast unit testing, combined with **Supertest** to simulate HTTP requests against our Express routes without needing a live network layer.
```bash
# Run the test suite
npm run test
```

---

## 🤝 Contributing

We welcome contributions! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.
Ensure your code passes all linting (`npm run lint`) and tests (`npm run test`) before submitting.

---

<div align="center">
  <i>Built to revolutionize hiring. 🚀 Engineered for performance, scale, and intelligence.</i>
</div>
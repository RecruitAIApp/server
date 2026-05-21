# RecruitAI - Backend API Server 🖥️

This is the Node.js/Express backend service for RecruitAI. It handles API requests, database modeling, authentication, business logic validation, and manages the asynchronous AI screening queue using BullMQ.

---

## 🛠️ Stack & Dependencies
- **Node.js (v24+)** with native ES Modules
- **Express.js (v5)** for API routing
- **MongoDB & Mongoose** for data storage
- **Redis & BullMQ** for background job queues
- **Joi** for request body validation
- **Helmet & CORS** for HTTP header security
- **jsonwebtoken (JWT)** & **bcryptjs** for authentication

---

## 📂 Project Directory Structure
The server follows a **modular architecture** where each feature module groups its controllers, models, validations, and routes together:

```
server/
├── config/              # Server configuration loaders
│   ├── db.config.js     # Mongoose connection setup
│   ├── redis.config.js  # Redis connection configuration
│   └── index.js         # Centralized environment variable loader
├── src/
│   ├── common/          # Shared components
│   │   └── middlewares/ # Express middlewares (Auth, validation, error handler)
│   ├── modules/         # Modular business domains
│   │   ├── auth/        # User accounts, registration, login
│   │   ├── jobs/        # Job listing lifecycle management
│   │   └── applications/# Job applications & AI screening
│   └── workers/         # Background processing jobs (BullMQ queue workers)
├── .env                 # Environment variables (git-ignored)
├── .env.example         # Template for environment variables
├── app.js               # Express application initialization & middleware setup
├── server.js            # Entry point (DB connection & HTTP server startup)
└── package.json         # Project manifests and scripts
```

---

## ⚙️ Environment Configuration
Create a `.env` file in the root of the `/server` directory:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/recruitai
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Ensure Redis & MongoDB are running:**
   ```bash
   # Verify Redis server is active
   redis-cli ping
   ```

3. **Start the API server (Development Mode):**
   ```bash
   npm run dev
   ```
   *The server runs with `node --watch` for hot-reloading on changes.*

---

## 🛣️ API Routes & Endpoints

### 🔐 Authentication (`/api/v1/auth`)
- `POST /register` - Registers a new candidate or recruiter.
- `POST /login` - Logins user and returns JWT.
- `GET /me` - *(Protected)* Gets details of the logged-in user.

### 💼 Jobs (`/api/v1/jobs`)
- `GET /` - Public job search & list with filters.
- `GET /:id` - Public detailed view of a job listing.
- `POST /` - *(Recruiter/Admin)* Creates a new job.
- `PUT /:id` - *(Recruiter owner)* Updates a job listing.
- `DELETE /:id` - *(Recruiter owner/Admin)* Deletes a job.

### 📄 Applications (`/api/v1/applications`)
- `POST /apply` - *(Candidate)* Submits a resume text copy to a job. Enqueues a job analysis process in BullMQ.
- `GET /` - *(Recruiter/Admin)* Lists all job applications (with filter parameters).
- `GET /my-applications` - *(Candidate)* Lists applications submitted by the logged-in candidate.
- `PUT /:id/status` - *(Recruiter/Admin)* Changes application stage (Kanban board: Applied ➔ Shortlisted ➔ Interview Scheduled ➔ Offer Sent ➔ Hired / Rejected). Triggers automated status emails.

---

## 🤖 AI Smart Screening Queue (BullMQ)
When a candidate applies to a job:
1. The **Application Controller** saves the application with status `applied`.
2. A background screening job is enqueued in Redis under the `screening-queue`.
3. The **Background Worker** (`/src/workers/background.worker.js`) processes the queue:
   - Evaluates the CV text copy against the Job Requirements.
   - Calculates a semantic matching compatibility score (0-100).
   - Identifies candidate strengths, areas of improvement, and potential red flags.
   - Updates the Application record in MongoDB with the score and actionable feedback.
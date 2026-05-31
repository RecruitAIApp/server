// import EmployerProfile from "../../modules/auth/employerProfile.model.js";
// import Company from "../../modules/company/company.model.js";

// /**
//  * Loads employer profile + company for the authenticated employer user.
//  * Sets req.employerProfile and req.company (may be null for HR not yet assigned).
//  */
// export const loadEmployerContext = async (req, res, next) => {
//   try {
//     if (!req.user?.id) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required.",
//       });
//     }

//     if (req.user.role !== "employer") {
//       return res.status(403).json({
//         success: false,
//         message: "Employer account required.",
//       });
//     }

//     const employerProfile = await EmployerProfile.findOne({
//       userId: req.user.id,
//     });

//     let company = null;
//     if (employerProfile?.companyId) {
//       company = await Company.findById(employerProfile.companyId);
//     }

//     req.employerProfile = employerProfile;
//     req.company = company;
//     next();
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message || "Failed to load company context.",
//     });
//   }
// };

// /** Company owner only (manage company, invite HRs). */
// export const requireCompanyOwner = (req, res, next) => {
//   if (!req.employerProfile || req.employerProfile.role !== "owner") {
//     return res.status(403).json({
//       success: false,
//       message: "Company owner access required.",
//     });
//   }

//   if (!req.company) {
//     return res.status(403).json({
//       success: false,
//       message: "Company not found. Complete company onboarding first.",
//     });
//   }

//   if (req.company.owner.toString() !== req.user.id) {
//     return res.status(403).json({
//       success: false,
//       message: "You do not own this company.",
//     });
//   }

//   next();
// };

// /** Company owner or assigned HR (jobs, applications, kanban). */
// export const requireCompanyMember = (req, res, next) => {
//   if (!req.employerProfile) {
//     return res.status(403).json({
//       success: false,
//       message: "No company membership. Join or create a company first.",
//     });
//   }

//   if (!req.company) {
//     return res.status(403).json({
//       success: false,
//       message: "Company membership required.",
//     });
//   }

//   const userId = req.user.id;
//   const isOwner =
//     req.employerProfile.role === "owner" &&
//     req.company.owner.toString() === userId;
//   const isHr =
//     req.employerProfile.role === "hr" &&
//     req.company.HRs.some((id) => id.toString() === userId);

//   if (!isOwner && !isHr) {
//     return res.status(403).json({
//       success: false,
//       message: "You are not a member of this company.",
//     });
//   }

//   next();
// };

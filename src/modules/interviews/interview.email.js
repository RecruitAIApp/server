import { sendEmail } from "../../utils/email.js";

const formatDateTime = (dateString, timezone) => {
  try {
    const date = new Date(dateString);
    const dateFormatted = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeFormatted = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { dateFormatted, timeFormatted };
  } catch (error) {
    return { dateFormatted: dateString, timeFormatted: "" };
  }
};

const getCommonStyle = () => `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #333333;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
`;

const getHeaderStyle = (color) => `
  background-color: ${color};
  color: white;
  padding: 15px 20px;
  border-radius: 6px 6px 0 0;
  margin: -20px -20px 20px -20px;
  text-align: center;
`;

export const sendInterviewScheduledEmail = async ({
  to,
  candidateName,
  companyName,
  jobTitle,
  interviewDate,
  duration,
  timezone,
  interviewType,
  meetingLink,
  location,
  notes,
}) => {
  const { dateFormatted, timeFormatted } = formatDateTime(interviewDate, timezone);
  const locationOrLink = interviewType === "online" 
    ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank" style="color: #4f46e5; text-decoration: underline;">Join Interview</a></p>`
    : `<p><strong>Location:</strong> ${location || "To be decided"}</p>`;

  const html = `
    <div style="${getCommonStyle()}">
      <div style="${getHeaderStyle("#4f46e5")}">
        <h2 style="margin: 0;">Interview Scheduled</h2>
      </div>
      <p>Dear ${candidateName},</p>
      <p>Congratulations! An interview has been scheduled for your application to the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4f46e5;">
        <h3 style="margin-top: 0; color: #4f46e5;">Interview Details</h3>
        <p><strong>Date:</strong> ${dateFormatted}</p>
        <p><strong>Time:</strong> ${timeFormatted} (${timezone})</p>
        <p><strong>Duration:</strong> ${duration} minutes</p>
        <p><strong>Interview Type:</strong> ${interviewType.toUpperCase()}</p>
        ${locationOrLink}
      </div>

      ${notes ? `<p><strong>Special Instructions / Notes:</strong></p><blockquote style="border-left: 3px solid #d1d5db; padding-left: 10px; margin-left: 0; color: #555;">${notes}</blockquote>` : ""}
      
      <p>Please make sure to join/arrive on time. If you have any questions or need to reschedule, please contact the recruiter via the application platform.</p>
      <p>Best regards,<br/><strong>${companyName} Hiring Team</strong></p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Interview Scheduled: ${jobTitle} at ${companyName}`,
    html,
  });
};

export const sendInterviewRescheduledEmail = async ({
  to,
  candidateName,
  companyName,
  jobTitle,
  interviewDate,
  duration,
  timezone,
  interviewType,
  meetingLink,
  location,
  notes,
}) => {
  const { dateFormatted, timeFormatted } = formatDateTime(interviewDate, timezone);
  const locationOrLink = interviewType === "online" 
    ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank" style="color: #f59e0b; text-decoration: underline;">Join Interview</a></p>`
    : `<p><strong>Location:</strong> ${location || "To be decided"}</p>`;

  const html = `
    <div style="${getCommonStyle()}">
      <div style="${getHeaderStyle("#f59e0b")}">
        <h2 style="margin: 0;">Interview Rescheduled</h2>
      </div>
      <p>Dear ${candidateName},</p>
      <p>Please note that your interview for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been rescheduled. Below are the updated details:</p>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="margin-top: 0; color: #f59e0b;">New Interview Details</h3>
        <p><strong>Date:</strong> ${dateFormatted}</p>
        <p><strong>Time:</strong> ${timeFormatted} (${timezone})</p>
        <p><strong>Duration:</strong> ${duration} minutes</p>
        <p><strong>Interview Type:</strong> ${interviewType.toUpperCase()}</p>
        ${locationOrLink}
      </div>

      ${notes ? `<p><strong>Special Instructions / Notes:</strong></p><blockquote style="border-left: 3px solid #d1d5db; padding-left: 10px; margin-left: 0; color: #555;">${notes}</blockquote>` : ""}
      
      <p>We apologize for any inconvenience caused and look forward to speaking with you.</p>
      <p>Best regards,<br/><strong>${companyName} Hiring Team</strong></p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Interview Rescheduled: ${jobTitle} at ${companyName}`,
    html,
  });
};

export const sendInterviewCancelledEmail = async ({
  to,
  candidateName,
  companyName,
  jobTitle,
  notes,
}) => {
  const html = `
    <div style="${getCommonStyle()}">
      <div style="${getHeaderStyle("#ef4444")}">
        <h2 style="margin: 0;">Interview Cancelled</h2>
      </div>
      <p>Dear ${candidateName},</p>
      <p>We regret to inform you that the interview scheduled for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been cancelled.</p>
      
      ${notes ? `<p><strong>Cancellation Reason / Notes:</strong></p><blockquote style="border-left: 3px solid #ef4444; padding-left: 10px; margin-left: 0; color: #ef4444;">${notes}</blockquote>` : ""}
      
      <p>If you have any questions, please feel free to reach out to our team directly through the candidate portal.</p>
      <p>Best regards,<br/><strong>${companyName} Hiring Team</strong></p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Interview Cancelled: ${jobTitle} at ${companyName}`,
    html,
  });
};

export const sendPrepGuideReadyEmail = async ({
  to,
  candidateName,
  companyName,
  jobTitle,
}) => {
  const html = `
    <div style="${getCommonStyle()}">
      <div style="${getHeaderStyle("#10b981")}">
        <h2 style="margin: 0;">Preparation Guide Ready</h2>
      </div>
      <p>Dear ${candidateName},</p>
      <p>We are excited to help you prepare for your upcoming interview for the <strong>${jobTitle}</strong> role at <strong>${companyName}</strong>!</p>
      <p>Our AI-powered Interview Coach has prepared a personalized preparation guide for you, including expected questions, skill gap analysis, and study recommendations tailored to your profile and the role.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/my-interviews" style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Preparation Guide</a>
      </div>
      
      <p>Best of luck with your preparation!</p>
      <p>Best regards,<br/><strong>MASAR AI Team</strong></p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Interview Preparation Guide Ready: ${jobTitle} at ${companyName}`,
    html,
  });
};

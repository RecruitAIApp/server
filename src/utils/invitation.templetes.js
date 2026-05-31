export const buildAddedDirectlyEmail = ({ inviterName, company }) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px;
    margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px;
    background-color: #ffffff;">
    <h2 style="color: #2563eb; text-align: center; margin-bottom: 24px; font-weight: 700;">
      MASAR Recruiter — You've Been Added to a Team
    </h2>
    <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hello,</p>
    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
      <strong>${inviterName}</strong> has added you to <strong>${company.name}</strong>
      as an HR team member on MASAR Recruiter.
    </p>
    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
      You can now log in to your existing account to access the company dashboard
      and start managing job listings and applications.
    </p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login"
        style="background-color: #2563eb; color: #ffffff; padding: 14px 28px;
          text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
          display: inline-block;">
        Go to Dashboard
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      MASAR Recruiter &copy; 2026. All rights reserved.
    </p>
  </div>
`;

export const buildInvitationEmail = ({ inviterName, company, inviteUrl, expiresAt }) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px;
    margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px;
    background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #2563eb; text-align: center; margin-bottom: 24px; font-weight: 700;">
      MASAR Recruiter — Team Invitation
    </h2>
    <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hello,</p>
    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
      <strong>${inviterName}</strong> has invited you to join <strong>${company.name}</strong>
      as an HR team member on MASAR Recruiter.
    </p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${inviteUrl}"
        style="background-color: #2563eb; color: #ffffff; padding: 14px 28px;
          text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
          display: inline-block;">
        Accept Invitation
      </a>
    </div>
    <p style="font-size: 14px; color: #e11d48; font-weight: 500; margin-top: 20px; text-align: center;">
      ⚠️ This invitation expires on ${expiresAt.toLocaleString()}.
    </p>
    <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-top: 30px;">
      If the button above does not work, copy and paste this link into your browser:
    </p>
    <p style="word-break: break-all; color: #2563eb; font-size: 14px;
      background-color: #f8fafc; padding: 12px; border-radius: 6px;">
      ${inviteUrl}
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      MASAR Recruiter &copy; 2026. All rights reserved.
    </p>
  </div>
`;
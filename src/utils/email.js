import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
  if (process.env.NODE_ENV === "test") {
    console.log("Test mode: Skipping real email send to", to);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      pool: false,
    });

    const info = await transporter.sendMail({
      from: `"Naqla Recruiter" <${[process.env.EMAIL_USER]}> `,
      to,
      subject,
      html,
    });

    if (info.rejected.length > 0) return false;
    console.log("Email sent successfully:", info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};

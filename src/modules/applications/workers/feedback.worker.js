import { Worker } from 'bullmq';
import { redisConnection } from '../../../config/redis.config.js';
import { feedbackAgent } from '../agents/feedback.agent.js';
import { sendEmail } from '../../../utils/email.js';

export const feedbackWorker = new Worker('FEEDBACK_QUEUE', async (job) => {
  const { applicationId, hrNotes } = job.data;
  console.log(`[Feedback Worker] Job ${job.id} started processing for Application: ${applicationId}`);
  
  try {
    const finalState = await feedbackAgent.invoke({
      applicationId: applicationId,
      hrNotes: hrNotes
    });

    console.log(`[Feedback Worker] Job ${job.id} Completed successfully! Email drafted via LLM.`);

    if (!finalState.candidateEmail || !finalState.candidateEmail.includes('@')) {
      console.warn(`[Feedback Worker] Job ${job.id} skipped: Candidate email is missing or invalid (${finalState.candidateEmail}).`);
      return {
        success: false,
        message: "Skipped: Candidate email is missing or invalid."
      };
    }

    const emailHtml = finalState.generatedEmail.replace(/\n/g, '<br/>');

    const subject = finalState.decision === 'rejected'
      ? `Feedback regarding your application for ${finalState.jobTitle}`
      : `Congratulations! Update on your application for ${finalState.jobTitle}`;

    const emailSent = await sendEmail({
      to: finalState.candidateEmail,
      subject: subject,
      html: emailHtml
    });

    if (emailSent) {
      console.log(`[Feedback Worker] Email successfully sent to ${finalState.candidateEmail}`);
    } else {
      console.warn(`[Feedback Worker] Failed to send email to ${finalState.candidateEmail}. Please check your EMAIL_USER and EMAIL_PASS configuration in .env.`);
    }
  
    return {
      success: true,
      emailSent,
      candidateEmail: finalState.candidateEmail,
      message: "Constructive feedback email generated and processed."
    };
  } catch (error) {
    console.error(`[Feedback Worker] Job ${job.id} failed:`, error);
    throw error;
  }

}, { connection: redisConnection });


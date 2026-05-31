import Application from './application.model.js';
import { aiAutomationQueue } from '../../config/queues.js';

export const applyToJob = async (applicationData) => {
  const { candidateId, companyId, jobId, appliedResume, coverLetter } = applicationData;

  const existingApplication = await Application.findOne({
    jobId,
    candidateId

  })

  if (existingApplication) {
    const error = new Error("You've already applied to this job");
    error.statusCode = 409;
    throw error;
  }

  const newApplication = await Application.create({
    candidateId,
    companyId,
    jobId,
    appliedResume,
    coverLetter,
    stage: {
      key: 'applied',
      changedAt: Date.now(),
      changedBy: candidateId,
    },
    aiScreening: {
      status: 'queued',
    },
    timeline: [{
      type: 'STATUS_CHANGED',
      actorId: candidateId,
      metadata: {
        from: null,
        to: 'applied',
      },
      createdAt: Date.now(),
    }]
  });

  try {
    if(aiAutomationQueue) {
      await aiAutomationQueue.add("PROCESS_SCREENING",{
        applicationId: newApplication._id,
        jobId: newApplication.jobId,
        cvUrl: appliedResume.url
      })
    }
    
  } catch (error) {
    console.error('⚠️ BullMQ Error but application saved:', error.message);
  }

  return newApplication;
}


export const updateApplicationStage = async (applicationId, stageData) => {
  const { stage, notes, actorId } = stageData;

  const currentApplication = await Application.findById(applicationId);
  if(!currentApplication) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  const fromStage = currentApplication.stage.key;
  currentApplication.stage.key = stage.key;
  currentApplication.stage.changedBy = actorId;
  currentApplication.stage.changedAt = Date.now();

  if(notes && notes.trim() !== "") {
    currentApplication.notes.push({
      authorId: actorId,
      content: notes,
      createdAt: Date.now(),
    });
  }

  currentApplication.timeline.push({
    type: 'STATUS_CHANGED',
    actorId: actorId,
    metadata: { from: fromStage, to: stage.key },
    createdAt: new Date(),
  });

  await currentApplication.save();
  return currentApplication;
}
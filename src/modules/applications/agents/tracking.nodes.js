import { AppError } from '../../../utils/error.js';
import Application from '../application.model.js';

/**
 * 
 * @param {*} state 
 * @returns 
 */
export const fetchApplicationDataNode = async(state) => {
  const { applicationId } = state;

  const application = await Application.findById(applicationId);

  if(!application) {
    throw new AppError(`Application with ID ${applicationId} not found in DB`, 404);
  }

  console.log(`Application with ID ${applicationId} fetched successfully`);

  return {
    overallScore: application.aiScreening?.overallScore || 0,
    redFlags: application.aiScreening?.redFlags || [],
    currentStage: application.stage?.key || 'applied'
  };
}

export const evaluateRulesAndUpdateDBNode = async (state) => {
  const { applicationId, overallScore, redFlags, currentStage } = state;
  let screeningStatus = 'completed';
  let nextStage = currentStage;

  if (overallScore >= 85) {
    nextStage = 'shortlisted';
  } else if (overallScore <= 40 || redFlags.length > 0) {
    nextStage = 'applied';
    screeningStatus = 'under_review';
  } else {
    console.log(`[Node 2] No stage change required for Application ${applicationId}.`);
  }

  const updateFields = {
    $set: { 
      'stage.key': nextStage,
      'aiScreening.status': screeningStatus,
      'stage.changedAt': new Date(),
    }
  };

  // If the stage changed, add a timeline entry for auditing
  if (nextStage !== currentStage) {
    const timelineEntry = {
      type: 'STATUS_CHANGED',
      actorId: null, // Null indicates system/AI action
      metadata: {
        from: currentStage,
        to: nextStage,
        notes: 'Stage automatically updated by AI Tracking Agent'
      },
      createdAt: new Date()
    };
    updateFields.$push = { timeline: timelineEntry };
  }

  await Application.findByIdAndUpdate(applicationId, updateFields);

  console.log(`[Tracking Agent] App ${applicationId} evaluated. Stage: ${nextStage}, AI Screening Status: ${screeningStatus}`);

  return {
    nextStage: nextStage
  };
}
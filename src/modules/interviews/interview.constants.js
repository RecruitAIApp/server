export const INTERVIEW_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  RESCHEDULED: "rescheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const INTERVIEW_TYPE = Object.freeze({
  ONLINE: "online",
  ONSITE: "onsite",
  PHONE: "phone",
});

export const INTERVIEW_STATUSES = Object.values(INTERVIEW_STATUS);
export const INTERVIEW_TYPES = Object.values(INTERVIEW_TYPE);

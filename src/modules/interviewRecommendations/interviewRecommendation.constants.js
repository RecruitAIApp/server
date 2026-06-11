export const CACHE_PREFIX = "interview_recommendation";
export const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

export const getCacheKey = (applicationId) => `${CACHE_PREFIX}:${applicationId}`;

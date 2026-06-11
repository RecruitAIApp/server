import { redisConnection } from "../../config/redis.config.js";
import { getCacheKey, CACHE_TTL } from "./interviewRecommendation.constants.js";

/**
 * Get recommendations from Redis cache
 */
export const getCachedRecommendation = async (applicationId) => {
  try {
    const key = getCacheKey(applicationId);
    const cachedData = await redisConnection.get(key);
    if (cachedData) {
      console.log(`[Cache] Cache hit for recommendations: ${key}`);
      return JSON.parse(cachedData);
    }
    console.log(`[Cache] Cache miss for recommendations: ${key}`);
    return null;
  } catch (error) {
    console.error(`[Cache] Error retrieving cache: ${error.message}`);
    return null;
  }
};

/**
 * Save recommendations to Redis cache
 */
export const setCachedRecommendation = async (applicationId, data) => {
  try {
    const key = getCacheKey(applicationId);
    await redisConnection.set(key, JSON.stringify(data), "EX", CACHE_TTL);
    console.log(`[Cache] Successfully cached recommendations for 24 hours: ${key}`);
  } catch (error) {
    console.error(`[Cache] Error setting cache: ${error.message}`);
  }
};

/**
 * Remove recommendations from Redis cache
 */
export const deleteCachedRecommendation = async (applicationId) => {
  try {
    const key = getCacheKey(applicationId);
    await redisConnection.del(key);
    console.log(`[Cache] Evicted recommendations from cache: ${key}`);
  } catch (error) {
    console.error(`[Cache] Error deleting cache: ${error.message}`);
  }
};

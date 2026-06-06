import { getRecommendationsForCandidate } from "./recommendation.service.js";

/**
 * Controller to handle recommendation requests for the currently logged-in candidate.
 * 
 * Route: GET /api/recommendations/me
 */
export async function getRecommendations(req, res, next) {
  try {
    const userId = req.user.id; // Populated by 'authenticate' middleware
    
    const {
      location,
      employmentType,
      seniority,
      limit,
      rerank
    } = req.query;

    // Parse options with query parameter fallbacks and types
    const options = {
      location: location ? String(location).trim() : undefined,
      employmentType: employmentType ? String(employmentType).trim() : undefined,
      seniority: seniority ? String(seniority).trim() : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      rerank: rerank === "false" ? false : true // Default is true unless explicitly "false"
    };

    const response = await getRecommendationsForCandidate(userId, options);

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
}

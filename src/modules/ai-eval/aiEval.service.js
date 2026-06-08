import AIEval from "./aiEval.model.js";

/**
 * Save one evaluation result
 * Called by your LangGraph agents after each AI run
 */
export const saveEvalResultService = async (data) => {
  const {
    agentName,
    inputSnapshot,
    outputSnapshot,
    isValidJSON,
    schemaValid,
    hallucinationScore,
    qualityScore,
    failureReason,
    referenceId,
  } = data;

  // Auto-determine pass/fail
  const status =
    isValidJSON &&
    schemaValid &&
    (hallucinationScore === null || hallucinationScore < 0.5)
      ? "pass"
      : "fail";

  const evalResult = await AIEval.create({
    agentName,
    inputSnapshot,
    outputSnapshot,
    isValidJSON,
    schemaValid,
    hallucinationScore: hallucinationScore ?? null,
    qualityScore: qualityScore ?? null,
    status,
    failureReason: failureReason ?? null,
    referenceId: referenceId ?? null,
  });

  return evalResult;
};

/**
 * Get aggregated summary metrics
 * Used for: AI monitoring dashboard charts
 */
export const getEvalSummaryService = async (agentName, days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const match = { createdAt: { $gte: startDate } };
  if (agentName) match.agentName = agentName;

  const [overview, byDay, byAgent] = await Promise.all([
    // Overall pass/fail counts + avg scores
    AIEval.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ["$status", "pass"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "fail"] }, 1, 0] } },
          avgQualityScore: { $avg: "$qualityScore" },
          avgHallucinationScore: { $avg: "$hallucinationScore" },
          invalidJSON: { $sum: { $cond: ["$isValidJSON", 0, 1] } },
          schemaFailures: { $sum: { $cond: ["$schemaValid", 0, 1] } },
        },
      },
    ]),

    // Pass/fail counts per day — for LineChart
    AIEval.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]),

    // Breakdown per agent
    AIEval.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$agentName",
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ["$status", "pass"] }, 1, 0] } },
          avgQuality: { $avg: "$qualityScore" },
        },
      },
    ]),
  ]);

  return {
    overview: overview[0] || {
      total: 0,
      passed: 0,
      failed: 0,
      avgQualityScore: null,
      avgHallucinationScore: null,
      invalidJSON: 0,
      schemaFailures: 0,
    },
    byDay: byDay.map((r) => ({
      date: r._id.date,
      status: r._id.status,
      count: r.count,
    })),
    byAgent: byAgent.map((r) => ({
      agent: r._id,
      total: r.total,
      passed: r.passed,
      passRate: r.total > 0 ? Math.round((r.passed / r.total) * 100) : 0,
      avgQuality: r.avgQuality ? Math.round(r.avgQuality * 10) / 10 : null,
    })),
  };
};

/**
 * Get list of failed evaluations
 * Used for: Failures table in monitoring dashboard
 */
export const getEvalFailuresService = async (
  agentName,
  page = 1,
  limit = 10,
) => {
  const filter = { status: "fail" };
  if (agentName) filter.agentName = agentName;

  const skip = (page - 1) * limit;

  const [failures, total] = await Promise.all([
    AIEval.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AIEval.countDocuments(filter),
  ]);

  return {
    failures,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

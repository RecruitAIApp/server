/**
 * Builds a MongoDB filter object from query params.
 * Used by jobs and company listing endpoints.
 */
export const buildJobFilters = (query) => {
  const filter = {};

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (query.status) filter.status = query.status;

  if (query.jobType) {
    const types = query.jobType.split(",").map(t => t.trim().toLowerCase());
    filter.jobType = types.length > 1 ? { $in: types } : types[0];
  }

  if (query.employmentType) {
    const types = query.employmentType.split(",").map(t => t.trim().toLowerCase());
    filter.employmentType = types.length > 1 ? { $in: types } : types[0];
  }

  if (query.experienceLevel) {
    const levels = query.experienceLevel.split(",").map(l => l.trim().toLowerCase());
    filter.experienceLevel = levels.length > 1 ? { $in: levels } : levels[0];
  }

  if (query.company) filter.company = query.company;

  // Case-insensitive partial match on location
  if (query.location) {
    filter.location = { $regex: escapeRegex(query.location), $options: "i" };
  }

  // Case-insensitive partial match on title, description, or skills
  if (query.search) {
    const searchRegex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { skills: searchRegex }
    ];
  }

  // Salary range filter
  if (query.minSalary !== undefined) {
    filter["salaryRange.min"] = { $gte: query.minSalary };
  }
  if (query.maxSalary !== undefined) {
    filter["salaryRange.max"] = { $lte: query.maxSalary };
  }

  return filter;
};

/**
 * Builds pagination options from validated query params.
 */
export const buildPaginationOptions = (query) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const sortField = query.sortBy || "createdAt";
  const sortDirection = query.sortOrder === "asc" ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  return { skip, limit, sort, page };
};

/**
 * Builds the standard paginated response envelope.
 */
export const buildPaginatedResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

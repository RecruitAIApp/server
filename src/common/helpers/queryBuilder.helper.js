/**
 * Builds a MongoDB filter object from query params.
 * Used by jobs and company listing endpoints.
 */
export const buildJobFilters = (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.jobType) filter.jobType = query.jobType;
  if (query.employmentType) filter.employmentType = query.employmentType;
  if (query.experienceLevel) filter.experienceLevel = query.experienceLevel;
  if (query.company) filter.company = query.company;

  // Case-insensitive partial match on location
  if (query.location) {
    filter.location = { $regex: query.location, $options: "i" };
  }

  // Full-text search on title + description + skills
  if (query.search) {
    filter.$text = { $search: query.search };
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
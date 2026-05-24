export class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excluded = ["page", "sort", "limit", "search", "startDate", "endDate", "minAmount", "maxAmount"];
    excluded.forEach((el) => delete queryObj[el]);

    // Handle date range
    if (this.queryString.startDate || this.queryString.endDate) {
      queryObj.date = {};
      if (this.queryString.startDate) queryObj.date.$gte = new Date(this.queryString.startDate);
      if (this.queryString.endDate) queryObj.date.$lte = new Date(this.queryString.endDate);
    }

    // Handle amount range
    if (this.queryString.minAmount || this.queryString.maxAmount) {
      queryObj.amount = {};
      if (this.queryString.minAmount) queryObj.amount.$gte = Number(this.queryString.minAmount);
      if (this.queryString.maxAmount) queryObj.amount.$lte = Number(this.queryString.maxAmount);
    }

    this.query = this.query.find(queryObj);
    return this;
  }

  search() {
    if (this.queryString.search) {
      this.query = this.query.find({
        description: { $regex: this.queryString.search, $options: "i" },
      });
    }
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 5;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

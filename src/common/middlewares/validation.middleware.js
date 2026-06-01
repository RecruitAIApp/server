export const validate = (schema) => async (req, res, next) => {
  try {
    const value = await schema.validateAsync(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (value.body) req.body = value.body;

    if (value.query) {
      Object.assign(req.query, value.query);
    }

    if (value.params) {
      Object.assign(req.params, value.params);
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors:
        error.details?.map((err) => ({
          field: err.path.slice(1).join(".") || err.path[0],
          message: err.message.replace(/^(body\.|query\.|params\.)/, ""),
        })) || [{ message: error.message }],
    });
  }
};
export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(
    {
      body: req.body,
      query: req.query,
      params: req.params,
    },
    { abortEarly: false }
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: error.details.map((err) => ({
        field: err.path.slice(1).join('.') || err.path[0],
        message: err.message.replace(/^(body\.|query\.|params\.)/, ''),
      })),
    });
  }

  req.body = value.body;
  req.query = value.query;
  req.params = value.params;
  next();
};
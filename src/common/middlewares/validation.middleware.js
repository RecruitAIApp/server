export const validate = (schema) => (req, res, next) => {
  try {
    // parse the request data with the schema
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    // return the error with 400 status code
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: error.errors.map(err => ({
        field: err.path[1],
        message: err.message
      }))
    });
  }
};

/**
 * usage -> gwa el controller : 
 * router.post('/apply', validate(applySchema), applicationController.apply);
 */
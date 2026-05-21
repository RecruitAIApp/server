export const sendResponse = (res, statusCode, success, message, data = null) => {
  return res.status(statusCode).json({
    success,
    message,
    data
  });
};


/**
 * usage -> gwa al controller : 
 * // success : sendResponse(res, 200, true, 'Application submitted successfully', newApplication);
 * // failed : sendResponse(res, 404, false, 'Job not found');
 */
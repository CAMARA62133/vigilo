export const sendError = (res, message, status = 500, error = null) => {
  return res.status(status).json({
    success: false,
    message,
    error: error ? error.message : null,
  });
};

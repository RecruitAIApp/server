export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
// I changed the last one bec it was simple and i want it to be more professional
// Inster of creating error objects manually in every function like
//  const error = new Error("Application not found");
//     error.statusCode = 404;
//     throw error;
// now we can create error objects like this
// throw new AppError("Application not found", 404);
export function createError() {}

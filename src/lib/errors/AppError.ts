export class AppError extends Error {
  statusCode = 500;
  code = "INTERNAL_ERROR";
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  statusCode = 400;
  code = "VALIDATION_ERROR";
}

export class AuthError extends AppError {
  statusCode = 401;
  code = "AUTH_ERROR";
}

export class ForbiddenError extends AppError {
  statusCode = 403;
  code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  statusCode = 404;
  code = "NOT_FOUND";
}

export class RateLimitError extends AppError {
  statusCode = 429;
  code = "RATE_LIMITED";
}

export function mapErrorToResponse(err: unknown): { status: number; body: { error: string; code: string } } {
  if (err instanceof AppError) {
    return { status: err.statusCode, body: { error: err.message, code: err.code } };
  }
  return { status: 500, body: { error: "Internal server error", code: "INTERNAL_ERROR" } };
}

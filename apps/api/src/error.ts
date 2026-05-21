export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNPROCESSABLE: 'UNPROCESSABLE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message?: string,
  ) {
    super(message ?? code)
  }
}

export function unauthorized(message?: string) {
  return new AppError(401, ErrorCode.UNAUTHORIZED, message)
}

export function forbidden(message?: string) {
  return new AppError(403, ErrorCode.FORBIDDEN, message)
}

export function notFound(message?: string) {
  return new AppError(404, ErrorCode.NOT_FOUND, message)
}

export function conflict(message?: string) {
  return new AppError(409, ErrorCode.CONFLICT, message)
}

export function validationError(message?: string) {
  return new AppError(400, ErrorCode.VALIDATION_ERROR, message)
}

export function unprocessable(message?: string) {
  return new AppError(422, ErrorCode.UNPROCESSABLE, message)
}

export const ErrorCode = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNPROCESSABLE_INPUT: 'UNPROCESSABLE_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
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
  return new AppError(401, ErrorCode.UNAUTHENTICATED, message)
}

export function forbidden(message?: string) {
  return new AppError(403, ErrorCode.PERMISSION_DENIED, message)
}

export function notFound(message?: string) {
  return new AppError(404, ErrorCode.RESOURCE_NOT_FOUND, message)
}

export function conflict(message?: string) {
  return new AppError(409, ErrorCode.RESOURCE_CONFLICT, message)
}

export function badRequest(message?: string) {
  return new AppError(400, ErrorCode.INVALID_REQUEST, message)
}

export function validationError(message?: string) {
  return new AppError(400, ErrorCode.VALIDATION_FAILED, message)
}

export function unprocessable(message?: string) {
  return new AppError(422, ErrorCode.UNPROCESSABLE_INPUT, message)
}

export function internalError(message?: string) {
  return new AppError(500, ErrorCode.INTERNAL_ERROR, message)
}

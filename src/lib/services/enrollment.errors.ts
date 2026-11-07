export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  readonly status = 400;
  constructor(message: string = 'Invalid input') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  readonly status = 409;
  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

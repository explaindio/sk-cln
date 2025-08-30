export class AuthError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

export class ValidationError extends Error {
  statusCode: number;
  errors: any[];

  constructor(message: string, errors: any[] = []) {
    super(message);
    this.statusCode = 400;
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = 400;
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = 404;
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = 403;
    this.name = 'ForbiddenError';
  }
}
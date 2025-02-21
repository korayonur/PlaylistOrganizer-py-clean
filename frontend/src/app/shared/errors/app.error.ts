export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "NotFoundError";
  }
}

export class FileSystemError extends AppError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "FileSystemError";
  }
}

export class PlaylistError extends AppError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "PlaylistError";
  }
}

export class BrowserError extends AppError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "BrowserError";
  }
}

export class RenderError extends AppError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "RenderError";
  }
}

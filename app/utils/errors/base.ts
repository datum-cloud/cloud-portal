export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toResponse(): Response {
    const body = JSON.stringify({
      message: this.message,
      error: this.name,
    });

    return new Response(body, {
      status: this.statusCode,
      statusText: this.code,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

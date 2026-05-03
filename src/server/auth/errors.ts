import "server-only";

export class AuthApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      details?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "AuthApiError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "AUTH_ERROR";
    this.details = options?.details;
  }
}

import "server-only";

export class MongoApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    input?: {
      status?: number;
      code?: string;
      details?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "MongoApiError";
    this.status = input?.status ?? 400;
    this.code = input?.code ?? "MONGO_ERROR";
    this.details = input?.details;
  }
}

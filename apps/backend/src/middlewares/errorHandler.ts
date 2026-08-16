import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err: Error, c: Context) {
  console.error("❌ [ErrorHandler]:", err);

  if (err instanceof ApiError) {
    return c.json(
      {
        success: false,
        error: {
          name: err.name,
          message: err.message,
          statusCode: err.statusCode,
          details: err.details,
        },
      },
      err.statusCode as any
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          name: "HTTPException",
          message: err.message,
          statusCode: err.status,
        },
      },
      err.status
    );
  }

  return c.json(
    {
      success: false,
      error: {
        name: "InternalServerError",
        message: err.message || "An unexpected error occurred on the server.",
        statusCode: 500,
      },
    },
    500
  );
}

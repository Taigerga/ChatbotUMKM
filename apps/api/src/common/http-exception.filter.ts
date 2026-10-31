import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";

type ErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let body: ErrorBody;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const raw = typeof payload === "string" ? { message: payload } : (payload as Record<string, unknown>);
      const message = Array.isArray(raw.message) ? (raw.message as string[]).join("; ") : String(raw.message ?? exception.message);
      body = {
        statusCode: status,
        code: typeof raw.code === "string" ? raw.code : defaultCode(status),
        message,
        details: raw.details ?? (Array.isArray(raw.message) ? raw.message : undefined),
      };
    } else {
      this.logger.error(`Unhandled error on ${request.method} ${request.url}`);
      body = { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" };
    }

    response.status(body.statusCode).json(body);
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMITED";
    default:
      return status >= 500 ? "INTERNAL_ERROR" : "ERROR";
  }
}

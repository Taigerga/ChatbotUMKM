export type ToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type CompletionRequest = {
  system: string;
  messages: ChatTurn[];
  tools: ToolSpec[];
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type CompletionResult = {
  provider: string;
  text?: string;
  toolCalls: ToolCall[];
};

export type ProviderErrorCode = "TIMEOUT" | "RATE_LIMIT" | "SERVER_ERROR" | "BAD_REQUEST" | "AUTH" | "UNKNOWN";

export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface AiProvider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

export const RETRYABLE: ProviderErrorCode[] = ["TIMEOUT", "RATE_LIMIT", "SERVER_ERROR"];

export function mapHttpError(status: number): ProviderErrorCode {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "SERVER_ERROR";
  if (status >= 400) return "BAD_REQUEST";
  return "UNKNOWN";
}

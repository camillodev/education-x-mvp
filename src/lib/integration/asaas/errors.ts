export class AsaasError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "AsaasError";
  }

  toUserMessage(): string {
    return `Erro inesperado: ${this.message}`;
  }
}

export class AsaasAuthError extends AsaasError {
  override readonly name = "AsaasAuthError" as const;

  override toUserMessage(): string {
    return "Chave de API Asaas inválida ou sem permissão";
  }
}

export class AsaasValidationError extends AsaasError {
  override readonly name = "AsaasValidationError" as const;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    responseBody?: unknown,
    public readonly errors?: Array<{ code: string; description: string }>,
  ) {
    super(message, code, statusCode, responseBody);
  }

  override toUserMessage(): string {
    if (this.errors && this.errors.length > 0) {
      return this.errors.map((e) => e.description).join("; ");
    }
    return `Dados inválidos: ${this.message}`;
  }
}

export class AsaasRateLimitError extends AsaasError {
  override readonly name = "AsaasRateLimitError" as const;

  override toUserMessage(): string {
    return "Limite de requisições Asaas atingido, tente novamente em instantes";
  }
}

export class AsaasServerError extends AsaasError {
  override readonly name = "AsaasServerError" as const;

  override toUserMessage(): string {
    return "Servidor Asaas indisponível. Tente novamente em alguns minutos.";
  }
}

export class AsaasNotFoundError extends AsaasError {
  override readonly name = "AsaasNotFoundError" as const;

  override toUserMessage(): string {
    return "Recurso não encontrado na Asaas";
  }
}

export class AsaasUnexpectedError extends AsaasError {
  override readonly name = "AsaasUnexpectedError" as const;
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body === "string" && body.length > 0) return body.slice(0, 200);
  if (!body || typeof body !== "object") return undefined;

  const b = body as Record<string, unknown>;

  if (typeof b.message === "string") return b.message;
  if (typeof b.description === "string") return b.description;

  if (Array.isArray(b.errors) && b.errors.length > 0) {
    const first = b.errors[0] as Record<string, unknown> | undefined;
    if (first && typeof first.description === "string") return first.description;
    if (first && typeof first.message === "string") return first.message;
  }

  return undefined;
}

function extractErrors(
  body: unknown,
): Array<{ code: string; description: string }> | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.errors)) return undefined;
  return b.errors
    .filter(
      (e): e is Record<string, unknown> => !!e && typeof e === "object",
    )
    .map((e) => ({
      code: String(e.code ?? "UNKNOWN"),
      description: String(e.description ?? e.message ?? ""),
    }));
}

export function classifyAsaasError(
  statusCode: number,
  body?: unknown,
): AsaasError {
  const message =
    extractMessage(body) ?? `Asaas API error (HTTP ${statusCode})`;
  const code = `HTTP_${statusCode}`;

  if (statusCode === 401 || statusCode === 403) {
    return new AsaasAuthError(message, code, statusCode, body);
  }
  if (
    statusCode === 400 ||
    statusCode === 422 ||
    statusCode === 409
  ) {
    const errors = extractErrors(body);
    return new AsaasValidationError(
      message,
      code,
      statusCode,
      body,
      errors,
    );
  }
  if (statusCode === 404) {
    return new AsaasNotFoundError(message, code, statusCode, body);
  }
  if (statusCode === 429) {
    return new AsaasRateLimitError(message, code, statusCode, body);
  }
  if (statusCode >= 500 && statusCode < 600) {
    return new AsaasServerError(message, code, statusCode, body);
  }

  return new AsaasUnexpectedError(message, code, statusCode, body);
}

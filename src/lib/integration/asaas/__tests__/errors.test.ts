import { describe, expect, test } from "vitest";

import {
  AsaasAuthError,
  AsaasNotFoundError,
  AsaasRateLimitError,
  AsaasServerError,
  AsaasValidationError,
  classifyAsaasError,
} from "../errors";

describe("classifyAsaasError", () => {
  test("401 → AsaasAuthError", () => {
    const err = classifyAsaasError(401, { message: "invalid key" });
    expect(err).toBeInstanceOf(AsaasAuthError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("invalid key");
  });

  test("403 → AsaasAuthError", () => {
    const err = classifyAsaasError(403);
    expect(err).toBeInstanceOf(AsaasAuthError);
  });

  test("400 → AsaasValidationError", () => {
    const err = classifyAsaasError(400, {
      errors: [{ code: "invalid_field", description: "CPF inválido" }],
    });
    expect(err).toBeInstanceOf(AsaasValidationError);
    const ve = err as AsaasValidationError;
    expect(ve.errors).toHaveLength(1);
    expect(ve.errors![0].description).toBe("CPF inválido");
  });

  test("422 → AsaasValidationError", () => {
    const err = classifyAsaasError(422, { message: "unprocessable" });
    expect(err).toBeInstanceOf(AsaasValidationError);
  });

  test("409 → AsaasValidationError", () => {
    const err = classifyAsaasError(409, { message: "conflict" });
    expect(err).toBeInstanceOf(AsaasValidationError);
  });

  test("404 → AsaasNotFoundError", () => {
    const err = classifyAsaasError(404);
    expect(err).toBeInstanceOf(AsaasNotFoundError);
  });

  test("429 → AsaasRateLimitError", () => {
    const err = classifyAsaasError(429);
    expect(err).toBeInstanceOf(AsaasRateLimitError);
  });

  test("500 → AsaasServerError", () => {
    const err = classifyAsaasError(500);
    expect(err).toBeInstanceOf(AsaasServerError);
  });

  test("503 → AsaasServerError", () => {
    const err = classifyAsaasError(503, { message: "unavailable" });
    expect(err).toBeInstanceOf(AsaasServerError);
  });

  test("unknown status → AsaasUnexpectedError with fallback message", () => {
    const err = classifyAsaasError(418);
    expect(err.message).toContain("418");
  });

  test("extracts message from string body", () => {
    const err = classifyAsaasError(400, "raw error string");
    expect(err.message).toBe("raw error string");
  });

  test("extracts description from errors array", () => {
    const err = classifyAsaasError(400, {
      errors: [{ code: "x", description: "campo obrigatório" }],
    });
    expect(err.message).toBe("campo obrigatório");
  });

  test("toUserMessage returns PT-BR message for auth error", () => {
    const err = classifyAsaasError(401);
    expect(err.toUserMessage()).toContain("Asaas");
  });

  test("AsaasValidationError.toUserMessage joins all descriptions", () => {
    const err = classifyAsaasError(400, {
      errors: [
        { code: "a", description: "Campo A" },
        { code: "b", description: "Campo B" },
      ],
    }) as AsaasValidationError;
    expect(err.toUserMessage()).toContain("Campo A");
    expect(err.toUserMessage()).toContain("Campo B");
  });

  test("toUserMessage fallback when no errors array", () => {
    const err = classifyAsaasError(400, { message: "bad" }) as AsaasValidationError;
    expect(err.toUserMessage()).toContain("bad");
  });

  test("body without known fields uses fallback message", () => {
    const err = classifyAsaasError(500, null);
    expect(err.message).toContain("500");
  });
});

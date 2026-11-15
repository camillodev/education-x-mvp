// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { isPublicRoute } from "@/lib/auth/public-routes";

const isPublic = (path: string) =>
  isPublicRoute(new NextRequest(`http://localhost:3000${path}`));

describe("isPublicRoute", () => {
  it.each([
    "/",
    "/sign-in",
    "/sign-in/tasks/choose-organization",
    "/sign-up",
    "/m/some-token",
    "/m/some-token/dados",
    "/api/webhook",
    "/api/cron/billing",
    "/termos",
    "/termos/ix-escola",
    "/confirmar/some-token",
    "/api/confirmar/some-token",
  ])("allows public path %s", (path) => {
    expect(isPublic(path)).toBe(true);
  });

  it.each([
    "/matriculas",
    "/mock",
    "/m",
    "/painel/matriculas",
    "/escolas",
    "/api/enrollments",
    "/api/enrollments/guardian",
    "/api/enrollments/students",
    "/api/enrollments/plan",
    "/api/enrollments/contract",
    "/api/enrollment/anything",
    "/api/mock/enrollments",
    "/api/webhook/extra",
    "/api/cron/other",
    "/api/cron/billing/extra",
    "/termos-internos",
    "/confirmarx",
    "/api/confirmarx",
  ])("requires authentication for %s", (path) => {
    expect(isPublic(path)).toBe(false);
  });
});

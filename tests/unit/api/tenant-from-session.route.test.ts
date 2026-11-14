// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUnitContext = vi.fn();
vi.mock("@/lib/auth/unit-context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/unit-context")>(
    "@/lib/auth/unit-context",
  );
  return {
    ...actual,
    getUnitContext: (...a: unknown[]) => getUnitContext(...a),
  };
});

const forUnit = vi.fn();
vi.mock("@/lib/db", () => ({ forUnit: (...a: unknown[]) => forUnit(...a) }));

const listEnrollmentsForUnit = vi.fn();
const getAvailablePlansForUnit = vi.fn();
vi.mock("@/lib/services/enrollment.service", () => ({
  listEnrollmentsForUnit: (...a: unknown[]) => listEnrollmentsForUnit(...a),
  getAvailablePlansForUnit: (...a: unknown[]) => getAvailablePlansForUnit(...a),
  createEnrollment: vi.fn(),
  listStudentsForUnit: vi.fn(),
  createStudent: vi.fn(),
}));

const getUnitContract = vi.fn();
const saveUnitContract = vi.fn();
vi.mock("@/lib/services/contract.service", () => ({
  getUnitContract: (...a: unknown[]) => getUnitContract(...a),
  saveUnitContract: (...a: unknown[]) => saveUnitContract(...a),
}));

import { GET as getEnrollments } from "@/app/api/enrollments/route";
import { GET as getPlans } from "@/app/api/plans/route";
import { GET as getStudents } from "@/app/api/students/route";
import { GET as getGuardians } from "@/app/api/guardians/route";
import {
  GET as getContract,
  POST as postContract,
} from "@/app/api/contracts/route";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/unit-context";

const advisorOfUnitA = {
  role: "orientador",
  unitId: "unit-A",
  userId: "user-1",
};
const forgedQuery = "http://localhost/api/x?unitId=unit-B";

const findMany = vi.fn();

// Handlers that no longer read the request take no parameter; Next.js still passes one at
// runtime, so the tests send the forged request anyway to prove it is ignored.
type Handler = (req: Request) => Promise<Response>;
const call = (handler: unknown, req: Request) => (handler as Handler)(req);

beforeEach(() => {
  vi.clearAllMocks();
  getUnitContext.mockResolvedValue(advisorOfUnitA);
  findMany.mockResolvedValue([]);
  forUnit.mockReturnValue({
    student: { findMany },
    guardian: { findMany },
  });
  listEnrollmentsForUnit.mockResolvedValue([]);
  getAvailablePlansForUnit.mockResolvedValue([]);
  getUnitContract.mockResolvedValue({ id: "c1" });
  saveUnitContract.mockResolvedValue({ id: "c2" });
});

describe("tenant id always comes from the Clerk session, never from the request", () => {
  it("GET /api/enrollments ignores ?unitId=", async () => {
    const res = await call(getEnrollments, new Request(forgedQuery));
    expect(res.status).toBe(200);
    expect(listEnrollmentsForUnit).toHaveBeenCalledWith("unit-A");
  });

  it("GET /api/plans ignores ?unitId=", async () => {
    await call(getPlans, new Request(forgedQuery));
    expect(getAvailablePlansForUnit).toHaveBeenCalledWith("unit-A");
  });

  it("GET /api/students ignores ?unitId=", async () => {
    await getStudents(new Request(forgedQuery));
    expect(forUnit).toHaveBeenCalledWith("unit-A");
    expect(forUnit).not.toHaveBeenCalledWith("unit-B");
  });

  it("GET /api/guardians ignores ?unitId=", async () => {
    await call(getGuardians, new Request(forgedQuery));
    expect(forUnit).toHaveBeenCalledWith("unit-A");
    expect(forUnit).not.toHaveBeenCalledWith("unit-B");
  });

  it("GET /api/contracts ignores ?unitId=", async () => {
    await call(getContract, new Request(forgedQuery));
    expect(getUnitContract).toHaveBeenCalledWith("unit-A");
  });

  it("POST /api/contracts saves to the session unit even if the body names another", async () => {
    const res = await postContract(
      new Request("http://localhost/api/contracts", {
        method: "POST",
        body: JSON.stringify({ unitId: "unit-B", body: "contract text" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(saveUnitContract).toHaveBeenCalledWith("unit-A", "contract text");
  });

  it("POST /api/contracts only needs { body } now", async () => {
    const res = await postContract(
      new Request("http://localhost/api/contracts", {
        method: "POST",
        body: JSON.stringify({ body: "contract text" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(saveUnitContract).toHaveBeenCalledWith("unit-A", "contract text");
  });
});

describe("auth matrix for the advisor-only enrollment-related routes", () => {
  const calls: Array<[string, () => Promise<Response>]> = [
    ["GET /api/enrollments", () => call(getEnrollments, new Request(forgedQuery))],
    ["GET /api/plans", () => call(getPlans, new Request(forgedQuery))],
    ["GET /api/students", () => getStudents(new Request(forgedQuery))],
    ["GET /api/guardians", () => call(getGuardians, new Request(forgedQuery))],
    ["GET /api/contracts", () => call(getContract, new Request(forgedQuery))],
  ];

  it.each(calls)("%s returns 401 without a session", async (_name, call) => {
    getUnitContext.mockRejectedValue(new UnauthorizedError());
    expect((await call()).status).toBe(401);
  });

  it.each(calls)("%s returns 403 for the platform admin", async (_name, call) => {
    getUnitContext.mockResolvedValue({
      role: "admin",
      unitId: "__admin__",
      userId: "admin-1",
    });
    expect((await call()).status).toBe(403);
  });

  it.each(calls)("%s returns 403 for an advisor without unitId", async (_name, call) => {
    getUnitContext.mockRejectedValue(new ForbiddenError());
    expect((await call()).status).toBe(403);
  });
});

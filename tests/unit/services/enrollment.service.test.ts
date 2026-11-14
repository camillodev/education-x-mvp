import { beforeEach, describe, expect, it, vi } from "vitest";
import { forUnit, prisma } from "@/lib/db";
import {
  createEnrollment,
  GuardianOwnershipError,
  InvalidEnrollmentLinkError,
  resolveEnrollmentLink,
  StudentOwnershipError,
  submitAcceptanceStep,
  submitGuardianStep,
  submitPlanStep,
  submitStudentsStep,
} from "@/lib/services/enrollment.service";

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn(async (v: string) => `enc:${v}`),
}));

vi.mock("@/lib/services/contract.service", () => ({
  getUnitContract: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const guardianCreate = vi.fn();
  const guardianUpdate = vi.fn();
  const guardianFindFirst = vi.fn();
  const studentDeleteMany = vi.fn();
  const studentCreate = vi.fn();
  const studentFindMany = vi.fn();
  const subjectFindMany = vi.fn();
  const subjectFindUnique = vi.fn();
  const enrollmentDeleteMany = vi.fn();
  const enrollmentCreate = vi.fn();
  const enrollmentUpdateMany = vi.fn();
  const termsAcceptanceCreate = vi.fn();
  return {
    prisma: {
      unit: { findUnique: vi.fn() },
      termsAcceptance: { create: termsAcceptanceCreate },
    },
    forUnit: vi.fn(() => ({
      guardian: {
        create: guardianCreate,
        update: guardianUpdate,
        findFirst: guardianFindFirst,
      },
      student: {
        deleteMany: studentDeleteMany,
        create: studentCreate,
        findMany: studentFindMany,
      },
      subject: {
        findMany: subjectFindMany,
        findUnique: subjectFindUnique,
      },
      enrollment: {
        deleteMany: enrollmentDeleteMany,
        create: enrollmentCreate,
        updateMany: enrollmentUpdateMany,
      },
    })),
  };
});

type MockPrisma = {
  unit: { findUnique: ReturnType<typeof vi.fn> };
  termsAcceptance: { create: ReturnType<typeof vi.fn> };
};
type MockForUnitDb = {
  guardian: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  student: {
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  subject: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  enrollment: {
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

describe("resolveEnrollmentLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unitId and unit name for a valid token", async () => {
    const mp = prisma as unknown as MockPrisma;
    mp.unit.findUnique.mockResolvedValue({
      id: "unit-1",
      name: "Kumon Camargos",
    });

    const result = await resolveEnrollmentLink("tok-valido");

    expect(result).toEqual({ unitId: "unit-1", unitName: "Kumon Camargos" });
    expect(mp.unit.findUnique).toHaveBeenCalledWith({
      where: { enrollmentLinkToken: "tok-valido" },
      select: { id: true, name: true },
    });
  });

  it("throws InvalidEnrollmentLinkError when the token resolves to no unit", async () => {
    const mp = prisma as unknown as MockPrisma;
    mp.unit.findUnique.mockResolvedValue(null);

    await expect(resolveEnrollmentLink("tok-invalido")).rejects.toThrow(
      InvalidEnrollmentLinkError,
    );
  });
});

const VALID_GUARDIAN_INPUT = {
  name: "Maria da Silva",
  cpfCnpj: "111.444.777-35",
  email: "maria@example.com",
  mobilePhone: "(31) 98888-7777",
  postalCode: "",
  address: "",
  addressNumber: "",
  complement: "",
  province: "",
  city: "",
  state: "",
  phone: "",
  additionalEmails: "",
  type: "MOTHER" as const,
};

describe("submitGuardianStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new encrypted Guardian when there is no existing guardianId (new flow)", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.guardian.create.mockResolvedValue({
      id: "guardian-1",
      unitId: "unit-1",
    });

    const guardian = await submitGuardianStep(
      "unit-1",
      null,
      VALID_GUARDIAN_INPUT,
    );

    expect(db.guardian.create).toHaveBeenCalledWith({
      data: {
        unitId: "unit-1",
        name: "Maria da Silva",
        cpfEnc: "enc:11144477735",
        emailEnc: "enc:maria@example.com",
        phoneEnc: "enc:31988887777",
        postalCodeEnc: null,
        addressEnc: null,
        addressNumberEnc: null,
        complementEnc: null,
        provinceEnc: null,
        cityEnc: null,
        stateEnc: null,
        landlineEnc: null,
        additionalEmailsEnc: null,
        type: "MOTHER",
      },
    });
    expect(guardian.id).toBe("guardian-1");
  });

  it("reuses the existing Guardian (update) when guardianId already belongs to this unit — idempotent on back-navigation", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.guardian.findFirst.mockResolvedValue({
      id: "guardian-1",
      unitId: "unit-1",
    });
    db.guardian.update.mockResolvedValue({
      id: "guardian-1",
      unitId: "unit-1",
    });

    await submitGuardianStep("unit-1", "guardian-1", VALID_GUARDIAN_INPUT);

    expect(db.guardian.findFirst).toHaveBeenCalledWith({
      where: { id: "guardian-1" },
    });
    expect(db.guardian.update).toHaveBeenCalledWith({
      where: { id: "guardian-1" },
      data: {
        unitId: "unit-1",
        name: "Maria da Silva",
        cpfEnc: "enc:11144477735",
        emailEnc: "enc:maria@example.com",
        phoneEnc: "enc:31988887777",
        postalCodeEnc: null,
        addressEnc: null,
        addressNumberEnc: null,
        complementEnc: null,
        provinceEnc: null,
        cityEnc: null,
        stateEnc: null,
        landlineEnc: null,
        additionalEmailsEnc: null,
        type: "MOTHER",
      },
    });
    expect(db.guardian.create).not.toHaveBeenCalled();
  });

  it("throws GuardianOwnershipError when the cookie guardianId belongs to another unit (never leaks)", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.guardian.findFirst.mockResolvedValue(null); // forUnit already filters by unitId — nothing is found in another tenant

    await expect(
      submitGuardianStep(
        "unit-1",
        "guardian-de-outra-escola",
        VALID_GUARDIAN_INPUT,
      ),
    ).rejects.toThrow(GuardianOwnershipError);
    expect(db.guardian.update).not.toHaveBeenCalled();
    expect(db.guardian.create).not.toHaveBeenCalled();
  });
});

describe("submitStudentsStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const blocks = [
    {
      name: "João Silva",
      birthDate: new Date(2015, 2, 15),
      email: "joao@example.com",
      cpf: "",
      mobilePhone: "",
      rg: "",
      rgIssuer: "",
      subjectIds: ["subj-1", "subj-2"],
    },
    {
      name: "Ana Silva",
      birthDate: new Date(2018, 5, 10),
      email: "ana@example.com",
      cpf: "",
      mobilePhone: "",
      rg: "",
      rgIssuer: "",
      subjectIds: ["subj-1"],
    },
  ];

  it("delete-recreate: removes the Guardian's previous Students and creates the new ones, returning studentId->subjectIds", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.student.create
      .mockResolvedValueOnce({ id: "student-1" })
      .mockResolvedValueOnce({ id: "student-2" });

    const result = await submitStudentsStep("unit-1", "guardian-1", blocks);

    expect(db.student.deleteMany).toHaveBeenCalledWith({
      where: { guardianId: "guardian-1" },
    });
    expect(db.student.create).toHaveBeenNthCalledWith(1, {
      data: {
        unitId: "unit-1",
        guardianId: "guardian-1",
        nameEnc: "enc:João Silva",
        birthDateEnc: expect.any(String),
        emailEnc: "enc:joao@example.com",
        cpfEnc: null,
        mobilePhoneEnc: null,
        rgEnc: null,
      },
    });
    expect(result).toEqual([
      { studentId: "student-1", subjectIds: ["subj-1", "subj-2"] },
      { studentId: "student-2", subjectIds: ["subj-1"] },
    ]);
  });

  it("stores no encrypted student email when the optional field is blank", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.student.create.mockResolvedValue({ id: "student-1" });

    await submitStudentsStep("unit-1", "guardian-1", [{
      ...blocks[0],
      email: "",
    }]);

    expect(db.student.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ emailEnc: null }),
    });
  });
});

describe("submitPlanStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const selection = [
    { studentId: "student-1", subjectIds: ["subj-1", "subj-2"] },
    { studentId: "student-2", subjectIds: ["subj-1"] },
  ];

  it("creates one Enrollment per (student, subject) with agreedPriceCents derived from the Subject (R5a)", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.student.findMany.mockResolvedValue([{ id: "student-1" }, {
      id: "student-2",
    }]);
    db.subject.findMany.mockResolvedValue([
      {
        id: "subj-1",
        priceCents: 30000,
        quarterlyPriceCents: null,
        semiannualPriceCents: null,
        annualPriceCents: 24000,
      },
      {
        id: "subj-2",
        priceCents: 20000,
        quarterlyPriceCents: null,
        semiannualPriceCents: null,
        annualPriceCents: 16000,
      },
    ]);
    db.enrollment.create.mockResolvedValue({ id: "enr-x" });

    const result = await submitPlanStep(
      "unit-1",
      "guardian-1",
      selection,
      "ANNUAL",
    );

    expect(db.enrollment.deleteMany).toHaveBeenCalledWith({
      where: { guardianId: "guardian-1" },
    });
    expect(db.enrollment.create).toHaveBeenCalledTimes(3); // 2 subjects (student-1) + 1 subject (student-2)
    expect(db.enrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitId: "unit-1",
        guardianId: "guardian-1",
        studentId: "student-1",
        subjectId: "subj-1",
        plan: "ANNUAL",
        agreedPriceCents: 24000,
        finalPriceCents: 24000,
      }),
    });
    expect(result.totalCents).toBe(24000 + 16000 + 24000); // student-1: subj-1+subj-2, student-2: subj-1
  });

  it("throws StudentOwnershipError when a cookie studentId does not belong to this Guardian/unit", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.student.findMany.mockResolvedValue([{ id: "student-1" }]); // only 1 of 2 found

    await expect(submitPlanStep("unit-1", "guardian-1", selection, "ANNUAL"))
      .rejects.toThrow(
        StudentOwnershipError,
      );
    expect(db.enrollment.create).not.toHaveBeenCalled();
  });

  it("throws when a Subject has no price configured for the chosen plan (R3)", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.student.findMany.mockResolvedValue([{ id: "student-1" }, {
      id: "student-2",
    }]);
    db.subject.findMany.mockResolvedValue([
      {
        id: "subj-1",
        priceCents: 30000,
        quarterlyPriceCents: null,
        semiannualPriceCents: null,
        annualPriceCents: null,
      },
      {
        id: "subj-2",
        priceCents: 20000,
        quarterlyPriceCents: null,
        semiannualPriceCents: null,
        annualPriceCents: 16000,
      },
    ]);

    await expect(submitPlanStep("unit-1", "guardian-1", selection, "ANNUAL"))
      .rejects.toThrow();
    expect(db.enrollment.create).not.toHaveBeenCalled();
  });
});

describe("submitAcceptanceStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records TermsAcceptance (timestamp+IP+guardianId) and moves the Guardian's Enrollments to PENDING_SCHOOL_APPROVAL", async () => {
    const { getUnitContract } = await import("@/lib/services/contract.service");
    vi.mocked(getUnitContract).mockResolvedValue({
      id: "tv-1",
      body: "texto do contrato",
      version: "1.0",
      isCustom: false,
    });

    const mp = prisma as unknown as MockPrisma;
    mp.termsAcceptance.create.mockResolvedValue({ id: "ta-1" });

    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.enrollment.updateMany.mockResolvedValue({ count: 2 });

    await submitAcceptanceStep("unit-1", "guardian-1", "203.0.113.10");

    expect(getUnitContract).toHaveBeenCalledWith("unit-1");
    expect(mp.termsAcceptance.create).toHaveBeenCalledWith({
      data: {
        unitId: "unit-1",
        guardianId: "guardian-1",
        termsVersionId: "tv-1",
        ip: "203.0.113.10",
      },
    });
    expect(db.enrollment.updateMany).toHaveBeenCalledWith({
      where: { guardianId: "guardian-1" },
      data: { status: "PENDING_SCHOOL_APPROVAL" },
    });
  });

  it("throws NoEnrollmentError when the Guardian has no Enrollment to submit", async () => {
    const { getUnitContract } = await import("@/lib/services/contract.service");
    vi.mocked(getUnitContract).mockResolvedValue({
      id: "tv-1",
      body: "texto",
      version: "1.0",
      isCustom: false,
    });

    const mp = prisma as unknown as MockPrisma;
    mp.termsAcceptance.create.mockResolvedValue({ id: "ta-1" });

    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.enrollment.updateMany.mockResolvedValue({ count: 0 });

    const { NoEnrollmentError } = await import(
      "@/lib/services/enrollment.service"
    );
    await expect(submitAcceptanceStep("unit-1", "guardian-1", "203.0.113.10"))
      .rejects.toThrow(
        NoEnrollmentError,
      );
  });
});

describe("createEnrollment", () => {
  const input = {
    guardianId: "guardian-1",
    studentId: "student-1",
    subjectId: "subject-1",
    plan: "MONTHLY" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws SubjectNotFoundError when the subject does not exist in the unit (never a TypeError)", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.subject.findUnique.mockResolvedValue(null);

    const { SubjectNotFoundError } = await import(
      "@/lib/services/enrollment.service"
    );
    await expect(createEnrollment("unit-1", input)).rejects.toThrow(
      SubjectNotFoundError,
    );
    expect(db.enrollment.create).not.toHaveBeenCalled();
  });

  it("stores the plan price as a snapshot in cents", async () => {
    const db = forUnit("unit-1") as unknown as MockForUnitDb;
    db.subject.findUnique.mockResolvedValue({
      id: "subject-1",
      priceCents: 25000,
      quarterlyPriceCents: null,
      semiannualPriceCents: null,
      annualPriceCents: null,
    });
    db.enrollment.create.mockResolvedValue({ id: "e-1" });

    await createEnrollment("unit-1", input);

    expect(db.enrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agreedPriceCents: 25000,
        finalPriceCents: 25000,
        plan: "MONTHLY",
      }),
    });
  });
});

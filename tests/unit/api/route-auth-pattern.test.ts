// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const API_DIR = join(process.cwd(), "src/app/api");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return entry === "route.ts" ? [path] : [];
  });
}

// Routes that authenticate without a Clerk session: a secret token in the URL or a header.
// /api/mock/* is demo data only (blocked by the middleware, removed when the panel goes real).
const NOT_SESSION_AUTHENTICATED = [
  "src/app/api/confirmar/[token]/route.ts",
  "src/app/api/cron/billing/route.ts",
  "src/app/api/webhook/route.ts",
];
const isExempt = (file: string) =>
  NOT_SESSION_AUTHENTICATED.includes(file) || file.startsWith("src/app/api/mock/");

const files = routeFiles(API_DIR).map((f) => ({
  file: relative(process.cwd(), f),
  source: readFileSync(f, "utf8"),
}));

describe("API route authentication pattern", () => {
  it("finds the API routes", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map((f) => [f.file, f.source]))(
    "%s does not use the old guard helpers",
    (_file, source) => {
      expect(source).not.toMatch(/guardAdvisor|guardAdmin|@\/lib\/api\/guard/);
    },
  );

  it.each(files.filter((f) => !isExempt(f.file)).map((f) => [f.file, f.source]))(
    "%s reads the session through requireSchoolAdmin or requireAdmin",
    (_file, source) => {
      expect(source).toMatch(/requireSchoolAdmin\(|requireAdmin\(/);
    },
  );

  it.each(
    files.filter((f) => /requireSchoolAdmin\(/.test(f.source)).map((f) => [f.file, f.source]),
  )("%s keeps the session unit outside the try, for the error log", (_file, source) => {
    const sessionReads = source.match(/await requireSchoolAdmin\(/g)?.length ?? 0;
    const unitKept = source.match(/\bunitId = \w+\.unitId/g)?.length ?? 0;
    expect(unitKept).toBe(sessionReads);
  });
});


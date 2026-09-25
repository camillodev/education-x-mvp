import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { checkFile, type Violation } from "../../scripts/check-language.mjs";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "check-language-"));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, content: string): string {
  const path = join(dir, name);
  writeFileSync(path, content, "utf8");
  return path;
}

function kinds(violations: Violation[]): string[] {
  return violations.map((v) => v.kind);
}

describe("check-language: PT-BR comments", () => {
  it("flags a comment with accented PT-BR text", () => {
    const path = write("pt-comment.ts", `// cobrança pendente aguardando pagamento\nexport const x = 1;\n`);
    expect(kinds(checkFile(path))).toContain("pt-comment");
  });

  it("allows an English comment", () => {
    const path = write("en-comment.ts", `// charge is still pending payment\nexport const x = 1;\n`);
    expect(kinds(checkFile(path))).not.toContain("pt-comment");
  });

  it("ignores PT-BR text inside a quoted string, even near a comment", () => {
    const path = write("quoted-pt.ts", `// label shown to the user\nexport const label = "Cobranças pendentes";\n`);
    expect(kinds(checkFile(path))).not.toContain("pt-comment");
  });
});

describe("check-language: comment pollution", () => {
  it("flags a ticket/history reference outside TODO()", () => {
    const path = write("history.ts", `// EDU-27 — filters by unitId via forUnit\nexport const x = 1;\n`);
    expect(kinds(checkFile(path))).toContain("comment-history");
  });

  it("allows a TODO tied to a ticket", () => {
    const path = write("todo.ts", `// TODO(EDU-99): handle retry backoff\nexport const x = 1;\n`);
    expect(kinds(checkFile(path))).not.toContain("comment-history");
  });

  it("allows a one-line pointer to an ADR", () => {
    const path = write("adr-pointer.ts", `// See ADR-0008\nexport const x = 1;\n`);
    expect(kinds(checkFile(path))).not.toContain("comment-history");
  });

  it("flags a banner/divider comment", () => {
    const path = write("banner.ts", `// ------------------------------\nexport const x = 1;\n`);
    expect(kinds(checkFile(path))).toContain("comment-banner");
  });

  it("flags commented-out code", () => {
    const path = write("commented-code.ts", `// const oldValue = computeLegacy(x);\nexport const x = 1;\n`);
    expect(kinds(checkFile(path))).toContain("comment-commented-code");
  });
});

describe("check-language: identifiers", () => {
  it("flags a PT-BR identifier", () => {
    const path = write("pt-identifier.ts", `export function useEditEscola() { return 1; }\n`);
    expect(kinds(checkFile(path))).toContain("pt-identifier");
  });

  it("allows an English identifier", () => {
    const path = write("en-identifier.ts", `export function useEditSchool() { return 1; }\n`);
    expect(kinds(checkFile(path))).not.toContain("pt-identifier");
  });
});

describe("check-language: paths", () => {
  it("flags a PT-BR api/ path", () => {
    const violations = checkFile(join(dir, "src/app/api/escolas/route.ts"), `export const x = 1;\n`);
    expect(kinds(violations)).toContain("pt-path");
  });

  it("allows a pt-BR page route segment outside api/", () => {
    const violations = checkFile(join(dir, "src/app/(school)/painel/cobrancas/page.tsx"), `export const x = 1;\n`);
    expect(kinds(violations)).not.toContain("pt-path");
  });
});

describe("check-language: string/JSX literals stay pt-BR", () => {
  it("does not flag a JSX text literal", () => {
    const path = write("jsx.tsx", `export const Label = () => <span>Cobrança em atraso</span>;\n`);
    expect(kinds(checkFile(path))).not.toContain("pt-comment");
  });
});

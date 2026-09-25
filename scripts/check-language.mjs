#!/usr/bin/env node
// Enforces .claude/rules/code-standards.md: English-only identifiers/paths/comments,
// no comment pollution (ticket history, banners, commented-out code), with a per-file
// baseline ratchet so existing debt is frozen and only new violations block the build.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { relative, resolve } from "path";

const REPO_ROOT = resolve(new URL("..", import.meta.url).pathname);
const BASELINE_PATH = resolve(REPO_ROOT, ".language-baseline.json");
const CODE_EXTENSIONS = /\.(ts|tsx|mjs|js)$/;

const PT_ACCENT = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/;
const PT_STOPWORDS = [
  "não", "são", "também", "então", "quando", "porque", "isso", "esse", "essa",
  "pelo", "pela", "já", "só", "então", "aqui", "aí", "após", "antes", "para",
  "com", "sem", "onde", "cada", "todo", "toda", "deve", "pode", "será",
];

const PT_DOMAIN_WORDS = [
  "cobranca", "cobrancas", "matricula", "matriculas", "responsavel", "responsaveis",
  "aluno", "alunos", "escola", "escolas", "fatura", "faturas", "negativacao",
  "mensalidade", "mensalidades", "vencimento", "dados", "detalhe", "detalhes",
  "novo", "nova", "painel", "editar", "aprovar", "recusar", "pendente", "pendentes",
  "configuracoes", "configuracao", "plano", "planos", "revisao", "relatorio", "relatorios",
  "extrato", "pagamento", "pagamentos", "valor", "desconto", "orientador", "financeiro",
];

const HISTORY_PATTERNS = [
  /\bEDU-\d+\b/i,
  /\bEmenda\s*\d*/i,
  /\bADR-\d+\s+Emenda/i,
  /\bsecurity review\b/i,
  /\brenamed from\b/i,
  /\bno longer\b/i,
  /\bnão mais\b/i,
  /\brevis[aã]o\b/i,
];
// A bare ADR pointer or a ticket-scoped TODO is allowed — checked before HISTORY_PATTERNS.
const ADR_POINTER = /^see\s+adr-\d+\.?$/i;
const TODO_TICKET = /^todo\(edu-\d+\):/i;

const BANNER_PATTERN = /^[-=─]{3,}$/;
const COMMENTED_CODE_PATTERN = /^(const|let|var|function|if|for|while|return|export|import)\b.*[;{]?\s*$/;

/**
 * @typedef {{ kind: string, line: number, file: string, text: string }} Violation
 */

function stripQuotedSegments(line) {
  // Removes string/template literal contents so PT-BR inside quotes (UI copy) is ignored.
  return line
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

function extractCommentText(line) {
  const stripped = stripQuotedSegments(line);
  const idx = stripped.indexOf("//");
  if (idx === -1) return null;
  // Guard against "//" that only survived because it was inside a quote we just blanked.
  const before = line.slice(0, idx);
  if ((before.match(/"/g) || []).length % 2 === 1) return null;
  return line.slice(idx + 2).trim();
}

function isPtText(text) {
  if (PT_ACCENT.test(text)) return true;
  const lower = ` ${text.toLowerCase()} `;
  let hits = 0;
  for (const word of PT_STOPWORDS) {
    if (lower.includes(` ${word} `)) hits += 1;
    if (hits >= 2) return true;
  }
  return false;
}

function splitIdentifierWords(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function hasPtDomainWord(words) {
  return words.some((w) => PT_DOMAIN_WORDS.includes(w));
}

const IDENTIFIER_DECL = /\b(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;

/**
 * @param {string} path
 * @param {string} [contentOverride]
 * @returns {Violation[]}
 */
export function checkFile(path, contentOverride) {
  const content = contentOverride ?? readFileSync(path, "utf8");
  const violations = [];
  const relPath = relative(REPO_ROOT, path).replace(/\\/g, "/");

  checkPath(relPath, violations);

  if (!CODE_EXTENSIONS.test(path)) return violations;

  const lines = content.split("\n");
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const comment = extractCommentText(line);
    if (comment !== null && comment.length > 0) {
      checkComment(comment, lineNo, violations);
    }
    checkIdentifiers(line, lineNo, violations);
  });

  return violations;
}

function checkPath(relPath, violations) {
  if (!relPath.includes("src/app/api/")) return;
  const segments = relPath.split("/");
  for (const seg of segments) {
    const clean = seg.replace(/[[\]().]/g, "");
    const words = splitIdentifierWords(clean);
    if (hasPtDomainWord(words) || PT_ACCENT.test(seg)) {
      violations.push({ kind: "pt-path", line: 0, file: relPath, text: relPath });
      return;
    }
  }
}

function checkComment(comment, lineNo, violations) {
  const normalized = comment.trim();

  if (TODO_TICKET.test(normalized) || ADR_POINTER.test(normalized)) {
    // Allowed pointer forms — still checked for PT-BR below, but not history/banner.
  } else if (HISTORY_PATTERNS.some((re) => re.test(normalized))) {
    violations.push({ kind: "comment-history", line: lineNo, text: normalized });
  }

  if (BANNER_PATTERN.test(normalized)) {
    violations.push({ kind: "comment-banner", line: lineNo, text: normalized });
  }

  if (COMMENTED_CODE_PATTERN.test(normalized) && normalized.length > 3) {
    violations.push({ kind: "comment-commented-code", line: lineNo, text: normalized });
  }

  if (isPtText(normalized)) {
    violations.push({ kind: "pt-comment", line: lineNo, text: normalized });
  }
}

function checkIdentifiers(line, lineNo, violations) {
  const codePart = stripQuotedSegments(line).split("//")[0];
  let match;
  IDENTIFIER_DECL.lastIndex = 0;
  while ((match = IDENTIFIER_DECL.exec(codePart))) {
    const words = splitIdentifierWords(match[1]);
    if (hasPtDomainWord(words)) {
      violations.push({ kind: "pt-identifier", line: lineNo, text: match[1] });
    }
  }
}

/**
 * @param {Record<string, number>} current
 * @param {Record<string, number>} baseline
 */
export function compareToBaseline(current, baseline) {
  const regressions = [];
  for (const [file, count] of Object.entries(current)) {
    const before = baseline[file] ?? 0;
    if (count > before) {
      regressions.push({ file, before, after: count });
    }
  }
  return { ok: regressions.length === 0, regressions };
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return {};
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
}

function listTrackedFiles() {
  const out = execSync("git ls-files", { cwd: REPO_ROOT, encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) => CODE_EXTENSIONS.test(f))
    .filter((f) => !f.startsWith("node_modules/"))
    .filter((f) => !f.includes("/__tests__/") && !/\.(test|spec)\.(ts|tsx)$/.test(f));
}

function main() {
  const args = process.argv.slice(2);
  const writeBaseline = args.includes("--write-baseline");
  const filesFlagIdx = args.indexOf("--files");
  const targetFiles =
    filesFlagIdx !== -1 ? args.slice(filesFlagIdx + 1).filter((a) => !a.startsWith("--")) : listTrackedFiles();

  /** @type {Record<string, number>} */
  const current = {};
  /** @type {Record<string, Violation[]>} */
  const details = {};

  for (const file of targetFiles) {
    const abs = resolve(REPO_ROOT, file);
    if (!existsSync(abs)) continue;
    const violations = checkFile(abs);
    const relPath = relative(REPO_ROOT, abs).replace(/\\/g, "/");
    if (violations.length > 0) {
      current[relPath] = violations.length;
      details[relPath] = violations;
    }
  }

  if (writeBaseline) {
    writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + "\n");
    console.log(`Baseline written: ${Object.keys(current).length} files with violations.`);
    return;
  }

  const baseline = loadBaseline();
  const { ok, regressions } = compareToBaseline(current, baseline);

  if (!ok) {
    console.error("check-language: new violations found (not covered by baseline):\n");
    for (const r of regressions) {
      console.error(`  ${r.file}: ${r.before} -> ${r.after}`);
      for (const v of details[r.file] ?? []) {
        console.error(`    L${v.line} [${v.kind}] ${v.text}`);
      }
    }
    console.error("\nSee .claude/rules/code-standards.md. Do not edit .language-baseline.json by hand.");
    process.exit(1);
  }

  console.log("check-language: no new violations.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

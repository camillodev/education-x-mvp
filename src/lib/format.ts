// Shared formatting & masking helpers (pt-BR). Used by onboarding steps and review.

/** Cents (Int) → "R$ 1.234,56". The app keeps money in cents; format only at display. */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function maskCnpj(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** CNPJ mascarado para listagem: "•••• 00190" (bullets + últimos 5 dígitos). */
export function maskCnpjTail(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return `•••• ${digits.slice(-5)}`;
}

export function maskCpf(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/**
 * CPF mascarado para exibição (LGPD — ver .claude/rules/lgpd.md #2):
 * "•••.•••.987-00" (oculta os 6 primeiros dígitos, mostra os últimos 5).
 * Não confundir com maskCpf (máscara de digitação de formulário).
 */
export function maskCpfDisplay(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const tail = digits.slice(-5);
  const dv = tail.slice(-2);
  const lastGroup = tail.slice(0, 3);
  return `•••.•••.${lastGroup}-${dv}`;
}

export function maskPhone(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskBrPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  const area = digits.slice(0, 2);
  const local = digits.slice(2);
  const split = digits.length > 10 ? 5 : 4;
  return `(${area}) ${local.slice(0, split)}${
    local.length > split ? `-${local.slice(split)}` : ""
  }`;
}

export function maskCpfCnpj(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z\d]/g, "").slice(0, 14);
  if (normalized.length <= 11 && !/[A-Z]/.test(normalized)) {
    return maskCpf(normalized);
  }
  return normalized
    .replace(/^([A-Z\d]{2})([A-Z\d])/, "$1.$2")
    .replace(/^([A-Z\d]{2})\.([A-Z\d]{3})([A-Z\d])/, "$1.$2.$3")
    .replace(
      /^([A-Z\d]{2})\.([A-Z\d]{3})\.([A-Z\d]{3})([A-Z\d])/,
      "$1.$2.$3/$4",
    )
    .replace(/(\/[A-Z\d]{4})([A-Z\d])/, "$1-$2");
}

export function maskCep(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

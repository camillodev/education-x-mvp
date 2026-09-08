/**
 * Métricas e narrativas dos 4 relatórios do dashboard.
 * No protótipo eram hardcoded na tela; aqui viram dado, para que a troca por
 * agregação real seja só substituir a fonte. Dinheiro em centavos.
 */

export interface ReportMetric {
  label: string;
  /** Valor já formatado quando não é dinheiro (ex.: "92%", "84"). */
  value: string | number;
  /** Em centavos — quando presente, tem precedência sobre `value`. */
  valueCents?: number;
  sub: string;
  icon: string;
  iconBg: string;
  trend?: "up" | "down";
}

export interface ReportSummary {
  id: "cobranca" | "inadimplencia" | "crescimento" | "cancelamentos";
  metrics: ReportMetric[];
  chartTitle: string;
  chartSub: string;
  story: {
    icon: string;
    color: string;
    bg: string;
    /** Texto com `**negrito**` para o trecho destacado. */
    text: string;
  };
}

export const REPORT_SUMMARIES: ReportSummary[] = [
  {
    id: "cobranca",
    metrics: [
      { label: "Emitido no mês", valueCents: 3960000, value: "", sub: "88 cobranças", icon: "receipt", iconBg: "var(--color-primary-soft)" },
      { label: "Recebido", valueCents: 3840000, value: "", sub: "97% do emitido", icon: "check-circle-2", iconBg: "var(--badge-success-bg)", trend: "up" },
      { label: "Pago no prazo", value: "92%", sub: "acima de maio", icon: "calendar-check", iconBg: "var(--color-primary-soft)", trend: "up" },
    ],
    chartTitle: "Recebimento",
    chartSub: "Faturamento recebido · 6 meses",
    story: {
      icon: "rocket",
      color: "var(--badge-success-fg)",
      bg: "var(--badge-success-bg)",
      text: "Seu faturamento acumulou **R$ 7.200** de aumento desde janeiro e segue firme no topo neste mês.",
    },
  },
  {
    id: "inadimplencia",
    metrics: [
      { label: "Em atraso", value: "3,1%", sub: "das cobranças do mês", icon: "alert-circle", iconBg: "var(--badge-danger-bg)", trend: "down" },
      { label: "Em aberto", valueCents: 120000, value: "", sub: "3 cobranças vencidas", icon: "clock", iconBg: "var(--badge-warning-bg)" },
      { label: "Recuperado no mês", valueCents: 228000, value: "", sub: "6 regularizações", icon: "rotate-ccw", iconBg: "var(--badge-success-bg)", trend: "up" },
    ],
    chartTitle: "Atrasos por mês",
    chartSub: "% das cobranças em atraso · 6 meses",
    story: {
      icon: "shield-check",
      color: "var(--badge-success-fg)",
      bg: "var(--badge-success-bg)",
      text: "A inadimplência segue em **queda controlada**, protegendo o caixa do seu negócio.",
    },
  },
  {
    id: "crescimento",
    metrics: [
      { label: "Alunos ativos", value: "84", sub: "+5 este mês", icon: "users", iconBg: "var(--color-primary-soft)", trend: "up" },
      { label: "Receita por mês", valueCents: 3840000, value: "", sub: "+4,2% vs. mês anterior", icon: "trending-up", iconBg: "var(--badge-success-bg)", trend: "up" },
      { label: "Mensalidade média", valueCents: 45700, value: "", sub: "por aluno", icon: "circle-dollar-sign", iconBg: "var(--color-primary-soft)" },
    ],
    chartTitle: "Alunos ativos",
    chartSub: "Base matriculada · 6 meses",
    story: {
      icon: "sprout",
      color: "var(--badge-success-fg)",
      bg: "var(--badge-success-bg)",
      text: "Sua base cresce de forma constante: você ganhou **13 alunos líquidos** nos últimos 6 meses.",
    },
  },
  {
    id: "cancelamentos",
    metrics: [
      { label: "Cancelamentos no mês", value: "2", sub: "−1 vs. maio", icon: "user-minus", iconBg: "var(--badge-success-bg)", trend: "down" },
      { label: "Alunos que ficaram", value: "98,4%", sub: "nos últimos 12 meses", icon: "heart", iconBg: "var(--badge-success-bg)", trend: "up" },
      { label: "Reativações", value: "1", sub: "voltou este mês", icon: "rotate-ccw", iconBg: "var(--color-primary-soft)", trend: "up" },
    ],
    chartTitle: "Cancelamentos por mês",
    chartSub: "% de alunos que saíram · 6 meses",
    story: {
      icon: "heart-handshake",
      color: "var(--badge-success-fg)",
      bg: "var(--badge-success-bg)",
      text: "Sua retenção está excelente (**98,4%**). Os alunos estão satisfeitos e escolhendo ficar.",
    },
  },
];

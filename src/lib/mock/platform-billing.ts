import type { NotificationChannel, PlatformInvoice, PlatformPlan } from "./types";

// Planos SaaS da própria Education X (distinto de ENROLLMENT_PLANS — plano
// de mensalidade do aluno). Preço em centavos; "custom" não tem preço fixo.
export const PLATFORM_PLANS: PlatformPlan[] = [
  { id: "basico", nome: "Básico", preco: 45000, unidade: "/mês", limite: 200, desc: "Cobrança automática, PIX e boleto" },
  { id: "crescimento", nome: "Crescimento", preco: 59900, unidade: "/mês", limite: 500, desc: "Tudo do Básico, com mais volume" },
  { id: "pro", nome: "Pro", preco: 79900, unidade: "/mês", limite: 1000, desc: "Tudo do Crescimento + relatórios avançados" },
  { id: "custom", nome: "Sob medida", preco: 0, unidade: "", limite: null, desc: "Alto volume, API e suporte dedicado" },
];

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  { id: "whatsapp", label: "WhatsApp", icon: "message-circle" },
  { id: "email", label: "E-mail", icon: "mail" },
  { id: "sms", label: "SMS", icon: "smartphone" },
];

// Faturas da escola para a Education X (billing da plataforma, distinto de
// INVOICES — cobrança do aluno). Valores em centavos.
export const PLATFORM_INVOICES: PlatformInvoice[] = [
  { id: "f-jun", mes: "Junho 2026", venc: "05/07", status: "aberto", itens: [
    { desc: "Plano Básico · mensalidade", val: 45000 },
    { desc: "Taxa de negativação SPC/Serasa", detalhe: "3 inclusões × R$ 29,90", val: 8970 },
  ] },
  { id: "f-mai", mes: "Maio 2026", pago: true, status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 45000 },
    { desc: "Taxa de negativação SPC/Serasa", detalhe: "1 inclusão × R$ 29,90", val: 2990 },
  ] },
  { id: "f-abr", mes: "Abril 2026", pago: true, status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 45000 },
  ] },
  { id: "f-mar", mes: "Março 2026", pago: true, status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 45000 },
    { desc: "Taxa de negativação SPC/Serasa", detalhe: "2 inclusões × R$ 29,90", val: 5980 },
  ] },
  { id: "f-fev", mes: "Fevereiro 2026", pago: true, status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 45000 },
  ] },
  { id: "f-jan", mes: "Janeiro 2026", pago: true, status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 45000 },
  ] },
  { id: "f-dez", mes: "Dezembro 2025", pago: true, status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 45000 },
  ] },
  { id: "f-nov", mes: "Novembro 2025", pago: true, status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 45000 },
  ] },
];

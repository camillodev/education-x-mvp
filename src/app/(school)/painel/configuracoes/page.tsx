"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Landmark,
  Receipt,
  FileSignature,
  Info,
  CreditCard,
  FileText,
  ArrowUpCircle,
} from "lucide-react";
import { SchoolShell } from "@/components/school/SchoolShell";
import { ReguaAvisos } from "@/components/school/ReguaAvisos";
import { FaturaDetalheModal } from "@/components/school/FaturaDetalheModal";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionHead } from "@/components/patterns/SectionHead";
import { FeeChoice, type FeePayer } from "@/components/patterns/FeeChoice";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type {
  NotificationChannel,
  PlatformInvoice,
  PlatformInvoiceStatus,
  PlatformPlan,
  SchoolSettings,
} from "@/lib/mock/types";

type Tab = "dados" | "taxas" | "regua" | "plano";
type FaturaFilter = "todas" | PlatformInvoiceStatus;

const TABS: SegmentedOption<Tab>[] = [
  { value: "dados", label: "Dados da escola" },
  { value: "taxas", label: "Taxas" },
  { value: "regua", label: "Régua de avisos" },
  { value: "plano", label: "Meu plano" },
];

const FATURA_FILTERS: SegmentedOption<FaturaFilter>[] = [
  { value: "todas", label: "Todas" },
  { value: "aberto", label: "Em aberto" },
  { value: "paga", label: "Pagas" },
];

interface PlatformResponse {
  planos: PlatformPlan[];
  faturas: PlatformInvoice[];
  canaisNotificacao: NotificationChannel[];
}

const FATURAS_PER_PAGE = 5;

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("dados");
  const [contratoObrig, setContratoObrig] = useState(false);
  const [taxaCartao, setTaxaCartao] = useState<FeePayer>("responsavel");
  const [taxaNeg, setTaxaNeg] = useState<FeePayer>("responsavel");
  const [planoModal, setPlanoModal] = useState(false);
  const [planoSel, setPlanoSel] = useState("basico");
  const [faturaFilter, setFaturaFilter] = useState<FaturaFilter>("todas");
  const [faturaPage, setFaturaPage] = useState(0);
  const [faturaSel, setFaturaSel] = useState<PlatformInvoice | null>(null);

  const { data: settings } = useMockResource<SchoolSettings>("/api/mock/configuracoes-escola");
  const { data: platform } = useMockResource<PlatformResponse>("/api/mock/faturas-plataforma");

  const planos = useMemo(() => platform?.planos ?? [], [platform]);
  const faturas = useMemo(() => platform?.faturas ?? [], [platform]);
  const canais = useMemo(() => platform?.canaisNotificacao ?? [], [platform]);
  const planoAtual = planos.find((p) => p.id === "basico");

  const grupos = settings
    ? [
        {
          titulo: "Dados da escola",
          Icon: Building2,
          rows: [
            ["Razão social", settings.dadosEscola.razaoSocial],
            ["CNPJ", settings.dadosEscola.cnpj],
            ["Endereço", `${settings.dadosEscola.endereco} — ${settings.dadosEscola.cidade}/${settings.dadosEscola.uf}`],
            ["Contato", settings.dadosEscola.email],
          ],
        },
        {
          titulo: "Conta para repasse",
          Icon: Landmark,
          rows: [
            ["Banco", settings.contaRepasse.banco],
            ["Agência", settings.contaRepasse.agencia],
            ["Conta", settings.contaRepasse.conta],
            ["Titular", settings.contaRepasse.titular],
          ],
        },
        {
          titulo: "Regras de cobrança",
          Icon: Receipt,
          rows: [
            ["Dia de vencimento", `Todo dia ${settings.regrasCobranca.vencimento}`],
            ["Dia de fechamento", `Dia ${settings.regrasCobranca.fechamento}`],
            ["Multa por atraso", `${settings.regrasCobranca.multa}%`],
            ["Juros ao mês", `${settings.regrasCobranca.juros}% a.m.`],
          ],
        },
      ]
    : [];

  const faturasFiltradas =
    faturaFilter === "todas" ? faturas : faturas.filter((f) => f.status === faturaFilter);
  const totalPages = Math.max(1, Math.ceil(faturasFiltradas.length / FATURAS_PER_PAGE));
  const page = Math.min(faturaPage, totalPages - 1);
  const faturasPagina = faturasFiltradas.slice(
    page * FATURAS_PER_PAGE,
    (page + 1) * FATURAS_PER_PAGE
  );

  return (
    <SchoolShell
      title="Configurações"
      subtitle="Dados, taxas e plano da unidade Kumon Camargos"
      maxWidth={860}
    >
      <div className="mb-[22px] overflow-x-auto pb-0.5">
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "dados" && (
        <div className="flex flex-col gap-[18px]">
          {grupos.map(({ titulo, Icon, rows }) => (
            <Card key={titulo} className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-5 py-3.5">
                <span className="flex items-center gap-[9px] text-[14.5px] font-bold">
                  <Icon size={17} className="text-(--color-primary)" />
                  {titulo}
                </span>
                <Button
                  variant="tertiary"
                  size="sm"
                  iconLeft="pencil"
                  onClick={() => toast("Edição de dados — em breve", "info")}
                >
                  Editar
                </Button>
              </div>
              <div className="px-5 py-1.5">
                {rows.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 border-b border-(--color-border-muted) py-[11px] text-sm"
                  >
                    <span className="text-(--color-text-subtle)">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3.5">
              <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-(--color-surface) text-(--color-primary)">
                <FileSignature size={20} />
              </span>
              <div>
                <div className="text-[14.5px] font-semibold">
                  Exigir contrato assinado na matrícula
                </div>
                <div className="mt-0.5 text-[13px] text-(--color-text-subtle)">
                  Quando ativo, anexar o contrato assinado (PDF/foto) vira obrigatório no cadastro
                  do aluno
                </div>
              </div>
            </div>
            <Toggle
              checked={contratoObrig}
              onChange={(v) => {
                setContratoObrig(v);
                toast(
                  v ? "Contrato assinado agora é obrigatório" : "Contrato assinado opcional",
                  "info"
                );
              }}
            />
          </Card>
        </div>
      )}

      {tab === "taxas" && (
        <div className="flex flex-col gap-[18px]">
          <Card className="flex items-center gap-3 border border-(--color-primary-soft) bg-(--color-toast-info-bg) p-4">
            <Info size={18} className="shrink-0 text-(--color-primary)" />
            <span className="text-[13.5px] leading-normal text-(--color-text-muted)">
              Sua mensalidade Education X cobre só a geração de cobrança. As taxas de{" "}
              <strong className="text-(--color-text)">cartão</strong> e de{" "}
              <strong className="text-(--color-text)">negativação</strong> são opcionais — defina
              quem paga.
            </span>
          </Card>
          <Card className="p-6">
            <SectionHead
              title="Quem paga as taxas"
              sub="Vale para todas as novas cobranças da unidade"
            />
            <div className="flex flex-col gap-3.5">
              <FeeChoice
                label="Taxa de cartão de crédito"
                hint="Cobrada quando o responsável paga no cartão"
                value={taxaCartao}
                onChange={setTaxaCartao}
              />
              <FeeChoice
                label="Taxa de negativação (SPC/Serasa)"
                hint="Cobrada ao incluir um inadimplente"
                value={taxaNeg}
                onChange={setTaxaNeg}
              />
            </div>
            <div className="mt-[18px] flex justify-end">
              <Button iconLeft="check" onClick={() => toast("Regras de taxa salvas", "success")}>
                Salvar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {tab === "regua" && <ReguaAvisos channels={canais} />}

      {tab === "plano" && (
        <div className="flex flex-col gap-[18px]">
          {planoAtual && (
            <Card className="bg-(--color-primary) p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[12.5px] font-semibold tracking-[0.1em] uppercase opacity-85">
                    Seu plano Education X
                  </div>
                  <div className="mt-1.5 text-[30px] font-extrabold tracking-[-0.02em]">
                    {planoAtual.nome}
                  </div>
                  <div className="mt-1 text-sm opacity-90">
                    {formatBRL(planoAtual.preco)}
                    {planoAtual.unidade} · até {planoAtual.limite} cobranças/mês
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] opacity-80">
                    <Info size={13} />
                    Taxa de cartão e de negativação cobradas à parte
                  </div>
                </div>
                <Button
                  onClick={() => setPlanoModal(true)}
                  className="bg-white text-(--color-primary) hover:bg-white/90"
                >
                  <ArrowUpCircle size={16} />
                  Mudar de plano
                </Button>
              </div>
              <div className="mt-[22px] flex flex-wrap gap-7">
                {[
                  ["Cobranças no mês", `88 / ${planoAtual.limite}`],
                  ["Mensalidade", formatBRL(planoAtual.preco)],
                  ["Próxima fatura", `${formatBRL(planoAtual.preco)} · 05/07`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs opacity-80">{k}</div>
                    <div className="mt-0.5 text-base font-bold">{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-5 py-3.5">
              <span className="flex items-center gap-[9px] text-[14.5px] font-bold">
                <CreditCard size={17} className="text-(--color-primary)" />
                Forma de pagamento
              </span>
              <Button
                variant="tertiary"
                size="sm"
                iconLeft="pencil"
                onClick={() => toast("Alteração de cartão — em breve", "info")}
              >
                Alterar
              </Button>
            </div>
            <div className="flex items-center gap-3 p-[18px]">
              <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-(--color-primary-soft) text-(--color-primary-hover)">
                <CreditCard size={20} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  Cartão •••• {settings?.cartaoAssinatura.ultimosDigitos ?? "····"}
                </div>
                <div className="text-[12.5px] text-(--color-text-subtle)">
                  Vence 09/28 · cobrança mensal automática
                </div>
              </div>
              <Badge variant="success" size="sm" dot>
                Ativo
              </Badge>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border) bg-(--color-surface) px-5 py-3.5">
              <span className="flex items-center gap-[9px] text-[14.5px] font-bold">
                <FileText size={17} className="text-(--color-primary)" />
                Faturas
              </span>
              <Segmented
                size="sm"
                options={FATURA_FILTERS}
                value={faturaFilter}
                onChange={(v) => {
                  setFaturaFilter(v);
                  setFaturaPage(0);
                }}
              />
            </div>
            <div className="px-5 py-1.5">
              {faturasPagina.map((f) => {
                const total = f.itens.reduce((s, i) => s + i.val, 0);
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 border-b border-(--color-border-muted) py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold">{f.mes}</div>
                      <div className="text-[12.5px] text-(--color-text-subtle)">
                        {f.status === "aberto" ? `Vence em ${f.venc}` : "Paga"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{formatBRL(total)}</span>
                      {f.status === "aberto" ? (
                        <Badge variant="warning" size="sm" dot>
                          Em aberto
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm" dot>
                          Paga
                        </Badge>
                      )}
                      <Button variant="tertiary" size="sm" onClick={() => setFaturaSel(f)}>
                        Ver fatura
                      </Button>
                    </div>
                  </div>
                );
              })}
              {faturasPagina.length === 0 && (
                <p className="py-6 text-center text-sm text-(--color-text-subtle)">
                  Nenhuma fatura neste filtro.
                </p>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-(--color-border-muted) px-5 py-3">
                <span className="text-[13px] text-(--color-text-subtle)">
                  {faturasFiltradas.length} fatura{faturasFiltradas.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setFaturaPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-[13px] font-semibold text-(--color-text-muted)">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setFaturaPage(page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <Dialog open={planoModal} onOpenChange={setPlanoModal}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Mudar de plano</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-(--color-text-muted)">
            O plano é definido pelo volume de cobranças emitidas por mês.
          </p>
          <div className="flex flex-col gap-2.5">
            {planos.map((p) => {
              const active = planoSel === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPlanoSel(p.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-(--radius-md) border-2 px-4 py-3.5 text-left ${
                    active
                      ? "border-(--color-primary) bg-(--color-primary-softer)"
                      : "border-(--color-border-input) bg-(--color-bg)"
                  }`}
                >
                  <span
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                      active ? "border-(--color-primary)" : "border-(--color-border-input)"
                    }`}
                  >
                    {active && <span className="h-[11px] w-[11px] rounded-full bg-(--color-primary)" />}
                  </span>
                  <div className="flex-1">
                    <div className="text-[15.5px] font-bold">{p.nome}</div>
                    <div className="mt-0.5 text-[13px] text-(--color-text-subtle)">{p.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold">
                      {p.limite === null ? "Sob consulta" : formatBRL(p.preco)}
                    </div>
                    <div className="text-[11.5px] text-(--color-text-subtle)">
                      {p.limite === null ? "alto volume" : `até ${p.limite}/mês`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setPlanoModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setPlanoModal(false);
                const escolhido = planos.find((p) => p.id === planoSel);
                toast(
                  planoSel === "custom"
                    ? "Nosso time comercial entrará em contato"
                    : `Plano alterado para ${escolhido?.nome}`,
                  "success"
                );
              }}
            >
              {planoSel === "custom" ? "Falar com vendas" : "Confirmar mudança"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FaturaDetalheModal fatura={faturaSel} onClose={() => setFaturaSel(null)} />
    </SchoolShell>
  );
}

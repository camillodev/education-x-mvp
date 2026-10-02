/* Financeiro — telas roteadas por initialTab:
 * Contas a pagar (fin:contas) · Fluxo de caixa (fin:caixa) — backlog, acessíveis pela home.
 * Saldo & transferência PIX (mvp-06) foi absorvido pelo Dashboard (C0) como card + modais. */

const FIN_META = {
  contas: { screen: "fin:contas", title: "Contas a pagar", sub: "Despesas operacionais da unidade" },
  caixa:  { screen: "fin:caixa",  title: "Fluxo de caixa",  sub: "Projeção de entradas e saídas" },
};

const FinanceiroPage = ({ go, toast, initialTab = "contas" }) => {
  const m = FIN_META[initialTab] || FIN_META.contas;
  return (
    <Shell screen={m.screen} go={go} title={m.title} subtitle={m.sub} maxWidth={1180}>
      {initialTab === "contas" && <ContasPagar toast={toast} />}
      {initialTab === "caixa" && <FluxoCaixa toast={toast} />}
    </Shell>
  );
};

window.FinanceiroPage = FinanceiroPage;

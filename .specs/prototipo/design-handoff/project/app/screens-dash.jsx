/* Dashboard financeiro da escola (C0) — conciliado com DH-f5 (Fluxo 06, P0).
 * 4 KPIs (previsto / recebido / vencido+alunos / negativado+alunos) com seletor de
 * período mensal · tabela de inadimplência (única escrita: pausar régua, com confirmação)
 * · gráfico de linha "Recebido por semana" fixo em 3 meses. Relatórios/Extrato/Recovery
 * ficam em P1 (backlog). Este arquivo REDEFINE window.C0Dashboard. */

/* KPIs por mês (RN-02: default mês corrente; RN-03: recebido usa paidAt) */
const DASH_MESES = ["Julho/2026", "Junho/2026", "Maio/2026"];
const DASH_KPI = {
  "Julho/2026": { previsto: 38900, recebido: 26400, vencido: 1407, vencAlunos: 3, negativado: 800, negAlunos: 2 },
  "Junho/2026": { previsto: 37250, recebido: 35800, vencido: 980, vencAlunos: 2, negativado: 450, negAlunos: 1 },
  "Maio/2026":  { previsto: 36400, recebido: 34950, vencido: 1850, vencAlunos: 4, negativado: 450, negAlunos: 1 },
};

/* Recebido por semana — janela FIXA de 3 meses (não segue o seletor nem filtros) */
const DASH_SEMANAS = [
  { label: "Sem 16", value: 7800 }, { label: "Sem 17", value: 8900 }, { label: "Sem 18", value: 9400 },
  { label: "Sem 19", value: 8200 }, { label: "Sem 20", value: 10100 }, { label: "Sem 21", value: 7600 },
  { label: "Sem 22", value: 9800 }, { label: "Sem 23", value: 11200 }, { label: "Sem 24", value: 8700 },
  { label: "Sem 25", value: 9300 }, { label: "Sem 26", value: 10400 }, { label: "Sem 27", value: 6900 },
  { label: "Sem 28", value: 4200 },
];

const DashLineChart = ({ data, height = 190 }) => {
  const W = 940, H = height, PX = 44, PT = 18, PB = 34;
  const max = Math.max(...data.map((d) => d.value)) * 1.15;
  const x = (i) => PX + (i * (W - PX * 2)) / (data.length - 1);
  const y = (v) => PT + (1 - v / max) * (H - PT - PB);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${PX},${H - PB} ${pts} ${W - PX},${H - PB}`;
  const [hov, setHov] = useState(null);
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PX} x2={W - PX} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-border-muted)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={PX - 8} y={y(max * f) + 4} textAnchor="end" fontSize="10.5" fill="var(--color-text-subtle)" fontFamily="var(--font-sans)">
              {"R$ " + Math.round(max * f / 1000) + "k"}</text>
          </g>
        ))}
        <polygon points={area} fill="var(--color-primary)" opacity="0.08" />
        <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: "default" }}>
            <circle cx={x(i)} cy={y(d.value)} r={hov === i ? 5.5 : 3.5} fill="var(--color-bg)" stroke="var(--color-primary)" strokeWidth="2.5" />
            <rect x={x(i) - 18} y={PT} width="36" height={H - PT - PB} fill="transparent" />
            {i % 2 === 0 && <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10.5" fill="var(--color-text-subtle)" fontFamily="var(--font-sans)">{d.label}</text>}
            {hov === i && (
              <g>
                <rect x={x(i) - 44} y={y(d.value) - 34} width="88" height="24" rx="6" fill="var(--color-text)" />
                <text x={x(i)} y={y(d.value) - 18} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-bg)" fontFamily="var(--font-sans)">{brl(d.value)}</text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

/* status de exibição da linha (RN-04: PENDING vencida conta como vencida) */
const dashStatus = (r) => r.etapa === "NEGATIVATED" ? "Negativada" : r.etapa === "REGULARIZED" ? "Paga" : r.atraso > 0 ? "Vencida" : "A vencer";
const DASH_STATUS_OPTS = [
  { value: "todas", label: "Todas" }, { value: "A vencer", label: "A vencer" },
  { value: "Vencida", label: "Vencidas" }, { value: "Negativada", label: "Negativadas" }, { value: "Paga", label: "Pagas" },
];
const DASH_MATERIAS = ["Todas", "Matemática", "Português", "Inglês"];

/* Card de saldo — absorvido do fluxo Financeiro (mvp-06): mesma área dos KPIs de cobrança */
const SaldoCard = ({ onTransferir, onAntecipar }) => (
  <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, background: "var(--color-primary)", border: "none" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.85)" }}>Saldo disponível</span>
      <span style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <Icon name="wallet" size={18} /></span>
    </div>
    <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "#fff", letterSpacing: "-0.02em" }}>{brl(SALDO.disponivel)}</span>
    <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
      <Button size="sm" onClick={onTransferir} style={{ flex: 1, background: "#fff", color: "var(--color-primary)" }} iconLeft="arrow-up-right">Transferir</Button>
      <Button size="sm" onClick={onAntecipar} style={{ flex: 1, background: "transparent", color: "#fff", border: "1.5px solid rgba(255,255,255,0.55)", boxShadow: "none" }} iconLeft="zap">Antecipar</Button>
    </div>
  </Card>
);

const C0Dashboard = ({ go, toast }) => {
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [mes, setMes] = useState(0); // índice em DASH_MESES — default mês corrente (RN-02)
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("todas");
  const [fMat, setFMat] = useState("Todas");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: "atraso", dir: "desc" });
  const [pausarRow, setPausarRow] = useState(null);
  const [saqueOpen, setSaqueOpen] = useState(false);
  const [antecipOpen, setAntecipOpen] = useState(false);
  const PER = 6;
  const k = DASH_KPI[DASH_MESES[mes]];

  const COLS = [
    { h: "Aluno", key: "aluno", align: "left", val: (r) => r.aluno.toLowerCase() },
    { h: "Matéria", key: "materia", align: "left", val: (r) => r.materia },
    { h: "Valor", key: "valor", align: "right", val: (r) => r.valor },
    { h: "Dias de atraso", key: "atraso", align: "right", val: (r) => r.atraso },
    { h: "Etapa da régua", key: "etapa", align: "left", val: (r) => ["NONE", "REMINDED", "WARNED1", "WARNED2", "NEGATIVATED", "REGULARIZED"].indexOf(r.etapa) },
  ];
  const toggleSort = (key) => { setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }); setPage(0); };

  /* período afeta a tabela: cobranças com vencimento até o mês selecionado */
  const mesNum = 7 - mes;
  const term = q.trim().toLowerCase();
  const temFiltro = term !== "" || fStatus !== "todas" || fMat !== "Todas";
  const filtered = REGUA_ROWS.filter((r) => {
    const vMes = parseInt(r.venc.split("/")[1], 10);
    return vMes <= mesNum &&
      (fStatus === "todas" || dashStatus(r) === fStatus) &&
      (fMat === "Todas" || r.materia === fMat) &&
      (!term || r.aluno.toLowerCase().includes(term) || r.resp.toLowerCase().includes(term));
  });
  const sortCol = COLS.find((c) => c.key === sort.key) || COLS[3];
  const sorted = [...filtered].sort((a, b) => {
    const av = sortCol.val(a), bv = sortCol.val(b);
    const r = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === "asc" ? r : -r;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / PER));
  const cur = Math.min(page, pages - 1);
  const rows = sorted.slice(cur * PER, cur * PER + PER);

  return (
    <Shell screen="c0" go={go} title="Dashboard" subtitle="Visão financeira da unidade Kumon Camargos"
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variant="secondary" size="sm" iconLeft="chevron-left" disabled={mes >= DASH_MESES.length - 1} onClick={() => { setMes(mes + 1); setPage(0); }} aria-label="Mês anterior"></Button>
          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 108, textAlign: "center" }}>{DASH_MESES[mes]}</span>
          <Button variant="secondary" size="sm" iconLeft="chevron-right" disabled={mes === 0} onClick={() => { setMes(mes - 1); setPage(0); }} aria-label="Próximo mês"></Button>
        </div>
      }>
      {/* KPIs — saldo + previsto numa linha; recebido/vencido/negativado na outra (DH-f5 §1 + saldo mvp-06) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginBottom: 18 }}>
        <SaldoCard onTransferir={() => setSaqueOpen(true)} onAntecipar={() => setAntecipOpen(true)} />
        <Metric label="Total previsto" value={brl(k.previsto)} sub="cobranças do mês (a vencer + pagas)" icon="calendar" accent="var(--color-primary)" iconBg="var(--color-primary-soft)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18, marginBottom: 26 }}>
        <Metric label="Total recebido" value={brl(k.recebido)} sub="pagamentos que entraram no mês" icon="wallet" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
        <Metric label="Total vencido" value={brl(k.vencido)} sub={`${k.vencAlunos} aluno${k.vencAlunos !== 1 ? "s" : ""}`} icon="alert-circle" accent="var(--badge-warning-fg)" iconBg="var(--badge-warning-bg)" />
        <Metric label="Total negativado" value={brl(k.negativado)} sub={`${k.negAlunos} aluno${k.negAlunos !== 1 ? "s" : ""} no SPC/Serasa`} icon="file-x" accent="var(--badge-danger-fg)" iconBg="var(--badge-danger-bg)" />
      </div>

      {/* Tabela de inadimplência — única escrita da tela: pausar régua (§2.3) */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 26 }}>
        <div style={{ padding: "18px 22px 0" }}>
          <SectionHead title="Inadimplência" sub="Cobranças vencidas e etapa da régua de cada uma"
            action={<Button variant="tertiary" size="sm" iconRight="arrow-right" onClick={() => go("d0")}>Ver régua completa</Button>} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "2px 22px 16px" }}>
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} leadingIcon="search"
            placeholder="Buscar por aluno ou responsável" style={{ flex: "1 1 220px", maxWidth: 300, height: 42 }} />
          <Segmented value={fStatus} onChange={(v) => { setFStatus(v); setPage(0); }} size="sm" options={DASH_STATUS_OPTS} />
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {DASH_MATERIAS.map((m) => (
              <button key={m} onClick={() => { setFMat(m); setPage(0); }}
                style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)",
                  border: `1px solid ${fMat === m ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: fMat === m ? "var(--color-primary-soft)" : "var(--color-bg)",
                  color: fMat === m ? "var(--color-primary-hover)" : "var(--color-text-muted)" }}>{m}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ background: "var(--color-surface)" }}>
                {COLS.map((c) => {
                  const on = sort.key === c.key;
                  return (
                    <th key={c.key} onClick={() => toggleSort(c.key)} style={{ textAlign: c.align, padding: "11px 16px", fontSize: 11.5,
                      fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: on ? "var(--color-primary)" : "var(--color-text-subtle)",
                      borderBottom: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {c.h}<Icon name={on ? (sort.dir === "asc" ? "chevron-up" : "chevron-down") : "chevrons-up-down"} size={13} color={on ? "var(--color-primary)" : "var(--color-text-subtle)"} />
                      </span>
                    </th>
                  );
                })}
                <th style={{ textAlign: "right", padding: "11px 16px", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                  color: "var(--color-text-subtle)", borderBottom: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>Régua ativa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}>
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.aluno}</div>
                    <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>{r.resp}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "var(--color-primary-soft)", color: "var(--color-primary-hover)", whiteSpace: "nowrap" }}>{r.materia}</span></td>
                  <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{brl(r.valor)}</td>
                  <td style={{ padding: "13px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {r.atraso > 0
                      ? <span style={{ fontWeight: 700, color: r.atraso > 30 ? "var(--badge-danger-fg)" : "var(--badge-warning-fg)" }}>{r.atraso} dias</span>
                      : <span style={{ color: "var(--color-text-subtle)" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px" }}><EtapaBadge etapa={r.etapa} pausada={r.pausada} /></td>
                  <td style={{ padding: "13px 16px", textAlign: "right" }}>
                    {["NEGATIVATED", "REGULARIZED"].includes(r.etapa)
                      ? <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>—</span>
                      : <Toggle checked={!r.pausada} onChange={() => setPausarRow(r)} />}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "36px 22px", textAlign: "center", color: "var(--color-text-subtle)", fontSize: 14 }}>
                  {temFiltro ? "Nenhuma cobrança encontrada com esses filtros." : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Icon name="check-circle-2" size={16} color="var(--badge-success-fg)" />Nenhuma inadimplência no período</span>
                  )}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 22px", borderTop: "1px solid var(--color-border-muted)" }}>
          <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>
            {sorted.length === 0 ? "0 cobranças" : `${cur * PER + 1}–${Math.min(cur * PER + PER, sorted.length)} de ${sorted.length} cobrança${sorted.length !== 1 ? "s" : ""}`}</span>
          <Pagination page={cur} pages={pages} onChange={setPage} />
        </div>
      </Card>

      {/* Gráfico — janela fixa de 3 meses, não segue seletor nem filtros (§4) */}
      <Card style={{ padding: 22 }}>
        <SectionHead title="Recebido por semana" sub="Últimos 3 meses — janela fixa, independente do período acima" />
        <DashLineChart data={DASH_SEMANAS} />
      </Card>

      <PausarModal row={pausarRow} onClose={() => setPausarRow(null)} onConfirm={() => {
        pausarRow.pausada = !pausarRow.pausada;
        toast(pausarRow.pausada ? `Régua pausada para ${pausarRow.aluno}.` : `Régua retomada para ${pausarRow.aluno}.`, "info");
        setPausarRow(null); rerender();
      }} />
      <SaldoModals saqueOpen={saqueOpen} setSaqueOpen={setSaqueOpen} antecipOpen={antecipOpen} setAntecipOpen={setAntecipOpen} toast={toast} />
    </Shell>
  );
};

window.C0Dashboard = C0Dashboard;

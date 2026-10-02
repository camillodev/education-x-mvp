/* Flow C — Painel e cobranças (Fran) · desktop */

const SectionHead = ({ title, sub, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, gap: 12 }}>
    <div>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h3>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--color-text-subtle)" }}>{sub}</p>}
    </div>
    {action}
  </div>
);

// pseudo-random but deterministic QR placeholder
const QrCode = ({ size = 132 }) => {
  const n = 21;
  const cells = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n;
    const finder = (rr, cc) => rr < 7 && cc < 7 || rr < 7 && cc >= n - 7 || rr >= n - 7 && cc < 7;
    let on;
    if (finder(r, c)) {
      const lr = r % (n - 7), lc = c % (n - 7);
      on = (r < 7 ? r : r - (n - 7)) === 0 || (r < 7 ? r : r - (n - 7)) === 6 ||
           (c < 7 ? c : c - (n - 7)) === 0 || (c < 7 ? c : c - (n - 7)) === 6 ||
           ((r < 7 ? r : r - (n - 7)) >= 2 && (r < 7 ? r : r - (n - 7)) <= 4 && (c < 7 ? c : c - (n - 7)) >= 2 && (c < 7 ? c : c - (n - 7)) <= 4);
    } else {
      on = ((r * 7 + c * 13 + r * c) % 3 === 0);
    }
    cells.push(on);
  }
  return (
    <div style={{ width: size, height: size, padding: 8, background: "#fff", borderRadius: 10, border: "1px solid var(--color-border)" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)`, width: "100%", height: "100%" }}>
        {cells.map((on, i) => <div key={i} style={{ background: on ? "var(--color-text)" : "transparent" }} />)}
      </div>
    </div>
  );
};

const DataTable = ({ cols, children }) => (
  <Card style={{ overflow: "hidden" }}>
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "var(--color-surface)" }}>
          {cols.map((c, i) => (
            <th key={i} style={{ textAlign: c.align || "left", padding: "12px 18px", fontSize: 11.5, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-subtle)", borderBottom: "1px solid var(--color-border)",
              width: c.w }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
    </div>
  </Card>
);

const Td = ({ children, align, style = {} }) => (
  <td style={{ padding: "14px 18px", fontSize: 14, color: "var(--color-text)", textAlign: align, ...style }}>{children}</td>
);
const TrHover = ({ children, onClick }) => {
  const [h, setH] = useState(false);
  return <tr onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ borderBottom: "1px solid var(--color-border-muted)", cursor: onClick ? "pointer" : "default",
      background: h && onClick ? "var(--color-surface)" : "transparent", transition: "background 120ms" }}>{children}</tr>;
};

const Person = ({ name, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-hover)",
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>
      {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>{sub}</div>}
    </div>
  </div>
);

/* ─── ExtratoTab ───────────────────────────────────────────────────────── */
const ORIG_ICON = { PIX: "qr-code", Boleto: "barcode", Cartão: "credit-card", Saque: "arrow-up-right", Antecipação: "zap" };
const EXTRATO_EXTRA = [
  { id: "e7", tipo: "entrada", origem: "PIX", desc: "Carlos Andrade · Mensalidade Maio", valor: 450, data: "30/05, 09:40", status: "disponivel" },
  { id: "e8", tipo: "entrada", origem: "Boleto", desc: "Rodrigo Nunes · Mensalidade Abril", valor: 600, data: "28/05, 16:00", status: "disponivel" },
  { id: "e9", tipo: "saida", origem: "Saque", desc: "Transferência para conta ****-5521", valor: 8000, data: "25/05, 08:00", status: "concluido" },
  { id: "e10", tipo: "entrada", origem: "Cartão", desc: "Renata Alves · Mensalidade Maio", valor: 380, data: "22/05, 11:20", status: "aliberar", liberaEm: "21/06" },
  { id: "e11", tipo: "entrada", origem: "PIX", desc: "Maria Silva · Material didático", valor: 120, data: "20/05, 14:10", status: "disponivel" },
  { id: "e12", tipo: "saida", origem: "Saque", desc: "Transferência para conta ****-5521", valor: 10000, data: "01/05, 08:00", status: "concluido" },
];
const ExtratoTab = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [page, setPage] = useState(0);
  const PER_PAGE = 6;
  const allRows = [...EXTRATO, ...EXTRATO_EXTRA];
  const filtered = allRows.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.desc.toLowerCase().includes(q) || e.origem.toLowerCase().includes(q);
    const matchFilter = filter === "todos" || (filter === "entradas" && e.tipo === "entrada") || (filter === "saidas" && e.tipo === "saida");
    return matchSearch && matchFilter;
  });
  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por responsável ou descrição…" leadingIcon="search" />
        </div>
        <Segmented value={filter} onChange={(v) => { setFilter(v); setPage(0); }} options={[
          { value: "todos", label: "Todos" },
          { value: "entradas", label: "Entradas" },
          { value: "saidas", label: "Saídas" },
        ]} />
      </div>
      <DataTable cols={[{ label: "Origem" }, { label: "Descrição" }, { label: "Data" }, { label: "Situação" }, { label: "Valor", align: "right" }]}>
        {paged.map((e) => (
          <TrHover key={e.id}>
            <Td><span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: e.tipo === "saida" ? "var(--color-text-muted)" : "var(--color-primary)" }}>
                <Icon name={ORIG_ICON[e.origem] || "circle"} size={15} /></span>{e.origem}</span></Td>
            <Td><span style={{ color: "var(--color-text-muted)" }}>{e.desc}</span></Td>
            <Td><span style={{ color: "var(--color-text-subtle)" }}>{e.data}</span></Td>
            <Td>{e.status === "disponivel" ? <Badge variant="success" dot size="sm">Disponível</Badge>
              : e.status === "aliberar" ? <Badge variant="warning" dot size="sm">Libera {e.liberaEm}</Badge>
              : <Badge variant="neutral" size="sm">Concluído</Badge>}</Td>
            <Td align="right"><span style={{ fontWeight: 700, color: e.tipo === "saida" ? "var(--color-text-muted)" : "var(--badge-success-fg)" }}>
              {e.tipo === "saida" ? "−" : "+"}{brl(e.valor)}</span></Td>
          </TrHover>
        ))}
      </DataTable>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>{filtered.length} lançamento{filtered.length !== 1 ? "s" : ""}</span>
        {pages > 1 && (
          <Pagination page={page} pages={pages} onChange={setPage} />
        )}
      </div>
    </div>
  );
};

/* ─── C0 Dashboard ─────────────────────────────────────────────────────── */
// mini bar chart for reports — accepts a value formatter + accent
const RepBars = ({ data, fmt = (v) => v, height = 150, accent = "var(--color-primary)" }) => {
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value), 0);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const h = ((d.value - min) / (max - min || 1)) * (height - 40) + 6;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: d.highlight ? accent : "var(--color-text-muted)" }}>{fmt(d.value)}</span>
            <div style={{ width: "100%", maxWidth: 42, height: h, borderRadius: "8px 8px 4px 4px", background: d.highlight ? accent : "color-mix(in srgb, " + accent + " 22%, white)", transition: "height 300ms ease" }} />
            <span style={{ fontSize: 12, color: "var(--color-text-subtle)", fontWeight: d.highlight ? 700 : 500 }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const ReportCard = ({ title, sub, badge, badgeVariant, children }) => (
  <Card style={{ padding: 22 }}>
    <SectionHead title={title} sub={sub} action={badge ? <Badge variant={badgeVariant || "primary"}>{badge}</Badge> : null} />
    {children}
  </Card>
);

// Export → modal de formato (PDF ou CSV) — um único ponto de exportação
const ExportModal = ({ open, onClose, toast, what = "relatório" }) => {
  if (!open) return null;
  const opt = (fmt, icon, desc) => (
    <button onClick={() => { onClose(); toast(`Exportando ${what} em ${fmt}…`, "info"); }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "22px 16px", borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--color-border-input)", background: "var(--color-bg)", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 140ms" }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border-input)"}>
      <span style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={22} color="var(--color-primary)" /></span>
      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{fmt}</span>
      <span style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>{desc}</span>
    </button>
  );
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div style={{ padding: 26 }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Exportar {what}</h3>
        <p style={{ margin: "6px 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Escolha o formato do arquivo.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {opt("PDF", "file-text", "Pronto para imprimir")}
          {opt("CSV", "file-spreadsheet", "Abre no Excel / Sheets")}
        </div>
      </div>
    </Modal>
  );
};

// ── Componentes de relatório com data-storytelling ──────────────────────
const StoryBanner = ({ icon, color, bg, children }) => (
  <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 16px", borderRadius: "var(--radius-md)", background: bg }}>
    <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "var(--color-bg)", color: color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={20} /></span>
    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.45 }}>{children}</p>
  </div>
);

const DeltaChip = ({ text, dir, goodWhen }) => {
  const zero = dir === 0;
  const good = zero ? null : (goodWhen === "up" ? dir > 0 : dir < 0);
  const fg = zero ? "var(--color-text-subtle)" : good ? "var(--badge-success-fg)" : "var(--badge-danger-fg)";
  const bg = zero ? "var(--color-surface)" : good ? "var(--badge-success-bg)" : "var(--badge-danger-bg)";
  const ic = zero ? "minus" : dir > 0 ? "arrow-up" : "arrow-down";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 999, background: bg, color: fg, whiteSpace: "nowrap" }}>
      <Icon name={ic} size={9} />{text}</span>
  );
};

const ChartTip = ({ title, body }) => (
  <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", width: 210, padding: "11px 13px", borderRadius: 10, background: "var(--color-text)", color: "var(--color-bg)", fontSize: 12, lineHeight: 1.5, boxShadow: "var(--shadow-lg)", zIndex: 20, pointerEvents: "none" }}>
    <div style={{ fontWeight: 700, marginBottom: 3 }}>{title}</div>
    <div style={{ opacity: 0.9 }}>{body}</div>
  </div>
);

const RichBars = ({ data, fmt, deltaFmt, goodWhen = "up", accent, avg, avgLabel, tip }) => {
  const [hv, setHv] = useState(null);
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value), 0);
  const H = 190, span = H - 50;
  const barH = (v) => ((v - min) / (max - min || 1)) * span + 6;
  const avgTop = avg != null ? 30 + (span + 6 - barH(avg)) : null;
  return (
    <div style={{ position: "relative", paddingTop: 30 }}>
      {avg != null && (
        <div style={{ position: "absolute", left: 0, right: 0, top: avgTop, borderTop: "2px dashed var(--color-border-strong)", zIndex: 2, pointerEvents: "none" }}>
          <span style={{ position: "absolute", right: 0, top: -10, fontSize: 11, fontWeight: 700, background: "var(--color-bg)", color: "var(--color-text-muted)", padding: "0 6px" }}>{avgLabel}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: H }}>
        {data.map((d, i) => {
          const prev = i > 0 ? data[i - 1] : null;
          return (
            <div key={i} onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(null)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end", position: "relative" }}>
              {prev && <DeltaChip text={deltaFmt(d.value, prev.value)} dir={Math.sign(d.value - prev.value)} goodWhen={goodWhen} />}
              <span style={{ fontSize: 11.5, fontWeight: 700, color: d.highlight ? accent : "var(--color-text-muted)" }}>{fmt(d.value)}</span>
              <div style={{ width: "100%", maxWidth: 42, height: barH(d.value), borderRadius: "8px 8px 4px 4px", background: d.highlight ? accent : "color-mix(in srgb, " + accent + " 24%, white)", transition: "height 300ms", zIndex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--color-text-subtle)", fontWeight: d.highlight ? 700 : 500 }}>{d.label}</span>
              {hv === i && tip && <ChartTip {...tip(d, i)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RichLine = ({ data, fmt, accent, goodWhen = "down", endTag, tip }) => {
  const [hv, setHv] = useState(null);
  const vals = data.map((d) => d.value);
  const max = Math.max(...vals), min = Math.min(...vals);
  const range = (max - min) || 1;
  const H = 200;
  const xPct = (i) => (i / (data.length - 1)) * 84 + 8;
  const yPct = (v) => (1 - (v - min) / range) * 56 + 22;
  const line = data.map((d, i) => xPct(i) + "," + yPct(d.value)).join(" ");
  const area = "8," + yPct(data[0].value) + " " + line + " 92," + yPct(data[data.length - 1].value) + " 92,100 8,100";
  return (
    <div style={{ position: "relative", height: H }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <polygon points={area} fill={accent} opacity="0.10" />
        <polyline points={line} fill="none" stroke={accent} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {data.map((d, i) => (
        <div key={i} onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(null)}
          style={{ position: "absolute", top: 0, bottom: 0, left: xPct(i) + "%", transform: "translateX(-50%)", width: 46, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: yPct(d.value) + "%", left: "50%", transform: "translate(-50%,-50%)", width: d.highlight ? 13 : 9, height: d.highlight ? 13 : 9, borderRadius: "50%", background: "var(--color-bg)", border: "2.5px solid " + accent, zIndex: 2 }} />
          <div style={{ position: "absolute", top: "calc(" + yPct(d.value) + "% - 24px)", fontSize: 12, fontWeight: 700, color: d.highlight ? accent : "var(--color-text-muted)", whiteSpace: "nowrap" }}>{fmt(d.value)}</div>
          <div style={{ position: "absolute", bottom: 0, fontSize: 12, color: "var(--color-text-subtle)", fontWeight: d.highlight ? 700 : 500 }}>{d.label}</div>
          {hv === i && tip && <div style={{ position: "absolute", top: "calc(" + yPct(d.value) + "% - 34px)", left: "50%" }}><ChartTip {...tip(d, i)} /></div>}
        </div>
      ))}
      {endTag && (
        <div style={{ position: "absolute", top: 4, right: 2, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: "var(--badge-success-bg)", color: "var(--badge-success-fg)" }}>
          <Icon name="trending-down" size={13} />{endTag}</div>
      )}
    </div>
  );
};

// Conteúdo de cada relatório
const RelatorioCobranca = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <Metric label="Emitido no mês" value={brl(39600)} sub="88 cobranças" icon="receipt" accent="var(--color-primary)" iconBg="var(--color-primary-soft)" />
      <Metric label="Recebido" value={brl(38400)} sub="97% do emitido" trend="up" icon="check-circle-2" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
      <Metric label="Pago no prazo" value="92%" sub="acima de maio" trend="up" icon="calendar-check" accent="var(--color-primary)" iconBg="var(--color-primary-soft)" />
    </div>
    <ChartCard title="Recebimento" sub="Faturamento recebido · 6 meses"
      banner={<StoryBanner icon="rocket" color="var(--badge-success-fg)" bg="var(--badge-success-bg)">Seu faturamento acumulou <strong>R$ 7.200</strong> de aumento desde janeiro e segue firme no topo neste mês.</StoryBanner>}
      data={CHART_6M}
      fmt={(v) => "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k"}
      deltaFmt={(c, p) => { const x = (c - p) / p * 100; return (x >= 0 ? "+" : "") + x.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; }}
      goodWhen="up" accent="var(--color-primary)" avg={35500} avgLabel="Média R$ 35,5k"
      tip={(d) => ({ title: d.label + ": " + brl(d.value), body: d.highlight ? "Você recebeu 97% do que foi emitido no mês — excelente consistência." : "Faturamento recebido neste mês." })} />
  </div>
);
const RelatorioInadimplencia = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <Metric label="Em atraso" value="3,1%" sub="das cobranças do mês" trend="down" icon="alert-circle" accent="var(--badge-danger-fg)" iconBg="var(--badge-danger-bg)" />
      <Metric label="Em aberto" value={brl(1200)} sub="3 cobranças vencidas" icon="clock" accent="var(--badge-warning-fg)" iconBg="var(--badge-warning-bg)" />
      <Metric label="Recuperado no mês" value={brl(2280)} sub="6 regularizações" trend="up" icon="rotate-ccw" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
    </div>
    <ChartCard title="Atrasos por mês" sub="% das cobranças em atraso · 6 meses" defaultKind="linha"
      banner={<StoryBanner icon="shield-check" color="var(--badge-success-fg)" bg="var(--badge-success-bg)">A inadimplência segue em <strong>queda controlada</strong>, protegendo o caixa do seu negócio.</StoryBanner>}
      data={REL_INADIMPLENCIA}
      fmt={(v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%"}
      deltaFmt={(c, p) => (c - p >= 0 ? "+" : "") + (c - p).toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + " p.p."}
      accent="var(--badge-danger-fg)" goodWhen="down" endTag="−26% desde Jan"
      tip={(d) => ({ title: "Atrasos em " + d.label + ": " + d.value.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%", body: d.highlight ? "Isso representa só R$ 1.200 em aberto — risco de caixa muito baixo." : "Percentual de cobranças em atraso no mês." })} />
  </div>
);
const RelatorioCrescimento = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <Metric label="Alunos ativos" value="84" sub="+5 este mês" trend="up" icon="users" accent="var(--color-primary)" iconBg="var(--color-primary-soft)" />
      <Metric label="Receita por mês" value={brl(38400)} sub="+4,2% vs. mês anterior" trend="up" icon="trending-up" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
      <Metric label="Mensalidade média" value={brl(457)} sub="por aluno" icon="circle-dollar-sign" accent="var(--color-primary)" iconBg="var(--color-primary-soft)" />
    </div>
    <ChartCard title="Alunos ativos" sub="Base matriculada · 6 meses"
      banner={<StoryBanner icon="sprout" color="var(--badge-success-fg)" bg="var(--badge-success-bg)">Sua base cresce de forma constante: você ganhou <strong>13 alunos líquidos</strong> nos últimos 6 meses.</StoryBanner>}
      data={REL_ALUNOS} fmt={(v) => v}
      deltaFmt={(c, p) => (c - p >= 0 ? "+" : "") + (c - p)}
      goodWhen="up" accent="var(--color-primary)"
      tip={(d) => ({ title: d.label + ": " + d.value + " alunos ativos", body: d.highlight ? "Sua maior base histórica registrada até hoje." : "Total de alunos ativos no mês." })} />
  </div>
);
const RelatorioCancelamentos = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <Metric label="Cancelamentos no mês" value="2" sub="−1 vs. maio" trend="down" icon="user-minus" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
      <Metric label="Alunos que ficaram" value="98,4%" sub="nos últimos 12 meses" trend="up" icon="heart" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
      <Metric label="Reativações" value="1" sub="voltou este mês" trend="up" icon="rotate-ccw" accent="var(--color-primary)" iconBg="var(--color-primary-soft)" />
    </div>
    <ChartCard title="Cancelamentos por mês" sub="% de alunos que saíram · 6 meses"
      banner={<StoryBanner icon="heart-handshake" color="var(--badge-success-fg)" bg="var(--badge-success-bg)">Sua retenção está excelente (<strong>98,4%</strong>). Os alunos estão satisfeitos e escolhendo ficar.</StoryBanner>}
      data={REL_CHURN}
      fmt={(v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%"}
      deltaFmt={(c, p) => (c - p >= 0 ? "+" : "") + (c - p).toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + " p.p."}
      goodWhen="down" accent="var(--color-success)"
      tip={(d) => ({ title: "Cancelamentos em " + d.label + ": " + d.value.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%", body: d.highlight ? "Apenas 2 saídas. Com 1 reativação, a perda real foi de 1 aluno." : "Percentual de alunos que saíram no mês." })} />
  </div>
);

// ── Relatórios v2 — foco em recuperação + tipos de gráfico ───────────────
const PieChart = ({ data, fmt, accent }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const shades = [100, 80, 62, 47, 34, 24];
  const color = (i) => "color-mix(in srgb, " + accent + " " + shades[i % shades.length] + "%, white)";
  const polar = (ang) => [50 + 33 * Math.cos(ang), 50 + 33 * Math.sin(ang)];
  let a0 = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const frac = d.value / total;
    const a1 = a0 + frac * Math.PI * 2;
    const p0 = polar(a0), p1 = polar(a1);
    const large = frac > 0.5 ? 1 : 0;
    const path = "M " + p0[0] + " " + p0[1] + " A 33 33 0 " + large + " 1 " + p1[0] + " " + p1[1];
    a0 = a1;
    return { path, c: color(i), d };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", padding: "16px 0" }}>
      <svg viewBox="0 0 100 100" style={{ width: 172, height: 172, flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.path} fill="none" stroke={a.c} strokeWidth="15" />)}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 22px", flex: 1, minWidth: 220 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: a.c, flexShrink: 0 }} />
            <span style={{ color: "var(--color-text-muted)", flex: 1 }}>{a.d.label}</span>
            <span style={{ fontWeight: 700 }}>{fmt(a.d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CHART_KINDS = [{ value: "barra", label: "Barras" }, { value: "linha", label: "Linha" }, { value: "pizza", label: "Pizza" }];
const ChartCard = ({ title, sub, banner, data, fmt, accent, goodWhen, deltaFmt, avg, avgLabel, endTag, tip, defaultKind = "barra" }) => {
  const [kind, setKind] = useState(defaultKind);
  return (
    <Card style={{ padding: 22 }}>
      <SectionHead title={title} sub={sub} action={<Segmented size="sm" value={kind} onChange={setKind} options={CHART_KINDS} />} />
      {banner}
      <div style={{ marginTop: 12 }}>
        {kind === "barra" && <RichBars data={data} fmt={fmt} deltaFmt={deltaFmt} goodWhen={goodWhen} accent={accent} avg={avg} avgLabel={avgLabel} tip={tip} />}
        {kind === "linha" && <RichLine data={data} fmt={fmt} accent={accent} goodWhen={goodWhen} endTag={endTag} tip={tip} />}
        {kind === "pizza" && <PieChart data={data} fmt={fmt} accent={accent} />}
      </div>
    </Card>
  );
};

const RECOVERY_FUNNEL = [
  { ic: "alert-triangle", c: "var(--badge-danger-fg)", bg: "var(--badge-danger-bg)", k: "Venceu no período", v: 23700, s: "atrasos gerados no ano" },
  { ic: "bell-ring", c: "var(--color-primary)", bg: "var(--color-primary-soft)", k: "Recuperado na régua", v: 18460, s: "78% · sem negativar" },
  { ic: "gavel", c: "var(--badge-warning-fg)", bg: "var(--badge-warning-bg)", k: "Foram p/ negativação", v: 5240, s: "3 responsáveis" },
  { ic: "rotate-ccw", c: "var(--badge-success-fg)", bg: "var(--badge-success-bg)", k: "Quitado após aviso", v: 2280, s: "regularizado" },
];
const RecoveryHero = () => (
  <Card style={{ padding: 0, overflow: "hidden" }}>
    <div style={{ background: "var(--color-primary)", color: "#fff", padding: 26, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ minWidth: 260 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.85 }}>Recuperado em 2026</div>
        <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6, lineHeight: 1 }}>{brl(20740)}</div>
        <div style={{ fontSize: 14.5, opacity: 0.92, marginTop: 10, maxWidth: 470, lineHeight: 1.5 }}>
          que viraria prejuízo silencioso — recuperado automaticamente pela régua de avisos, sem você correr atrás.</div>
      </div>
      <span style={{ width: 84, height: 84, borderRadius: 20, background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="shield-check" size={42} /></span>
    </div>
    <div style={{ padding: 22 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-subtle)", marginBottom: 12 }}>Funil de recuperação</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {RECOVERY_FUNNEL.map((st) => (
          <div key={st.k} style={{ flex: 1, minWidth: 158, border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: st.bg, color: st.c, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><Icon name={st.ic} size={18} /></span>
            <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", fontWeight: 600 }}>{st.k}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 2 }}>{brl(st.v)}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 2 }}>{st.s}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 11, alignItems: "flex-start", padding: "14px 16px", borderRadius: "var(--radius-md)", background: "var(--badge-success-bg)" }}>
        <Icon name="trending-down" size={18} color="var(--badge-success-fg)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.5 }}>
          A inadimplência média do setor (<strong>12%</strong>) custaria cerca de <strong>R$ 55 mil/ano</strong>. Você está em <strong>3,1%</strong> — a régua automática protegeu aproximadamente <strong>R$ 41 mil</strong> do seu caixa.</span>
      </div>
    </div>
  </Card>
);

const RelatorioV2 = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <RecoveryHero />
    <ChartCard title="Recebimento" sub="Faturamento recebido · 6 meses"
      banner={<StoryBanner icon="rocket" color="var(--badge-success-fg)" bg="var(--badge-success-bg)">Seu faturamento acumulou <strong>R$ 7.200</strong> de aumento desde janeiro.</StoryBanner>}
      data={CHART_6M} fmt={(v) => "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k"}
      deltaFmt={(c, p) => { const x = (c - p) / p * 100; return (x >= 0 ? "+" : "") + x.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; }}
      goodWhen="up" accent="var(--color-primary)" avg={35500} avgLabel="Média R$ 35,5k"
      tip={(d) => ({ title: d.label + ": " + brl(d.value), body: "Faturamento recebido no mês." })} />
    <ChartCard title="Inadimplência" sub="% das cobranças em atraso · 6 meses" defaultKind="linha"
      banner={<StoryBanner icon="shield-check" color="var(--badge-success-fg)" bg="var(--badge-success-bg)">Inadimplência em <strong>queda de 26%</strong> desde janeiro.</StoryBanner>}
      data={REL_INADIMPLENCIA} fmt={(v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%"}
      accent="var(--badge-danger-fg)" goodWhen="down" endTag="−26% desde Jan"
      deltaFmt={(c, p) => (c - p >= 0 ? "+" : "") + (c - p).toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + " p.p."}
      tip={(d) => ({ title: "Atrasos em " + d.label + ": " + d.value.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%", body: "Cobranças em atraso no mês." })} />
    <ChartCard title="Alunos ativos" sub="Base matriculada · 6 meses"
      banner={<StoryBanner icon="sprout" color="var(--badge-success-fg)" bg="var(--badge-success-bg)">Você ganhou <strong>13 alunos líquidos</strong> em 6 meses.</StoryBanner>}
      data={REL_ALUNOS} fmt={(v) => v} deltaFmt={(c, p) => (c - p >= 0 ? "+" : "") + (c - p)} goodWhen="up" accent="var(--color-primary)"
      tip={(d) => ({ title: d.label + ": " + d.value + " alunos", body: "Alunos ativos no mês." })} />
    <ChartCard title="Cancelamentos" sub="% de alunos que saíram · 6 meses"
      banner={<StoryBanner icon="heart-handshake" color="var(--badge-success-fg)" bg="var(--badge-success-bg)">Retenção excelente: <strong>98,4%</strong> dos alunos ficaram.</StoryBanner>}
      data={REL_CHURN} fmt={(v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%"}
      deltaFmt={(c, p) => (c - p >= 0 ? "+" : "") + (c - p).toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + " p.p."} goodWhen="down" accent="var(--color-success)"
      tip={(d) => ({ title: "Cancelamentos em " + d.label + ": " + d.value.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%", body: "Alunos que saíram no mês." })} />
  </div>
);

const DASH_TABS = [
  { value: "visao", label: "Dashboard" },
  { value: "relatorios", label: "Relatórios" },
  { value: "extrato", label: "Extrato" },
];

// Próximos vencimentos agrupados por responsável (até 5 alunos por responsável)
const VENC_ROWS = [
  { resp: "Carlos Andrade", alunos: ["Beatriz", "Lucas"], venc: "05/06", valor: 900, forma: "Boleto" },
  { resp: "Patrícia Lopes", alunos: ["Théo"], venc: "05/06", valor: 380, forma: "PIX" },
  { resp: "Maria Silva", alunos: ["João", "Helena", "Pedro"], venc: "07/06", valor: 1350, forma: "PIX" },
  { resp: "Rodrigo Nunes", alunos: ["Helena"], venc: "08/06", valor: 600, forma: "Boleto" },
  { resp: "Fernanda Dias", alunos: ["Miguel", "Laura"], venc: "10/06", valor: 760, forma: "PIX" },
  { resp: "Juliana Castro", alunos: ["Sofia", "Enzo", "Valentina", "Heitor", "Alice"], venc: "10/06", valor: 2100, forma: "Boleto" },
  { resp: "Bruno Ferreira", alunos: ["Davi"], venc: "12/06", valor: 450, forma: "PIX" },
  { resp: "Aline Rocha", alunos: ["Manuela", "Bernardo"], venc: "12/06", valor: 820, forma: "Cartão" },
  { resp: "Gustavo Pinto", alunos: ["Arthur"], venc: "13/06", valor: 380, forma: "Boleto" },
  { resp: "Camila Souza", alunos: ["Cecília", "Gael", "Maria"], venc: "15/06", valor: 1290, forma: "PIX" },
  { resp: "Diego Martins", alunos: ["Antônio"], venc: "15/06", valor: 450, forma: "Cartão" },
  { resp: "Renata Lima", alunos: ["Isabela", "Lorenzo"], venc: "18/06", valor: 760, forma: "PIX" },
  { resp: "Felipe Gomes", alunos: ["Benício"], venc: "20/06", valor: 380, forma: "Boleto" },
  { resp: "Tânia Barros", alunos: ["Maitê", "Noah", "Liz", "Caio"], venc: "22/06", valor: 1680, forma: "Boleto" },
];

const C0Dashboard = ({ go, toast }) => {
  const [exp, setExp] = useState(false);
  // Próximos vencimentos: busca / filtro / paginação
  const [vQ, setVQ] = useState("");
  const [vForma, setVForma] = useState("todas");
  const [vPage, setVPage] = useState(0);
  const [vSort, setVSort] = useState({ key: "venc", dir: "asc" });
  const V_COLS = [
    { h: "Responsável", key: "resp", align: "left", val: (v) => v.resp.toLowerCase() },
    { h: "Alunos", key: "alunos", align: "left", val: (v) => v.alunos.length },
    { h: "Vencimento", key: "venc", align: "left", val: (v) => { const p = v.venc.split("/").map(Number); return p[1] * 100 + p[0]; } },
    { h: "Valor", key: "valor", align: "right", val: (v) => v.valor },
  ];
  const toggleSort = (key) => setVSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  const vFiltered = VENC_ROWS.filter((v) => {
    const okForma = vForma === "todas" || v.forma === vForma;
    const term = vQ.trim().toLowerCase();
    const okQ = term === "" || v.resp.toLowerCase().includes(term) ||
      v.alunos.some((a) => a.toLowerCase().includes(term));
    return okForma && okQ;
  });
  const vSortCol = V_COLS.find((c) => c.key === vSort.key) || V_COLS[0];
  const vSorted = [...vFiltered].sort((a, b) => {
    const av = vSortCol.val(a), bv = vSortCol.val(b);
    const r = av < bv ? -1 : av > bv ? 1 : 0;
    return vSort.dir === "asc" ? r : -r;
  });
  const V_PER = 6;
  const vPageCount = Math.max(1, Math.ceil(vSorted.length / V_PER));
  const vCur = Math.min(vPage, vPageCount - 1);
  const vRows = vSorted.slice(vCur * V_PER, vCur * V_PER + V_PER);
  return (
  <Shell screen="c0" go={go} showMonth title="Dashboard" subtitle="Visão da unidade Kumon Camargos"
    actions={<Button variant="secondary" iconLeft="download" onClick={() => setExp(true)}>Exportar</Button>}>
    <>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 26 }}>
      <Metric label="Recebido no mês" value={brl(38400)} sub="+4,2% vs. maio" trend="up" icon="wallet" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
      <Metric label="A vencer" value={brl(12600)} sub="28 cobranças" icon="clock" accent="var(--badge-warning-fg)" iconBg="var(--badge-warning-bg)" />
      <Metric label="Vencido" value={brl(1200)} sub="3 em atraso" trend="down" icon="alert-circle" accent="var(--badge-danger-fg)" iconBg="var(--badge-danger-bg)" />
      <Metric label="Alunos ativos" value="84" sub="+5 este mês" trend="up" icon="users" accent="var(--color-primary)" iconBg="var(--color-primary-soft)" />
    </div>
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px 0" }}>
        <SectionHead title="Próximos vencimentos" action={<Button variant="tertiary" size="sm" iconRight="arrow-right" onClick={() => go("c3")}>Ver todas</Button>} />
      </div>
      {/* toolbar: busca + filtro */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "2px 22px 16px" }}>
        <Input value={vQ} onChange={(e) => { setVQ(e.target.value); setVPage(0); }} leadingIcon="search"
          placeholder="Buscar por responsável ou aluno" style={{ flex: "1 1 240px", maxWidth: 340, height: 42 }} />
        <Segmented style={{ marginLeft: "auto" }} value={vForma} onChange={(v) => { setVForma(v); setVPage(0); }}
          options={[{ value: "todas", label: "Todas" }, { value: "PIX", label: "PIX" }, { value: "Boleto", label: "Boleto" }, { value: "Cartão", label: "Cartão" }]} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr style={{ background: "var(--color-surface)" }}>
              {V_COLS.map((c) => {
                const on = vSort.key === c.key;
                return (
                  <th key={c.key} onClick={() => toggleSort(c.key)} style={{ textAlign: c.align, padding: "11px 16px", fontSize: 11.5,
                    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: on ? "var(--color-primary)" : "var(--color-text-subtle)",
                    borderBottom: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {c.h}<Icon name={on ? (vSort.dir === "asc" ? "chevron-up" : "chevron-down") : "chevrons-up-down"} size={13} color={on ? "var(--color-primary)" : "var(--color-text-subtle)"} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {vRows.map((v, i) => (
              <tr key={v.resp} onClick={() => go("c4")} style={{ cursor: "pointer",
                borderBottom: i < vRows.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}>
                <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>{v.resp}</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {v.alunos.slice(0, 5).map((a) => (
                      <span key={a} style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
                        background: "var(--color-primary-soft)", color: "var(--color-primary-hover)", whiteSpace: "nowrap" }}>{a}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13.5, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                  {v.venc}<span style={{ color: "var(--color-text-subtle)", marginLeft: 8, fontSize: 12.5 }}>· {v.forma}</span></td>
                <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{brl(v.valor)}</td>
              </tr>
            ))}
            {vRows.length === 0 && (
              <tr><td colSpan={4} style={{ padding: "36px 22px", textAlign: "center", color: "var(--color-text-subtle)", fontSize: 14 }}>
                Nenhum vencimento encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* paginação (sempre) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 22px", borderTop: "1px solid var(--color-border-muted)" }}>
        <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>
          {vFiltered.length === 0 ? "0 responsáveis" :
            `${vCur * V_PER + 1}–${Math.min(vCur * V_PER + V_PER, vFiltered.length)} de ${vFiltered.length} responsáveis`}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variant="tertiary" size="sm" iconLeft="chevron-left" disabled={vCur === 0} onClick={() => setVPage(vCur - 1)}>Anterior</Button>
          {Array.from({ length: vPageCount }).map((_, i) => (
            <button key={i} onClick={() => setVPage(i)}
              style={{ width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600,
                border: `1px solid ${i === vCur ? "var(--color-primary)" : "var(--color-border)"}`,
                background: i === vCur ? "var(--color-primary)" : "var(--color-bg)",
                color: i === vCur ? "#fff" : "var(--color-text-muted)" }}>{i + 1}</button>
          ))}
          <Button variant="tertiary" size="sm" iconRight="chevron-right" disabled={vCur >= vPageCount - 1} onClick={() => setVPage(vCur + 1)}>Próxima</Button>
        </div>
      </div>
    </Card>
    </>
    <ExportModal open={exp} onClose={() => setExp(false)} toast={toast} what="relatório" />
  </Shell>
  );
};

const REP_TABS = [
  { value: "cobranca", label: "Cobrança" },
  { value: "inadimplencia", label: "Inadimplência" },
  { value: "crescimento", label: "Crescimento" },
  { value: "cancelamentos", label: "Cancelamentos" },
];
const RelatoriosPage = ({ go, toast }) => {
  const [exp, setExp] = useState(false);
  const [tab, setTab] = useState("cobranca");
  return (
    <Shell screen="rep" go={go} showMonth title="Relatórios" subtitle="Desempenho financeiro e de matrículas da unidade"
      actions={<Button variant="secondary" iconLeft="download" onClick={() => setExp(true)}>Exportar</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ overflowX: "auto", paddingBottom: 2 }}>
          <Segmented value={tab} onChange={setTab} options={REP_TABS} />
        </div>
        {tab === "cobranca" && <RelatorioCobranca />}
        {tab === "inadimplencia" && <RelatorioInadimplencia />}
        {tab === "crescimento" && <RelatorioCrescimento />}
        {tab === "cancelamentos" && <RelatorioCancelamentos />}
      </div>
      <ExportModal open={exp} onClose={() => setExp(false)} toast={toast} what="relatório" />
    </Shell>
  );
};

const ExtratoPage = ({ go }) => (
  <Shell screen="ext" go={go} showMonth title="Extrato" subtitle="Todas as entradas e saídas da conta">
    <ExtratoTab />
  </Shell>
);

/* ─── C1 Matrículas (todos os pagantes) ────────────────────────────────── */
const LinkMatriculaModal = ({ open, onClose, toast }) => {
  const [copied, setCopied] = useState(false);
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const link = "educationhub.app/matricula/kumon-camargos?ref=fr2026";
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div style={{ padding: 26 }}>
        <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Icon name="link" size={22} color="var(--color-primary)" /></div>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Link de nova matrícula</h3>
        <p style={{ margin: "8px 0 20px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
          Envie ao responsável. Ele preenche os dados pelo celular e a matrícula volta para você aprovar.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border-input)", background: "var(--color-surface)", marginBottom: 16 }}>
          <Icon name="link-2" size={16} color="var(--color-text-subtle)" />
          <span style={{ flex: 1, fontSize: 13.5, fontFamily: "var(--font-mono)", color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{link}</span>
          <Button variant="secondary" size="sm" iconLeft={copied ? "check" : "copy"}
            onClick={() => { setCopied(true); toast("Link copiado", "info"); setTimeout(() => setCopied(false), 1600); }}>{copied ? "Copiado" : "Copiar"}</Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="WhatsApp do responsável" hint="Opcional — informe para enviar direto">
            <Input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="(31) 90000-0000" leadingIcon="phone"
              trailing={<Button size="sm" iconLeft="message-circle" onClick={() => { toast(tel ? `Abrindo WhatsApp para ${tel}…` : "Abrindo WhatsApp com o link…", "success"); onClose(); }} style={{ background: "#25D366", border: "none" }}>Enviar</Button>} />
          </Field>
          <Field label="E-mail do responsável" hint="Opcional — informe para enviar direto">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@exemplo.com" leadingIcon="mail"
              trailing={<Button size="sm" variant="secondary" iconLeft="send" onClick={() => { toast(email ? `Link enviado para ${email}` : "Link enviado por e-mail", "success"); onClose(); }}>Enviar</Button>} />
          </Field>
        </div>
      </div>
    </Modal>
  );
};

const C1Pendentes = ({ go, setSel }) => {
  const [filter, setFilter] = useState("todas");
  const [linkOpen, setLinkOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PER_PAGE = 8;
  const [toast, setToast] = useState(null);
  const showToast = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600); };
  const counts = {
    todas: MATRICULAS.length,
    aguardando: MATRICULAS.filter((m) => m.status === "aguardando").length,
    ativas: MATRICULAS.filter((m) => m.status === "ativa").length,
    pendentes: MATRICULAS.filter((m) => m.status === "pendente").length,
    canceladas: MATRICULAS.filter((m) => m.status === "cancelada").length,
  };
  const filteredByStatus = MATRICULAS.filter((m) => filter === "todas" ? true : filter === "aguardando" ? m.status === "aguardando" : filter === "ativas" ? m.status === "ativa" : filter === "pendentes" ? m.status === "pendente" : m.status === "cancelada");
  const q = search.trim().toLowerCase();
  const allRows = !q ? filteredByStatus : filteredByStatus.filter((m) =>
    m.pagante.toLowerCase().includes(q) || m.aluno.toLowerCase().includes(q) ||
    (m.email && m.email.toLowerCase().includes(q)) || (m.cpf && m.cpf.replace(/\D/g, "").includes(q.replace(/\D/g, "")) && q.replace(/\D/g, "").length > 0));
  const pages = Math.ceil(allRows.length / PER_PAGE) || 1;
  const safePage = Math.min(page, pages - 1);
  const rows = allRows.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);
  return (
    <Shell screen="c1" go={go} title="Matrículas"
      actions={<div style={{ display: "flex", gap: 10 }}>
        <Button variant="secondary" iconLeft="link" onClick={() => setLinkOpen(true)}>Gerar link</Button>
        <Button iconLeft="plus" onClick={() => go("c6")}>Nova matrícula</Button>
      </div>}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <Segmented value={filter} onChange={(v) => { setFilter(v); setPage(0); }} options={[
          { value: "todas", label: "Todas", count: counts.todas },
          { value: "aguardando", label: "Aguardando", count: counts.aguardando },
          { value: "pendentes", label: "Pendentes", count: counts.pendentes },
          { value: "ativas", label: "Ativas", count: counts.ativas },
          { value: "canceladas", label: "Cancelados", count: counts.canceladas },
        ]} />
        <div style={{ width: 320, maxWidth: "100%" }}>
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por nome, e-mail ou CPF…" leadingIcon="search" />
        </div>
      </div>
      <DataTable cols={[
        { label: "Pagante" }, { label: "Aluno" }, { label: "Plano" }, { label: "Status" }, { label: "", align: "right", w: 130 },
      ]}>
        {rows.map((m) => (
          <TrHover key={m.id}>
            <Td>
              <Person name={m.pagante} sub={m.selfPayer ? "Próprio aluno · paga a si" : m.tel} />
            </Td>
            <Td>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{m.aluno}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                {m.materias.map((mat) => {
                  const c = mat === "Matemática" ? "#00A9E3" : mat === "Português" ? "#FCC000" : mat === "Inglês" ? "#E42618" : mat === "Japonês" ? "#83B81A" : "#00A9E3";
                  return <span key={mat} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: c + "18", color: c, border: `1px solid ${c}40` }}>{mat}</span>;
                })}
              </div>
            </Td>
            <Td><span style={{ fontWeight: 600 }}>{m.plano}</span><div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>{brl(m.valor)}{m.plano !== "Mensal" ? " total" : "/mês"}</div></Td>
            <Td>
              {m.status === "pendente"
                ? <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                    <Badge variant="warning" dot>Aguardando sua aprovação</Badge>
                    {m.editado && m.editado.length > 0 && (
                      <span style={{ fontSize: 11.5, color: "var(--color-primary)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Icon name="pencil-line" size={12} />Editada pelo responsável</span>
                    )}
                  </div>
                : m.status === "aguardando"
                  ? <Badge variant="info" dot>Aguardando responsável</Badge>
                : m.status === "cancelada"
                  ? <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                      <Badge variant="neutral" dot>Cancelada</Badge>
                      <span style={{ fontSize: 11.5, color: "var(--color-text-subtle)" }}>{m.motivo}</span>
                    </div>
                  : <Badge variant="success" dot>Ativa</Badge>}
            </Td>
            <Td align="right">
              {m.status === "pendente"
                ? <Button size="sm" iconRight="chevron-right" onClick={() => { setSel(m.id); go("c2"); }}>Revisar</Button>
                : m.status === "aguardando"
                  ? <Button variant="secondary" size="sm" iconLeft="send" onClick={() => showToast(`Link reenviado para ${m.pagante}`, "info")}>Reenviar link</Button>
                : m.status === "cancelada"
                  ? <Button variant="tertiary" size="sm" iconLeft="eye" onClick={() => { setSel(m.id); go("c2"); }}>Ver</Button>
                  : <Button variant="tertiary" size="sm" iconLeft="pencil" onClick={() => { setSel(m.id); go("c2"); }}>Editar</Button>}
            </Td>
          </TrHover>
        ))}
      </DataTable>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>{allRows.length} matrícula{allRows.length !== 1 ? "s" : ""}{q ? " encontrada" + (allRows.length !== 1 ? "s" : "") : ""}</span>
        {pages > 1 && (
          <Pagination page={safePage} pages={pages} onChange={setPage} />
        )}
      </div>
      <LinkMatriculaModal open={linkOpen} onClose={() => setLinkOpen(false)} toast={showToast} />
      <Toast toast={toast} />
    </Shell>
  );
};

/* ─── C2 Revisar matrícula ─────────────────────────────────────────────── */
const SUBJECTS_C2 = [["Matemática", "#00A9E3"], ["Português", "#FCC000"], ["Inglês", "#E42618"], ["Japonês", "#83B81A"]];
const Row2c2 = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>;

const C2Revisar = ({ go, sel, toast }) => {
  const m = MATRICULAS.find((x) => x.id === sel) || PENDENTES[0];
  const isApproval = m.status === "pendente";
  const [modal, setModal] = useState(null); // 'recusar' | 'aprovar'
  const [aprovando, setAprovando] = useState(false);
  const [resp, setResp] = useState({ pagante: m.pagante, cpf: m.cpf, email: m.email, tel: m.tel });
  const [alunos, setAlunos] = useState([{ aluno: m.aluno, nascimento: m.nascimento, materias: [...m.materias], plano: m.plano, desconto: false, descontoTipo: "percent", descontoVal: "0" }]);
  const setRespField = (k) => (e) => setResp({ ...resp, [k]: e.target.value });
  const setAlunoField = (i, k, v) => setAlunos((a) => a.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const toggleMat = (i, mat) => setAlunos((a) => a.map((s, j) => (j === i ? { ...s, materias: s.materias.includes(mat) ? s.materias.filter((x) => x !== mat) : [...s.materias, mat] } : s)));
  const addAluno = () => alunos.length < 5 && setAlunos([...alunos, { aluno: "", nascimento: "", materias: ["Matemática"], plano: "Mensal", desconto: false, descontoTipo: "percent", descontoVal: "0" }]);
  const removeAluno = (i) => setAlunos((a) => a.filter((_, j) => j !== i));

  const planoDe = (s) => PLANOS.find((p) => p.nome === s.plano) || PLANOS[0];
  const descValorDe = (s) => {
    if (!s.desconto) return 0;
    const n = parseFloat((s.descontoVal || "0").replace(/\./g, "").replace(",", ".")) || 0;
    return s.descontoTipo === "percent" ? planoDe(s).parcela * n / 100 : n;
  };
  const mensalDe = (s) => Math.max(0, planoDe(s).parcela - descValorDe(s));
  const totalMensal = alunos.reduce((sum, s) => sum + mensalDe(s), 0);

  return (
    <Shell screen="c2" go={go} back={() => go("c1")} title={isApproval ? "Revisar matrícula" : "Editar matrícula"} subtitle={`${m.pagante} · ${alunos.length} aluno${alunos.length > 1 ? "s" : ""}`} maxWidth={760}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {m.aceiteEm && (
        <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, background: "var(--badge-success-bg)", border: "1px solid #A6E3C8" }}>
          <Icon name="file-check-2" size={20} color="var(--badge-success-fg)" />
          <span style={{ fontSize: 13.5, color: "var(--badge-success-fg)", fontWeight: 600 }}>Responsável aceitou os termos em {m.aceiteEm} — aceite registrado (prova legal).</span>
        </Card>
        )}

        {isApproval && m.editado && m.editado.length > 0 && (
        <Card style={{ padding: 16, display: "flex", alignItems: "flex-start", gap: 12, background: "var(--color-toast-info-bg)", border: "1px solid var(--color-primary-soft)" }}>
          <Icon name="pencil-line" size={19} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            O responsável <strong style={{ color: "var(--color-text)" }}>editou {m.editado.join(" e ")}</strong> ao confirmar — confira se foi correção legítima ou erro de digitação do cadastro original.</span>
        </Card>
        )}

        {m.selfPayer && (
          <Card style={{ padding: 14, display: "flex", alignItems: "center", gap: 11, background: "var(--color-primary-softer)", border: "1px solid var(--color-primary-soft)" }}>
            <Icon name="user-check" size={18} color="var(--color-primary)" />
            <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>Aluno adulto: <strong style={{ color: "var(--color-text)" }}>{m.aluno}</strong> é o próprio pagante.</span>
          </Card>
        )}

        <Card style={{ padding: 24 }}>
          <SectionHead title={m.selfPayer ? "Pagante (próprio aluno)" : "Responsável financeiro"} sub="Edite os dados antes de aprovar" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Row2c2>
              <Field label="Nome" required><Input value={resp.pagante} onChange={setRespField("pagante")} leadingIcon="user" /></Field>
              <Field label="CPF" hint="Sempre mascarado — o dado completo só vai criptografado ao Asaas">
                <Input value={maskCpf(resp.cpf)} disabled leadingIcon="lock" onChange={() => {}} /></Field>
            </Row2c2>
            <Row2c2>
              <Field label="E-mail" required><Input value={resp.email} onChange={setRespField("email")} type="email" leadingIcon="mail" /></Field>
              <Field label="Telefone"><Input value={resp.tel} onChange={setRespField("tel")} inputMode="tel" leadingIcon="phone" /></Field>
            </Row2c2>
          </div>
        </Card>

        {alunos.map((s, i) => (
          <Card key={i} style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--color-primary-soft)", color: "var(--color-primary-hover)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
                Aluno {i + 1}</h3>
              {alunos.length > 1 && <Button variant="tertiary" size="sm" iconLeft="trash-2" onClick={() => removeAluno(i)} style={{ color: "var(--color-danger-primary)" }}>Remover</Button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Row2c2>
                <Field label="Nome do aluno" required><Input value={s.aluno} onChange={(e) => setAlunoField(i, "aluno", e.target.value)} placeholder="Ex.: João Silva" leadingIcon="graduation-cap" /></Field>
                <Field label="Data de nascimento"><Input value={s.nascimento} onChange={(e) => setAlunoField(i, "nascimento", e.target.value)} placeholder="DD/MM/AAAA" inputMode="numeric" leadingIcon="calendar" /></Field>
              </Row2c2>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted-strong)", display: "block", marginBottom: 10 }}>Matérias</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  {SUBJECTS_C2.map(([mat, color]) => (
                    <Chip key={mat} label={mat} color={color} active={s.materias.includes(mat)} onClick={() => toggleMat(i, mat)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted-strong)", display: "block", marginBottom: 10 }}>Plano</label>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <Segmented key={s.plano + i} value={s.plano} onChange={(v) => setAlunoField(i, "plano", v)} options={PLANOS.map((p) => p.nome)} size="sm" />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>Mensalidade cheia</div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(planoDe(s).parcela)}<span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-text-subtle)" }}>/mês</span></div>
                  </div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--color-border-muted)", paddingTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: s.desconto ? 14 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Desconto de negociação</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 2 }}>Por aluno · em % ou R$</div>
                  </div>
                  <Toggle checked={!!s.desconto} onChange={(v) => { setAlunoField(i, "desconto", v); setAlunoField(i, "descontoVal", "0"); }} />
                </div>
                {s.desconto && (
                  <>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Segmented key={s.descontoTipo + i} value={s.descontoTipo} onChange={(v) => setAlunoField(i, "descontoTipo", v)}
                        options={[{ value: "percent", label: "%" }, { value: "fixed", label: "R$" }]} size="sm" />
                      <Input value={s.descontoVal} onChange={(e) => setAlunoField(i, "descontoVal", e.target.value)} inputMode="decimal"
                        leadingIcon={s.descontoTipo === "fixed" ? "circle-dollar-sign" : undefined}
                        trailing={s.descontoTipo === "percent" ? <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted)" }}>%</span> : null}
                        style={{ flex: 1 }} placeholder={s.descontoTipo === "percent" ? "10" : "50,00"} />
                    </div>
                    <div style={{ marginTop: 14, borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                      {[["Mensalidade cheia", brl(planoDe(s).parcela), false],
                        ["Desconto", "− " + brl(descValorDe(s)), false],
                        ["Mensalidade com desconto", brl(mensalDe(s)), true]].map(([k, v, hi]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: hi ? 15 : 13.5,
                          background: hi ? "var(--color-primary-softer)" : "var(--color-bg)", borderTop: hi ? "1px solid var(--color-border)" : "none" }}>
                          <span style={{ color: hi ? "var(--color-text)" : "var(--color-text-subtle)", fontWeight: hi ? 700 : 400 }}>{k}</span>
                          <span style={{ fontWeight: hi ? 800 : 600, color: hi ? "var(--color-primary)" : "var(--color-text)" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Card style={{ padding: 20, background: "var(--color-primary)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>Total mensal da matrícula</div>
            <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 2 }}>{alunos.length} aluno{alunos.length > 1 ? "s" : ""} · já com descontos aplicados</div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(totalMensal)}<span style={{ fontSize: 14, fontWeight: 500, opacity: 0.85 }}>/mês</span></div>
        </Card>

        {alunos.length < 5
          ? <Button variant="secondary" iconLeft="user-plus" onClick={addAluno} style={{ alignSelf: "flex-start" }}>Adicionar aluno</Button>
          : <div style={{ fontSize: 13, color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="info" size={15} color="var(--color-text-subtle)" />Limite de 5 alunos por responsável atingido.</div>}

        {isApproval ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <Button variant="danger-outline" iconLeft="x" onClick={() => setModal("recusar")}>Recusar</Button>
            <Button size="lg" iconLeft="check" onClick={() => setModal("aprovar")}>Aprovar matrícula</Button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button variant="tertiary" onClick={() => go("c1")}>Cancelar</Button>
            <Button size="lg" iconLeft="save" onClick={() => { toast("Alterações salvas", "success"); go("c1"); }}>Salvar alterações</Button>
          </div>
        )}
      </div>
      <Modal open={modal === "aprovar"} onClose={() => !aprovando && setModal(null)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="check-circle-2" size={22} color="var(--color-primary)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Aprovar matrícula?</h3>
          <p style={{ margin: "8px 0 16px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            Ao aprovar, criamos o cadastro de cobrança no Asaas para <strong style={{ color: "var(--color-text)" }}>{resp.pagante}</strong> e a matrícula fica ativa — a 1ª cobrança sai no próximo fechamento.</p>
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", fontSize: 12.5, color: "var(--color-text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
            Se o responsável já tem cadastro de cobrança, ele é reaproveitado — nada é duplicado.</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" disabled={aprovando} onClick={() => setModal(null)}>Cancelar</Button>
            <Button iconLeft="check" disabled={aprovando} onClick={() => { setAprovando(true); setTimeout(() => { setAprovando(false); setModal(null); toast(`Matrícula aprovada. ${resp.pagante} já pode ser cobrado.`, "success"); go("c1"); }, 1100); }}>
              {aprovando ? "Criando cadastro no Asaas…" : "Aprovar"}</Button>
          </div>
        </div>
      </Modal>
      <Modal open={modal === "recusar"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="alert-triangle" size={22} color="var(--color-danger-primary)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Recusar matrícula?</h3>
          <p style={{ margin: "8px 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            O responsável será avisado de que o cadastro precisa de ajustes. Esta ação não gera cobrança.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { setModal(null); toast("Matrícula recusada", "warning"); go("c1"); }}>Recusar</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};

/* ─── C3 Lista de cobranças ────────────────────────────────────────────── */
const C3Cobrancas = ({ go, setSel, initialTab = "cobrancas", initialSearch = "", onVerCobrancas }) => {
  const isNeg = initialTab === "negativacao";
  const [filter, setFilter] = useState("todas");
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(0);
  const [emitir, setEmitir] = useState(null); // 'avulsa'
  const [toastC3, setToastC3] = useState(null);
  const showToastC3 = (msg, type) => { setToastC3({ msg, type }); setTimeout(() => setToastC3(null), 3600); };
  const PER_PAGE = 6;
  const counts = {
    todas: COBRANCAS.length,
    avencer: COBRANCAS.filter((c) => c.status === "avencer").length,
    pagas: COBRANCAS.filter((c) => c.status === "paga").length,
    vencidas: COBRANCAS.filter((c) => c.status === "vencida").length,
  };
  const byStatus = COBRANCAS.filter((c) => filter === "todas" ? true
    : filter === "avencer" ? c.status === "avencer"
    : filter === "pagas" ? c.status === "paga"
    : c.status === "vencida");
  const cq = search.trim().toLowerCase();
  const allRows = !cq ? byStatus : byStatus.filter((c) => c.resp.toLowerCase().includes(cq) || c.aluno.toLowerCase().includes(cq) || (c.desc && c.desc.toLowerCase().includes(cq)));
  const pages = Math.ceil(allRows.length / PER_PAGE) || 1;
  const safePage = Math.min(page, pages - 1);
  const rows = allRows.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);
  const negCount = INADIMPLENTES.filter((i) => i.status === "elegivel").length;
  return (
    <Shell screen={isNeg ? "d0" : "c3"} go={go}
      title={isNeg ? "Cobrança" : (initialSearch ? `Cobranças de ${initialSearch}` : "Cobranças")}
      subtitle={isNeg ? "Por responsável — pausar régua, acompanhar negativação e ver os boletos do mês" : "Mensalidades e cobranças avulsas da unidade"}>
      {isNeg ? <NegativacaoBody go={go} setSel={setSel} onVerCobrancas={onVerCobrancas} /> : (
      <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <MonthPicker />
        <Button variant="secondary" iconLeft="receipt" onClick={() => setEmitir("avulsa")}>Emitir avulsa</Button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 300, maxWidth: "100%" }}>
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por responsável ou aluno…" leadingIcon="search" />
        </div>
        <Segmented key={filter + "f"} value={filter} onChange={(v) => { setFilter(v); setPage(0); }} options={[
          { value: "todas", label: "Todas", count: counts.todas },
          { value: "avencer", label: "A vencer", count: counts.avencer },
          { value: "pagas", label: "Pagas", count: counts.pagas },
          { value: "vencidas", label: "Vencidas", count: counts.vencidas },
        ]} />
      </div>
      <DataTable cols={[
        { label: "Responsável" }, { label: "Aluno" }, { label: "Matéria" }, { label: "Valor", align: "right" }, { label: "Vencimento" }, { label: "Status" }, { label: "", align: "right" },
      ]}>
        {rows.map((c) => (
          <TrHover key={c.id} onClick={() => { setSel(c.id); go("c4"); }}>
            <Td><Person name={c.resp} /></Td>
            <Td><span style={{ color: "var(--color-text-muted)" }}>{c.aluno}</span></Td>
            <Td><span style={{ color: "var(--color-text-muted)", fontSize: 13.5 }}>{c.materia || "—"}</span></Td>
            <Td align="right"><span style={{ fontWeight: 700 }}>{brl(c.valor)}</span></Td>
            <Td><span style={{ color: c.status === "vencida" ? "var(--badge-danger-fg)" : "var(--color-text-muted)", fontWeight: c.status === "vencida" ? 600 : 400 }}>
              {c.venc}{c.atraso ? ` · ${c.atraso}d atraso` : ""}</span></Td>
            <Td><StatusBadge status={c.status} /></Td>
            <Td align="right">
              {c.status === "erro"
                ? <Button size="sm" iconLeft="refresh-cw" title="Tentar emitir esta cobrança novamente no Asaas" onClick={(e) => { e.stopPropagation(); showToastC3("Tentando emitir novamente…", "info"); }}>Reemitir</Button>
                : <Button variant="tertiary" size="sm" iconLeft="eye" onClick={(e) => { e.stopPropagation(); setSel(c.id); go("c4"); }}>Visualizar</Button>}
            </Td>
          </TrHover>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={7} style={{ padding: "36px 20px", textAlign: "center", fontSize: 13.5, color: "var(--color-text-subtle)" }}>
            {cq || filter !== "todas" ? "Nenhuma cobrança encontrada com esses filtros." : "Nenhuma cobrança emitida ainda. As cobranças do mês são geradas automaticamente todo dia 1."}
          </td></tr>
        )}
      </DataTable>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>{allRows.length} cobrança{allRows.length !== 1 ? "s" : ""}</span>
        <Pagination page={safePage} pages={pages} onChange={setPage} />
      </div>
      <EmitirAvulsaModal open={emitir === "avulsa"} onClose={() => setEmitir(null)} toast={showToastC3} />
      <Toast toast={toastC3} />
      </>
      )}
    </Shell>
  );
};

window.C0Dashboard = C0Dashboard;
window.RelatoriosPage = RelatoriosPage;
window.ExtratoPage = ExtratoPage;
window.C1Pendentes = C1Pendentes;
window.C2Revisar = C2Revisar;
window.C3Cobrancas = C3Cobrancas;
window.QrCode = QrCode;
window.SectionHead = SectionHead;
window.DataTable = DataTable;
window.Td = Td;
window.TrHover = TrHover;
window.Person = Person;

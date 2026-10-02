/* Financeiro — Contas a pagar (spec 10) + Fluxo de caixa (spec 11).
 * Registro manual de despesas (EdX nunca movimenta dinheiro de terceiros) e
 * projeção de caixa on-the-fly (entradas Invoice − saídas Payable, PAID nunca entra). */

const HOJE_ISO = "2026-06-22";
const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const catName = (id) => (FIN_CATEGORIAS.find((c) => c.id === id) || {}).nome || "Sem categoria";
const supName = (id) => { const s = FORNECEDORES.find((f) => f.id === id); return s ? s.nome : null; };
const fmtVenc = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}`; };
const fmtVencFull = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
// OVERDUE on-read: PENDING vencido vira OVERDUE
const effStatus = (p) => (p.status === "PENDING" && p.venc < HOJE_ISO ? "OVERDUE" : p.status);

const PAY_STATUS = {
  PENDING:   { variant: "neutral", label: "Pendente" },
  OVERDUE:   { variant: "danger",  label: "Vencida" },
  PAID:      { variant: "success", label: "Paga" },
  CANCELLED: { variant: "neutral", label: "Cancelada" },
};

/* ════════════════════════════════════════════════════════════════════════
 * CONTAS A PAGAR
 * ════════════════════════════════════════════════════════════════════════ */
const ContasPagar = ({ toast }) => {
  const [rows, setRows] = useState(() => PAYABLES.map((p) => ({ ...p })));
  const [fornecedores, setFornecedores] = useState(() => FORNECEDORES.map((f) => ({ ...f })));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todas");
  const [cat, setCat] = useState("todas");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: "venc", dir: "asc" });
  const [formOpen, setFormOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const PER = 8;

  const COLS = [
    { h: "Descrição",  key: "desc",   align: "left",  val: (r) => r.desc.toLowerCase() },
    { h: "Categoria",  key: "cat",    align: "left",  val: (r) => catName(r.categoria).toLowerCase() },
    { h: "Vencimento", key: "venc",   align: "left",  val: (r) => r.venc },
    { h: "Valor",      key: "valor",  align: "right", val: (r) => r.valor },
    { h: "Status",     key: "status", align: "left",  val: (r) => effStatus(r) },
  ];
  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  const filtered = rows.filter((r) => {
    const eff = effStatus(r);
    const okStatus = status === "todas"
      || (status === "PENDING" && eff === "PENDING")
      || (status === "OVERDUE" && eff === "OVERDUE")
      || (status === "PAID" && eff === "PAID")
      || (status === "CANCELLED" && eff === "CANCELLED");
    const okCat = cat === "todas" || r.categoria === cat;
    const term = q.trim().toLowerCase();
    const okQ = !term || r.desc.toLowerCase().includes(term) || catName(r.categoria).toLowerCase().includes(term) || (supName(r.fornecedor) || "").toLowerCase().includes(term);
    return okStatus && okCat && okQ;
  });
  const sortCol = COLS.find((c) => c.key === sort.key) || COLS[2];
  const sorted = [...filtered].sort((a, b) => {
    const av = sortCol.val(a), bv = sortCol.val(b);
    const r = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === "asc" ? r : -r;
  });
  const pageCount = Math.max(1, Math.ceil(sorted.length / PER));
  const cur = Math.min(page, pageCount - 1);
  const paged = sorted.slice(cur * PER, cur * PER + PER);

  const totalPendente = rows.filter((r) => ["PENDING", "OVERDUE"].includes(effStatus(r))).reduce((s, r) => s + r.valor, 0);
  const totalVencido = rows.filter((r) => effStatus(r) === "OVERDUE").reduce((s, r) => s + r.valor, 0);
  const totalPagoMes = rows.filter((r) => r.status === "PAID" && r.comp === "2026-06").reduce((s, r) => s + (r.pagoValor || r.valor), 0);

  const reset = () => setPage(0);
  const addPayable = (p) => { setRows((cur) => [{ ...p, id: "p_new_" + Date.now() }, ...cur]); toast("Despesa lançada — status pendente", "success"); };
  const addFornecedor = (f) => { const nf = { ...f, id: "sup_new_" + Date.now() }; setFornecedores((cur) => [...cur, nf]); return nf.id; };
  const confirmPay = (id, data, valor) => {
    setRows((cur) => cur.map((r) => r.id === id ? { ...r, status: "PAID", pagoEm: data, pagoValor: valor } : r));
    toast("Conta marcada como paga", "success");
    setPayTarget(null);
  };
  const cancelPayable = (id) => { setRows((cur) => cur.map((r) => r.id === id ? { ...r, status: "CANCELLED" } : r)); toast("Despesa cancelada", "info"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <Metric label="A pagar (em aberto)" value={brl(totalPendente)} sub={`${rows.filter((r) => ["PENDING", "OVERDUE"].includes(effStatus(r))).length} contas`} icon="clock" accent="var(--badge-warning-fg)" iconBg="var(--badge-warning-bg)" />
        <Metric label="Vencido" value={brl(totalVencido)} sub={`${rows.filter((r) => effStatus(r) === "OVERDUE").length} em atraso`} icon="alert-circle" accent="var(--badge-danger-fg)" iconBg="var(--badge-danger-bg)" />
        <Metric label="Pago em Junho" value={brl(totalPagoMes)} sub="saídas do mês" icon="check-circle" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 0" }}>
          <SectionHead title="Contas a pagar" sub="Registro manual das despesas da unidade"
            action={<Button iconLeft="plus" onClick={() => setFormOpen(true)}>Nova despesa</Button>} />
        </div>
        {/* filtros */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "2px 22px 16px" }}>
          <Input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} leadingIcon="search"
            placeholder="Buscar por descrição, categoria ou fornecedor" style={{ flex: "1 1 240px", minWidth: 200, height: 42 }} />
          <Select value={cat} onChange={(e) => { setCat(e.target.value); reset(); }} leadingIcon="tag"
            options={[{ value: "todas", label: "Todas as categorias" }, ...FIN_CATEGORIAS.map((c) => ({ value: c.id, label: c.nome }))]} />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); reset(); }} leadingIcon="filter"
            options={[{ value: "todas", label: "Todos os status" }, { value: "PENDING", label: "Pendentes" }, { value: "OVERDUE", label: "Vencidas" }, { value: "PAID", label: "Pagas" }, { value: "CANCELLED", label: "Canceladas" }]} />
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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexDirection: c.align === "right" ? "row-reverse" : "row" }}>
                        {c.h}<Icon name={on ? (sort.dir === "asc" ? "chevron-up" : "chevron-down") : "chevrons-up-down"} size={13} color={on ? "var(--color-primary)" : "var(--color-text-subtle)"} />
                      </span>
                    </th>
                  );
                })}
                <th style={{ padding: "11px 16px", borderBottom: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)", width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => {
                const eff = effStatus(r);
                const cancelled = eff === "CANCELLED";
                const open = ["PENDING", "OVERDUE"].includes(eff);
                const st = PAY_STATUS[eff];
                return (
                  <tr key={r.id} style={{ borderBottom: i < paged.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}>
                    <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, color: cancelled ? "var(--color-text-subtle)" : "var(--color-text)", textDecoration: cancelled ? "line-through" : "none" }}>
                      {r.desc}
                      {r.fornecedor && <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-subtle)", textDecoration: "none", marginTop: 2 }}>{supName(r.fornecedor)}</div>}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "var(--color-surface)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{catName(r.categoria)}</span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13.5, color: eff === "OVERDUE" ? "var(--color-danger-primary)" : "var(--color-text-muted)", whiteSpace: "nowrap", fontWeight: eff === "OVERDUE" ? 600 : 400 }}>
                      {fmtVencFull(r.venc)}{r.recorrente && <Icon name="repeat" size={12} color="var(--color-text-subtle)" style={{ marginLeft: 7 }} />}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", color: cancelled ? "var(--color-text-subtle)" : "var(--color-text)", textDecoration: cancelled ? "line-through" : "none" }}>{brl(r.valor)}</td>
                    <td style={{ padding: "13px 16px" }}><Badge variant={st.variant} dot size="sm">{st.label}</Badge></td>
                    <td style={{ padding: "13px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {open ? (
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <Button variant="secondary" size="sm" iconLeft="check" onClick={() => setPayTarget(r)}>Pagar</Button>
                          <button title="Cancelar" onClick={() => cancelPayable(r.id)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", cursor: "pointer", color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={15} /></button>
                        </div>
                      ) : r.status === "PAID" ? (
                        <span style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>pago {fmtVenc(r.pagoEm)}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "40px 22px", textAlign: "center", color: "var(--color-text-subtle)", fontSize: 14 }}>Nenhuma despesa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* paginação */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 22px", borderTop: "1px solid var(--color-border-muted)" }}>
          <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>
            {filtered.length === 0 ? "0 contas" : `${cur * PER + 1}–${Math.min(cur * PER + PER, filtered.length)} de ${filtered.length} contas`}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Button variant="tertiary" size="sm" iconLeft="chevron-left" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Anterior</Button>
            {Array.from({ length: pageCount }).map((_, i) => (
              <button key={i} onClick={() => setPage(i)}
                style={{ width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600,
                  border: `1px solid ${i === cur ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: i === cur ? "var(--color-primary)" : "var(--color-bg)", color: i === cur ? "#fff" : "var(--color-text-muted)" }}>{i + 1}</button>
            ))}
            <Button variant="tertiary" size="sm" iconRight="chevron-right" disabled={cur >= pageCount - 1} onClick={() => setPage(cur + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>

      <PayableForm open={formOpen} onClose={() => setFormOpen(false)} onSave={addPayable} fornecedores={fornecedores} addFornecedor={addFornecedor} toast={toast} />
      <PayModal target={payTarget} onClose={() => setPayTarget(null)} onConfirm={confirmPay} />
    </div>
  );
};

/* ─── Modal: nova despesa ──────────────────────────────────────────────── */
const PayableForm = ({ open, onClose, onSave, fornecedores, addFornecedor, toast }) => {
  const [f, setF] = useState({ desc: "", categoria: "", valor: "", venc: "", comp: "2026-06", fornecedor: "", recorrente: false, notes: "" });
  const [novoForn, setNovoForn] = useState({ nome: "", doc: "" });
  useEffect(() => { if (open) { setF({ desc: "", categoria: "", valor: "", venc: "", comp: "2026-06", fornecedor: "", recorrente: false, notes: "" }); setNovoForn({ nome: "", doc: "" }); } }, [open]);
  const valorNum = parseFloat((f.valor || "").replace(/\./g, "").replace(",", ".")) || 0;
  const ok = f.desc && f.categoria && valorNum > 0 && f.venc;
  const salvar = () => {
    let fornId = f.fornecedor;
    if (fornId === "__new__") { if (!novoForn.nome) { toast("Informe o nome do fornecedor", "warning"); return; } fornId = addFornecedor(novoForn); }
    onSave({ desc: f.desc, categoria: f.categoria, fornecedor: fornId || null, valor: valorNum, venc: f.venc, status: "PENDING", comp: f.comp, recorrente: f.recorrente, notes: f.notes });
    onClose();
  };
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} width={560}>
      <div style={{ padding: 26, maxHeight: "86vh", overflowY: "auto" }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Nova despesa</h3>
        <p style={{ margin: "6px 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Registre uma conta a pagar. Você paga pelo seu banco e marca aqui como paga.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Descrição" required><Input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="Ex.: Aluguel da unidade · Julho" leadingIcon="file-text" /></Field>
          <Field label="Categoria" required>
            <Select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Selecione a categoria" leadingIcon="tag"
              options={FIN_CATEGORIAS.map((c) => ({ value: c.id, label: c.nome }))} style={{ width: "100%" }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Valor (R$)" required><Input value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} inputMode="decimal" placeholder="0,00" leadingIcon="circle-dollar-sign" /></Field>
            <Field label="Vencimento" required><Input value={f.venc} onChange={(e) => setF({ ...f, venc: e.target.value })} type="date" leadingIcon="calendar" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Competência" hint="Mês de referência"><Input value={f.comp} onChange={(e) => setF({ ...f, comp: e.target.value })} placeholder="2026-06" leadingIcon="calendar-range" /></Field>
            <Field label="Fornecedor">
              <Select value={f.fornecedor} onChange={(e) => setF({ ...f, fornecedor: e.target.value })} leadingIcon="truck" style={{ width: "100%" }}
                options={[{ value: "", label: "Sem fornecedor" }, ...fornecedores.map((s) => ({ value: s.id, label: s.nome })), { value: "__new__", label: "+ Cadastrar novo…" }]} />
            </Field>
          </div>
          {f.fornecedor === "__new__" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, padding: 14, borderRadius: "var(--radius-md)", background: "var(--color-surface)", animation: "ex-fade 180ms ease" }}>
              <Field label="Nome do fornecedor" required><Input value={novoForn.nome} onChange={(e) => setNovoForn({ ...novoForn, nome: e.target.value })} placeholder="Ex.: Imobiliária X" /></Field>
              <Field label="CNPJ / CPF"><Input value={novoForn.doc} onChange={(e) => setNovoForn({ ...novoForn, doc: e.target.value })} inputMode="numeric" placeholder="Opcional" /></Field>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 2px" }}>
            <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>Despesa recorrente</div>
              <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 2 }}>Marca a despesa como mensal (gera lembrete, não cobra automático)</div></div>
            <Toggle checked={f.recorrente} onChange={(v) => setF({ ...f, recorrente: v })} />
          </div>
          <Field label="Observações">
            <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Opcional" rows={2}
              style={{ width: "100%", resize: "vertical", border: "1.5px solid var(--color-border-input)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-text)", outline: "none", background: "var(--color-bg)" }} />
          </Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="tertiary" onClick={onClose}>Cancelar</Button>
          <Button iconLeft="check" disabled={!ok} onClick={salvar}>Lançar despesa</Button>
        </div>
      </div>
    </Modal>
  );
};

/* ─── Modal: marcar como pago ──────────────────────────────────────────── */
const PayModal = ({ target, onClose, onConfirm }) => {
  const [data, setData] = useState(HOJE_ISO);
  const [valor, setValor] = useState("");
  useEffect(() => { if (target) { setData(HOJE_ISO); setValor(target.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })); } }, [target]);
  if (!target) return null;
  const valorNum = parseFloat((valor || "").replace(/\./g, "").replace(",", ".")) || 0;
  return (
    <Modal open={!!target} onClose={onClose} width={460}>
      <div style={{ padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--badge-success-bg)", color: "var(--badge-success-fg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check-circle" size={20} /></span>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Marcar como pago</h3>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{target.desc} · {brl(target.valor)}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Data do pagamento"><Input value={data} onChange={(e) => setData(e.target.value)} type="date" leadingIcon="calendar" /></Field>
          <Field label="Valor pago" hint="Pode diferir do previsto (desconto ou multa)"><Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" leadingIcon="circle-dollar-sign" /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="tertiary" onClick={onClose}>Cancelar</Button>
          <Button iconLeft="check" onClick={() => onConfirm(target.id, data, valorNum)}>Confirmar pagamento</Button>
        </div>
      </div>
    </Modal>
  );
};

/* ════════════════════════════════════════════════════════════════════════
 * FLUXO DE CAIXA
 * ════════════════════════════════════════════════════════════════════════ */
const addDaysISO = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d + n)); return dt.toISOString().slice(0, 10); };

const FluxoCaixa = ({ toast }) => {
  const [tab, setTab] = useState("visao");
  const [catKind, setCatKind] = useState("barra");
  const [horizonte, setHorizonte] = useState(30);
  const [mov, setMov] = useState("todos");
  const [movPage, setMovPage] = useState(0);
  const [mes, setMes] = useState("2026-06");
  const MOV_PER = 8;
  const saldoHoje = CAIXA_SALDO_HOJE;
  const fim = addDaysISO(HOJE_ISO, horizonte);

  // Eventos da projeção: entradas (Invoices) + saídas (Payables PENDING/OVERDUE). PAID nunca entra.
  const eventos = useMemo(() => {
    const ent = CAIXA_ENTRADAS.map((e) => ({ ...e, tipo: "entrada", data: e.venc < HOJE_ISO ? HOJE_ISO : e.venc }));
    const sai = PAYABLES.filter((p) => ["PENDING", "OVERDUE"].includes(effStatus(p)))
      .map((p) => ({ id: p.id, desc: p.desc, valor: p.valor, categoria: p.categoria, tipo: "saida", data: p.venc < HOJE_ISO ? HOJE_ISO : p.venc }));
    return [...ent, ...sai].filter((e) => e.data >= HOJE_ISO && e.data <= fim).sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
  }, [horizonte]);

  // Série diária acumulada nas datas de evento (+ hoje e fim do horizonte)
  const serie = useMemo(() => {
    const datas = Array.from(new Set([HOJE_ISO, ...eventos.map((e) => e.data), fim])).sort();
    let inc = 0, out = 0;
    return datas.map((d) => {
      eventos.filter((e) => e.data === d).forEach((e) => { if (e.tipo === "entrada") inc += e.valor; else out += e.valor; });
      return { data: d, inc, out, saldo: saldoHoje + inc - out };
    });
  }, [eventos]);
  const totalEntradas = serie.length ? serie[serie.length - 1].inc : 0;
  const totalSaidas = serie.length ? serie[serie.length - 1].out : 0;
  const saldoProjetado = saldoHoje + totalEntradas - totalSaidas;
  const negativo = serie.some((p) => p.saldo < 0);

  // tabela de movimentos
  const movFiltered = eventos.filter((e) => mov === "todos" || (mov === "entradas" && e.tipo === "entrada") || (mov === "saidas" && e.tipo === "saida"));
  const movPages = Math.max(1, Math.ceil(movFiltered.length / MOV_PER));
  const movCur = Math.min(movPage, movPages - 1);
  const movRows = movFiltered.slice(movCur * MOV_PER, movCur * MOV_PER + MOV_PER);

  // relatório mensal por categoria
  const ENTRADAS_MES = { "2026-06": 51000, "2026-07": 25600 };
  const relCats = FIN_CATEGORIAS.map((c) => {
    const saida = PAYABLES.filter((p) => p.categoria === c.id && p.comp === mes && p.status !== "CANCELLED").reduce((s, p) => s + p.valor, 0);
    return { nome: c.nome, entrada: 0, saida };
  }).filter((c) => c.saida > 0);
  const semCatEntrada = ENTRADAS_MES[mes] || 0;
  const relRows = [{ nome: "Mensalidades (sem categoria)", entrada: semCatEntrada, saida: 0 }, ...relCats];
  const relTotEnt = relRows.reduce((s, r) => s + r.entrada, 0);
  const relTotSai = relRows.reduce((s, r) => s + r.saida, 0);
  const catChartData = relCats.map((c) => ({ label: c.nome, value: c.saida }));
  const catDelta = (c, p) => { const x = p ? (c - p) / p * 100 : 0; return (x >= 0 ? "+" : "") + x.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + "%"; };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ overflowX: "auto", paddingBottom: 2 }}>
        <Segmented value={tab} onChange={setTab}
          options={[{ value: "visao", label: "Visão geral" }, { value: "previsto", label: "Previsto" }]} />
      </div>

      {tab === "visao" && (
      <>
      {/* Saldo âncora + projeção */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", borderBottom: "1px solid var(--color-border-muted)" }}>
          <div>
            <div className="label" style={{ fontSize: 11.5 }}>Saldo disponível hoje</div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6, lineHeight: 1 }}>{brl(saldoHoje)}</div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="refresh-cw" size={13} />Atualizado às 08:00 · saldo Asaas</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label" style={{ fontSize: 11.5 }}>Saldo projetado em {horizonte} dias</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6, color: saldoProjetado >= saldoHoje ? "var(--badge-success-fg)" : "var(--color-text)" }}>{brl(saldoProjetado)}</div>
            <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", marginTop: 8, fontSize: 12.5 }}>
              <span style={{ color: "var(--badge-success-fg)", fontWeight: 600 }}>+{brl(totalEntradas)}</span>
              <span style={{ color: "var(--color-danger-primary)", fontWeight: 600 }}>−{brl(totalSaidas)}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 18, fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-text-muted)" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--badge-success-fg)" }} />Entradas</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-text-muted)" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--badge-warning-fg)" }} />Saídas</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-text-muted)" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-primary)" }} />Saldo projetado</span>
          </div>
          <Segmented value={String(horizonte)} onChange={(v) => setHorizonte(Number(v))} size="sm"
            options={[{ value: "30", label: "30 dias" }, { value: "60", label: "60 dias" }, { value: "90", label: "90 dias" }]} />
        </div>
        <div style={{ padding: "0 16px 18px" }}>
          <CashflowChart serie={serie} saldoHoje={saldoHoje} />
        </div>
        {negativo && (
          <div style={{ margin: "0 22px 18px", padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--color-danger-soft)", border: "1px solid var(--color-danger-secondary-bd)", display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--color-danger-primary)" }}>
            <Icon name="alert-triangle" size={17} />Caixa projetado fica negativo dentro do horizonte. Revise as saídas ou antecipe recebíveis.
          </div>
        )}
      </Card>
      </>
      )}

      {tab === "previsto" && (
      <>
      {/* Movimentos futuros */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 0" }}>
          <SectionHead title="Movimentos previstos" sub={`Próximos ${horizonte} dias · entradas e saídas ainda não realizadas`} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "2px 22px 16px" }}>
          <Segmented style={{ marginLeft: "auto" }} value={mov} onChange={(v) => { setMov(v); setMovPage(0); }}
            options={[{ value: "todos", label: "Todos" }, { value: "entradas", label: "Entradas" }, { value: "saidas", label: "Saídas" }]} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ background: "var(--color-surface)" }}>
                {["Data", "Tipo", "Descrição", "Valor"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 3 ? "right" : "left", padding: "11px 16px", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-subtle)", borderBottom: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movRows.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < movRows.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}>
                  <td style={{ padding: "13px 16px", fontSize: 13.5, color: "var(--color-text-muted)", whiteSpace: "nowrap", fontWeight: 600 }}>{fmtVencFull(e.data)}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <Badge variant={e.tipo === "entrada" ? "success" : "danger"} size="sm" dot>{e.tipo === "entrada" ? "Entrada" : "Saída"}</Badge>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600 }}>{e.desc}{e.tipo === "saida" && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-subtle)", marginLeft: 8 }}>{catName(e.categoria)}</span>}</td>
                  <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", color: e.tipo === "entrada" ? "var(--badge-success-fg)" : "var(--color-danger-primary)" }}>{e.tipo === "entrada" ? "+" : "−"}{brl(e.valor)}</td>
                </tr>
              ))}
              {movRows.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "36px 22px", textAlign: "center", color: "var(--color-text-subtle)", fontSize: 14 }}>Nenhuma movimentação no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 22px", borderTop: "1px solid var(--color-border-muted)" }}>
          <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>{movFiltered.length === 0 ? "0 movimentos" : `${movCur * MOV_PER + 1}–${Math.min(movCur * MOV_PER + MOV_PER, movFiltered.length)} de ${movFiltered.length} movimentos`}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Button variant="tertiary" size="sm" iconLeft="chevron-left" disabled={movCur === 0} onClick={() => setMovPage(movCur - 1)}>Anterior</Button>
            {Array.from({ length: movPages }).map((_, i) => (
              <button key={i} onClick={() => setMovPage(i)} style={{ width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, border: `1px solid ${i === movCur ? "var(--color-primary)" : "var(--color-border)"}`, background: i === movCur ? "var(--color-primary)" : "var(--color-bg)", color: i === movCur ? "#fff" : "var(--color-text-muted)" }}>{i + 1}</button>
            ))}
            <Button variant="tertiary" size="sm" iconRight="chevron-right" disabled={movCur >= movPages - 1} onClick={() => setMovPage(movCur + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>
      </>
      )}

      {tab === "visao" && (
      <>
      {/* Resultado do mês por categoria — mesmo gráfico em 3 formatos (barra/linha/pizza) */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 0" }}>
          <SectionHead title="Resultado do mês por categoria" sub="Entradas e saídas comprometidas na competência"
            action={<Select value={mes} onChange={(e) => setMes(e.target.value)} leadingIcon="calendar"
              options={[{ value: "2026-06", label: "Junho 2026" }, { value: "2026-07", label: "Julho 2026" }]} />} />
        </div>
        {catChartData.length > 0 && (
          <div style={{ padding: "6px 22px 4px" }}>
            <Segmented size="sm" value={catKind} onChange={setCatKind}
              options={[{ value: "barra", label: "Barras" }, { value: "linha", label: "Linha" }, { value: "pizza", label: "Pizza" }]} />
            <div style={{ marginTop: 8 }}>
              {catKind === "barra" && <RichBars data={catChartData} fmt={brl} deltaFmt={catDelta} accent="var(--color-danger-primary)" goodWhen="down" />}
              {catKind === "linha" && <RichLine data={catChartData} fmt={brl} accent="var(--color-danger-primary)" goodWhen="down" />}
              {catKind === "pizza" && <PieChart data={catChartData} fmt={brl} accent="var(--color-danger-primary)" />}
            </div>
          </div>
        )}
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ background: "var(--color-surface)" }}>
                {["Categoria", "Entradas", "Saídas", "Resultado"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "11px 16px", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-subtle)", borderBottom: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {relRows.map((r, i) => {
                const res = r.entrada - r.saida;
                return (
                  <tr key={r.nome} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                    <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600 }}>{r.nome}</td>
                    <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 14, color: r.entrada ? "var(--badge-success-fg)" : "var(--color-text-subtle)", fontWeight: r.entrada ? 600 : 400 }}>{r.entrada ? brl(r.entrada) : "—"}</td>
                    <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 14, color: r.saida ? "var(--color-danger-primary)" : "var(--color-text-subtle)", fontWeight: r.saida ? 600 : 400 }}>{r.saida ? brl(r.saida) : "—"}</td>
                    <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, color: res >= 0 ? "var(--color-primary)" : "var(--color-danger-primary)" }}>{res >= 0 ? "" : "−"}{brl(Math.abs(res))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--color-surface)" }}>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800 }}>Resultado do mês</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--badge-success-fg)" }}>{brl(relTotEnt)}</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--color-danger-primary)" }}>{brl(relTotSai)}</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 15, fontWeight: 800, color: (relTotEnt - relTotSai) >= 0 ? "var(--color-primary)" : "var(--color-danger-primary)" }}>{(relTotEnt - relTotSai) >= 0 ? "" : "−"}{brl(Math.abs(relTotEnt - relTotSai))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      </>
      )}
    </div>
  );
};

/* ─── helper de curva ────────────────────────────────────────────────────── */
// curva suave (Catmull-Rom → Bézier cúbica), no estilo dos gráficos shadcn/chart.js
const smoothPath = (pts) => {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]}`;
  let d = `M ${pts[0][0]},${pts[0][1]} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]} `;
  }
  return d;
};

/* ─── Gráfico de linha multi-série (entradas / saídas / saldo) ───────────
 * Mesma linguagem visual dos gráficos de Relatórios (RichLine/RichBars):
 * curva suave, pontos com anel colorido, ChartTip escuro no hover, badge de
 * tendência — paleta categórica (verde/âmbar/azul) em vez de verde/vermelho/azul. */
const CashflowChart = ({ serie, saldoHoje }) => {
  const wrapRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!serie || serie.length < 2) return <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-subtle)", fontSize: 13.5 }}>Sem movimentações para projetar.</div>;

  const H = 240, padL = 2, padR = 2, padT = 30, padB = 26;
  const xs = serie.map((_, i) => i / (serie.length - 1));
  const allVals = serie.flatMap((p) => [p.inc, p.out, p.saldo]).concat([0]);
  const max = Math.max(...allVals), min = Math.min(...allVals, 0);
  const range = (max - min) || 1;
  const X = (i) => padL + xs[i] * (100 - padL - padR);
  const Y = (v) => padT + (1 - (v - min) / range) * (100 - padT - padB);
  const baseY = Y(Math.max(0, min));
  const seriesDef = [
    { key: "inc", label: "Entradas", color: "var(--badge-success-fg)", w: 2 },
    { key: "out", label: "Saídas", color: "var(--badge-warning-fg)", w: 2 },
    { key: "saldo", label: "Saldo", color: "var(--color-primary)", w: 2.8 },
  ];
  const ptsFor = (key) => serie.map((p, i) => [X(i), Y(p[key])]);
  const saldoPts = ptsFor("saldo");
  const areaD = `${smoothPath(saldoPts)} L ${saldoPts[saldoPts.length - 1][0]},${baseY} L ${saldoPts[0][0]},${baseY} Z`;
  // rótulos de data no eixo x (até 5, sempre incluindo início e fim)
  const dateIdxCount = Math.min(5, serie.length);
  const labelIdx = Array.from(new Set(Array.from({ length: dateIdxCount }, (_, k) => Math.round(k * (serie.length - 1) / (dateIdxCount - 1)))));
  // tendência do saldo no período (badge no estilo endTag do RichLine)
  const saldoDelta = serie[serie.length - 1].saldo - saldoHoje;
  const trendUp = saldoDelta >= 0;

  const handlePointer = (clientX) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * 100;
    let closest = 0, closestDist = Infinity;
    serie.forEach((_, i) => { const d = Math.abs(X(i) - px); if (d < closestDist) { closestDist = d; closest = i; } });
    setHoverIdx(closest);
  };
  const hv = hoverIdx != null ? serie[hoverIdx] : null;
  const hvX = hoverIdx != null ? X(hoverIdx) : 0;

  return (
    <div ref={wrapRef} style={{ position: "relative", height: H, cursor: "crosshair" }}
      onMouseMove={(e) => handlePointer(e.clientX)}
      onMouseLeave={() => setHoverIdx(null)}
      onTouchMove={(e) => e.touches[0] && handlePointer(e.touches[0].clientX)}
      onTouchEnd={() => setHoverIdx(null)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="cf-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#cf-area-fill)" stroke="none" />
        {seriesDef.map((s) => (
          <path key={s.key} d={smoothPath(ptsFor(s.key))} fill="none" stroke={s.color} strokeWidth={s.w} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hoverIdx != null && seriesDef.map((s) => (
          <circle key={s.key} cx={hvX} cy={Y(hv[s.key])} r={s.key === "saldo" ? 3 : 2.2} fill="var(--color-bg)" stroke={s.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div style={{ position: "absolute", top: 4, right: 2, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 999,
        background: trendUp ? "var(--badge-success-bg)" : "var(--badge-danger-bg)", color: trendUp ? "var(--badge-success-fg)" : "var(--badge-danger-fg)" }}>
        <Icon name={trendUp ? "trending-up" : "trending-down"} size={13} />{trendUp ? "+" : "−"}{brl(Math.abs(saldoDelta))}
      </div>
      {hv && (
        <div style={{ position: "absolute", left: `${hvX}%`, top: `${Y(hv.saldo)}%`, transform: "translateX(-50%)", pointerEvents: "none" }}>
          <ChartTip title={fmtVencFull(hv.data)} body={
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {seriesDef.map((s) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />{s.label}</span>
                  <strong>{brl(hv[s.key])}</strong>
                </div>
              ))}
            </div>
          } />
        </div>
      )}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
        {labelIdx.map((idx) => <span key={idx} style={{ fontSize: 12, color: "var(--color-text-subtle)", fontWeight: 500 }}>{fmtVenc(serie[idx].data)}</span>)}
      </div>
    </div>
  );
};

Object.assign(window, { ContasPagar, FluxoCaixa, PayableForm, PayModal, CashflowChart });

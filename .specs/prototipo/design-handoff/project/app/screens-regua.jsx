/* Régua de cobrança + negativação automática — conciliado com DH-f3 (spec 045)
 * Substitui o modelo antigo de "decisão caso a caso": a negativação é 100% automática
 * via cron (D+30 configurável). Sem botão "Negativar agora".
 * Telas: painel da régua (d0) · detalhe (d1: painel negativação + histórico + pausa + opt-out)
 * · ReguaConfigTab (Settings > Régua). Este arquivo REDEFINE window.NegativacaoBody / D1Detalhe. */

/* ── dados da régua (derivado de DunningLog; etapa = ação mais avançada com sucesso) ── */
const REGUA_ROWS = [
  { id: "rg_2", resp: "Antônio Reis", aluno: "Sofia Reis", cpf: "321.654.987-00", materia: "Inglês", valor: 600, atraso: 13, venc: "20/05/2026",
    etapa: "WARNED2", pausada: false, optOut: false, negativaEm: "19/06/2026",
    logs: [
      { action: "WARNING2", date: "30/05/2026 às 08:03", result: "success" },
      { action: "WARNING2", date: "29/05/2026 às 08:04", result: "error: falha de comunicação com o Asaas" },
      { action: "WARNING1", date: "23/05/2026 às 08:02", result: "success" },
      { action: "REMINDER", date: "15/05/2026 às 08:01", result: "success" },
    ] },
  { id: "rg_1", resp: "Juliana Prado", aluno: "Heitor Prado", cpf: "654.987.321-00", materia: "Português", valor: 380, atraso: 5, venc: "28/05/2026",
    etapa: "WARNED1", pausada: false, optOut: false, negativaEm: "27/06/2026",
    logs: [
      { action: "WARNING1", date: "31/05/2026 às 08:02", result: "success" },
      { action: "REMINDER", date: "23/05/2026 às 08:01", result: "success" },
    ] },
  { id: "rg_7", resp: "Renata Alves", aluno: "Renata Alves", cpf: "555.666.777-00", materia: "Inglês", valor: 427, atraso: 9, venc: "24/05/2026",
    etapa: "WARNED1", pausada: true, optOut: false, negativaEm: "23/06/2026",
    logs: [
      { action: "WARNING1", date: "27/05/2026 às 08:02", result: "success" },
      { action: "REMINDER", date: "19/05/2026 às 08:01", result: "success" },
    ] },
  { id: "rg_6", resp: "Patrícia Lopes", aluno: "Théo Lopes", cpf: "333.444.555-00", materia: "Português", valor: 380, atraso: 0, venc: "25/06/2026",
    etapa: "REMINDED", pausada: false, optOut: false,
    logs: [{ action: "REMINDER", date: "20/06/2026 às 08:01", result: "success" }] },
  { id: "rg_3", resp: "Eduardo Matos", aluno: "Lívia Matos", cpf: "789.321.456-00", materia: "Matemática", valor: 450, atraso: 38, venc: "25/04/2026",
    etapa: "NEGATIVATED", pausada: false, optOut: false,
    dunning: { asaasId: "dun_9f2k31", fee: 9.9, requestedAt: "25/05/2026", warningSentAt: "05/05/2026", resolvedAt: null, actorId: null },
    logs: [
      { action: "NEGATIVATION", date: "25/05/2026 às 08:04", result: "success" },
      { action: "WARNING2", date: "05/05/2026 às 08:03", result: "success" },
      { action: "WARNING1", date: "28/04/2026 às 08:02", result: "success" },
      { action: "REMINDER", date: "20/04/2026 às 08:01", result: "success" },
    ] },
  { id: "rg_4", resp: "Sandra Melo", aluno: "Gabriel Melo", cpf: "147.258.369-00", materia: "Matemática", valor: 350, atraso: 45, venc: "18/04/2026",
    etapa: "NEGATIVATED", pausada: false, optOut: false,
    dunning: { asaasId: "dun_4t8w02", fee: 9.9, requestedAt: "18/05/2026", warningSentAt: "28/04/2026", resolvedAt: null, actorId: null },
    logs: [
      { action: "NEGATIVATION", date: "18/05/2026 às 08:04", result: "success" },
      { action: "WARNING2", date: "28/04/2026 às 08:03", result: "success" },
      { action: "WARNING1", date: "21/04/2026 às 08:02", result: "success" },
      { action: "REMINDER", date: "13/04/2026 às 08:01", result: "success" },
    ] },
  { id: "rg_5", resp: "Marcos Vieira", aluno: "Clara Vieira", cpf: "258.147.963-00", materia: "Matemática", valor: 450, atraso: 0, venc: "15/04/2026",
    etapa: "REGULARIZED", pausada: false, optOut: false,
    dunning: { asaasId: "dun_7h1m20", fee: 9.9, requestedAt: "15/05/2026", warningSentAt: "25/04/2026", resolvedAt: "08/06/2026", actorId: null },
    logs: [
      { action: "CANCELLATION", date: "08/06/2026 às 11:22", result: "success" },
      { action: "NEGATIVATION", date: "15/05/2026 às 08:04", result: "success" },
      { action: "WARNING2", date: "25/04/2026 às 08:03", result: "success" },
      { action: "WARNING1", date: "18/04/2026 às 08:02", result: "success" },
      { action: "REMINDER", date: "10/04/2026 às 08:01", result: "success" },
    ] },
];

/* ── badge de etapa (Tela 2 — reusado no dashboard F5) ── */
const ETAPA_BADGE = {
  NONE:        { variant: "neutral", label: "Sem régua" },
  REMINDED:    { variant: "info",    label: "Lembrete enviado" },
  WARNED1:     { variant: "warning", label: "Aviso 1" },
  WARNED2:     { variant: "warning", label: "Aviso 2" },
  NEGATIVATED: { variant: "danger",  label: "Negativada" },
  REGULARIZED: { variant: "success", label: "Regularizada" },
};
const ETAPA_TIP = {
  WARNED2: "Último aviso antes da negativação automática.",
  NEGATIVATED: "Dívida registrada no SPC/Serasa.",
};
const EtapaBadge = ({ etapa, pausada, size }) => {
  const e = ETAPA_BADGE[etapa] || ETAPA_BADGE.NONE;
  return (
    <span title={ETAPA_TIP[etapa]} style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      <Badge variant={e.variant} dot size={size}>{e.label}</Badge>
      {pausada && <Badge variant="neutral" size={size || "sm"}><Icon name="pause" size={11} />Régua pausada</Badge>}
    </span>
  );
};

/* ── modal de pausa/retomada (Tela 3 — pausa é POR MATRÍCULA e bloqueia TUDO) ── */
const PausarModal = ({ row, onClose, onConfirm }) => (
  <Modal open={!!row} onClose={onClose}>
    {row && <div style={{ padding: 26 }}>
      <div style={{ width: 46, height: 46, borderRadius: 11, background: row.pausada ? "var(--color-primary-soft)" : "var(--badge-warning-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon name={row.pausada ? "play" : "pause"} size={22} color={row.pausada ? "var(--color-primary)" : "var(--badge-warning-fg)"} /></div>
      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{row.pausada ? "Retomar" : "Pausar"} régua para {row.aluno}?</h3>
      {row.pausada ? (
        <p style={{ margin: "8px 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
          A régua volta a rodar normalmente a partir da próxima execução diária. Lembretes e avisos já enviados antes da pausa <strong style={{ color: "var(--color-text)" }}>não são repetidos</strong>.</p>
      ) : (
        <p style={{ margin: "8px 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
          Enquanto a régua estiver pausada, <strong style={{ color: "var(--color-text)" }}>nenhuma cobrança desta matrícula</strong> vai receber lembrete, aviso de atraso ou negativação automática — mesmo que já esteja vencida. A pausa vale para <strong style={{ color: "var(--color-text)" }}>todas as cobranças, atuais e futuras</strong>.</p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button variant="tertiary" onClick={onClose}>Cancelar</Button>
        <Button iconLeft={row.pausada ? "play" : "pause"} onClick={onConfirm}>{row.pausada ? "Retomar régua" : "Pausar régua"}</Button>
      </div>
    </div>}
  </Modal>
);

/* ── painel da régua (d0) — sem botão "Negativar": tudo automático ── */
const NegativacaoBody = ({ go, setSel }) => {
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };
  const [search, setSearch] = useState("");
  const [fil, setFil] = useState("todos");
  const [page, setPage] = useState(0);
  const [pausarRow, setPausarRow] = useState(null);
  const PER = 6;

  const emAviso = REGUA_ROWS.filter((r) => ["REMINDED", "WARNED1", "WARNED2"].includes(r.etapa));
  const avisoFinal = REGUA_ROWS.filter((r) => r.etapa === "WARNED2");
  const negativadas = REGUA_ROWS.filter((r) => r.etapa === "NEGATIVATED");
  const totalNeg = negativadas.reduce((s, r) => s + r.valor, 0);

  const FILTROS = [
    { value: "todos", label: "Todas", count: REGUA_ROWS.length },
    { value: "avisos", label: "Em aviso", count: emAviso.length },
    { value: "NEGATIVATED", label: "Negativadas", count: negativadas.length },
    { value: "REGULARIZED", label: "Regularizadas", count: REGUA_ROWS.filter((r) => r.etapa === "REGULARIZED").length },
  ];
  const nq = search.trim().toLowerCase();
  const filtered = REGUA_ROWS.filter((r) =>
    (fil === "todos" || (fil === "avisos" ? ["REMINDED", "WARNED1", "WARNED2"].includes(r.etapa) : r.etapa === fil)) &&
    (!nq || r.resp.toLowerCase().includes(nq) || r.aluno.toLowerCase().includes(nq)));
  const npages = Math.ceil(filtered.length / PER) || 1;
  const nsafe = Math.min(page, npages - 1);
  const npaged = filtered.slice(nsafe * PER, (nsafe + 1) * PER);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 24 }}>
        <Metric label="Na régua (em aviso)" value={emAviso.length} sub="lembrete → aviso 1 → aviso 2" icon="bell-ring" accent="var(--badge-warning-fg)" iconBg="var(--badge-warning-bg)" />
        <Metric label="Aviso final (D+30 chegando)" value={avisoFinal.length} sub="negativação automática em breve" icon="alarm-clock" accent="var(--badge-danger-fg)" iconBg="var(--badge-danger-bg)" />
        <Metric label="Negativadas" value={negativadas.length} sub={`${brl(totalNeg)} no SPC/Serasa`} icon="file-x" accent="var(--badge-danger-fg)" iconBg="var(--badge-danger-bg)" />
        <Metric label="Regularizadas (mês)" value={REGUA_ROWS.filter((r) => r.etapa === "REGULARIZED").length} sub="baixa automática ao pagar" trend="up" icon="check-circle-2" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
      </div>

      <Card style={{ padding: 16, marginBottom: 22, display: "flex", alignItems: "center", gap: 12, background: "var(--color-toast-info-bg)", border: "1px solid var(--color-primary-soft)" }}>
        <Icon name="repeat" size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5, flex: 1 }}>
          A régua roda <strong style={{ color: "var(--color-text)" }}>sozinha, todo dia às 8h</strong>: lembrete → aviso 1 → aviso 2 → <strong style={{ color: "var(--color-text)" }}>negativação automática</strong> no prazo configurado. Não é preciso aprovar nada — para exceções, use "Pausar régua" ou o opt-out do responsável.</span>
        <Button variant="secondary" size="sm" iconLeft="settings-2" onClick={() => go("settings")}>Configurar régua</Button>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <SectionHead title="Cobranças na régua" sub="Cada cobrança tem a própria etapa — a mais avançada com sucesso" />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
          <Segmented value={fil} onChange={(v) => { setFil(v); setPage(0); }} size="sm" options={FILTROS} />
          <div style={{ width: 240 }}>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar responsável…" leadingIcon="search" />
          </div>
        </div>
      </div>

      <DataTable cols={[
        { label: "Responsável" }, { label: "Aluno" }, { label: "Valor", align: "right" }, { label: "Atraso", align: "right" }, { label: "Etapa da régua" }, { label: "", align: "right", w: 250 },
      ]}>
        {npaged.map((r) => (
          <TrHover key={r.id}>
            <Td><Person name={r.resp} sub={maskCpf(r.cpf)} />{r.optOut && <div style={{ marginTop: 5 }}><Badge variant="neutral" size="sm"><Icon name="shield-off" size={11} />Nunca negativar</Badge></div>}</Td>
            <Td><span style={{ color: "var(--color-text-muted)" }}>{r.aluno}</span><div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>{r.materia}</div></Td>
            <Td align="right"><span style={{ fontWeight: 700 }}>{brl(r.valor)}</span></Td>
            <Td align="right">{r.atraso > 0
              ? <span style={{ fontWeight: 700, color: r.atraso > 30 ? "var(--badge-danger-fg)" : "var(--badge-warning-fg)" }}>{r.atraso} dias</span>
              : <span style={{ color: "var(--color-text-subtle)" }}>—</span>}</Td>
            <Td><EtapaBadge etapa={r.etapa} pausada={r.pausada} /></Td>
            <Td align="right">
              <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                {!["NEGATIVATED", "REGULARIZED"].includes(r.etapa) && (
                  <Button variant="secondary" size="sm" iconLeft={r.pausada ? "play" : "pause"} onClick={() => setPausarRow(r)}>{r.pausada ? "Retomar régua" : "Pausar régua"}</Button>
                )}
                <Button variant="tertiary" size="sm" iconLeft="eye" onClick={() => { setSel(r.id); go("d1"); }}>Ver</Button>
              </div>
            </Td>
          </TrHover>
        ))}
        {!npaged.length && <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--color-text-subtle)", fontSize: 13.5 }}>Nenhuma cobrança na régua neste filtro.</td></tr>}
      </DataTable>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>{filtered.length} cobrança{filtered.length !== 1 ? "s" : ""} na régua</span>
        {npages > 1 && (
          <Pagination page={nsafe} pages={npages} onChange={setPage} />
        )}
      </div>

      <PausarModal row={pausarRow} onClose={() => setPausarRow(null)} onConfirm={() => {
        pausarRow.pausada = !pausarRow.pausada;
        showToast(pausarRow.pausada ? `Régua pausada para ${pausarRow.aluno} — nada é disparado até retomar` : `Régua retomada para ${pausarRow.aluno}`, "info");
        setPausarRow(null); rerender();
      }} />
      <Toast toast={toast} />
    </>
  );
};

/* ── histórico da régua (Tela 6 — não deduplicar tentativas) ── */
const LOG_LABEL = {
  REMINDER: "Lembrete de vencimento enviado",
  WARNING1: "Primeiro aviso de atraso enviado",
  WARNING2: "Segundo aviso (final) enviado",
  NEGATIVATION: "Negativação solicitada ao Asaas",
  CANCELLATION: "Baixa da negativação solicitada",
};
const ReguaTimeline = ({ logs }) => (
  logs && logs.length ? (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {logs.map((l, i) => {
        const ok = l.result === "success";
        return (
          <div key={i} style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: i < logs.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: ok ? "var(--badge-success-bg)" : "var(--badge-danger-bg)", color: ok ? "var(--badge-success-fg)" : "var(--badge-danger-fg)" }}>
              <Icon name={ok ? "check" : "alert-triangle"} size={15} /></span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{LOG_LABEL[l.action] || l.action}</div>
              <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 2 }}>
                {l.date} · {ok ? <span style={{ color: "var(--badge-success-fg)", fontWeight: 600 }}>Sucesso</span> : <span style={{ color: "var(--badge-danger-fg)", fontWeight: 600 }}>{"Erro: " + l.result.replace("error: ", "")}</span>}</div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div style={{ padding: "18px 0", fontSize: 13.5, color: "var(--color-text-subtle)", textAlign: "center" }}>Nenhuma ação da régua registrada para esta cobrança ainda.</div>
  )
);

/* ── detalhe (d1): painel de negativação + pausa + opt-out + histórico ── */
const D1Detalhe = ({ go, sel, toast }) => {
  const row = REGUA_ROWS.find((x) => x.id === sel) || REGUA_ROWS[0];
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [modal, setModal] = useState(null); // 'baixa' | 'optout' | 'optout-rev'
  const [pausarRow, setPausarRow] = useState(null);
  const [optCheck, setOptCheck] = useState(false);
  const neg = row.etapa === "NEGATIVATED";
  const reg = row.etapa === "REGULARIZED";

  return (
    <Shell screen="d1" go={go} back={() => go("d0")} title="Detalhe da régua" subtitle={`${row.aluno} · ${row.materia} · ${row.resp}`} maxWidth={960}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* valor + dados */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Valor da cobrança</div>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: neg ? "var(--badge-danger-fg)" : "var(--color-text)" }}>{brl(row.valor)}</div>
                {row.atraso > 0 && <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 8 }}><strong style={{ color: "var(--badge-danger-fg)" }}>{row.atraso} dias</strong> em atraso · venceu {row.venc}</div>}
              </div>
              <EtapaBadge etapa={row.etapa} pausada={row.pausada} size="lg" />
            </div>
            <div style={{ paddingTop: 14, borderTop: "1px solid var(--color-border-muted)" }}>
              {[["Responsável", row.resp], ["CPF", maskCpf(row.cpf)], ["Aluno", row.aluno], ["Matéria", row.materia],
                ...(!neg && !reg && row.negativaEm && !row.pausada && !row.optOut ? [["Negativação automática", row.negativaEm]] : [])].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border-muted)", fontSize: 14 }}>
                  <span style={{ color: "var(--color-text-subtle)" }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
              ))}
            </div>
          </Card>

          {/* painel de negativação (Tela 4) — só existe DEPOIS que a negativação ocorreu */}
          {(neg || reg) && row.dunning && (
            <Card style={{ padding: 24 }}>
              <SectionHead title="Negativação SPC/Serasa" sub={reg ? "Regularizada — registro baixado" : "Registrada — baixa automática ao pagar"} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["ID da negativação (Asaas)", <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{row.dunning.asaasId}</span>],
                  ["Valor negativado", brl(row.valor)],
                  ["Taxa de negativação", brl(row.dunning.fee)],
                  ["Solicitada em", row.dunning.requestedAt],
                  ["Aviso legal enviado em (CDC art. 43)", row.dunning.warningSentAt || "Aguardando confirmação do Asaas"],
                  ...(reg ? [["Baixa em", row.dunning.resolvedAt]] : []),
                  ["Origem", row.dunning.actorId ? `Manual — por ${row.dunning.actorId}` : "Automática (régua)"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--color-border-muted)", fontSize: 13.5 }}>
                    <span style={{ color: "var(--color-text-subtle)" }}>{k}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span></div>
                ))}
              </div>
              {neg && (
                <>
                  <Button variant="secondary" iconLeft="file-check-2" block style={{ marginTop: 16 }} onClick={() => setModal("baixa")}>Solicitar baixa manual</Button>
                  <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 8, lineHeight: 1.5 }}>
                    O caminho padrão é a baixa automática assim que o pagamento entra — a baixa manual é só para exceções.</div>
                </>
              )}
            </Card>
          )}

          {/* pausa por matrícula (Tela 3) */}
          {!neg && !reg && (
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Régua desta matrícula</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 3, lineHeight: 1.5, maxWidth: 320 }}>
                    {row.pausada
                      ? "Pausada — nenhuma cobrança desta matrícula recebe lembrete, aviso ou negativação."
                      : "Ativa — lembretes, avisos e negativação automática seguem o prazo configurado."}</div>
                </div>
                <Button variant="secondary" size="sm" iconLeft={row.pausada ? "play" : "pause"} onClick={() => setPausarRow(row)}>{row.pausada ? "Retomar régua" : "Pausar régua"}</Button>
              </div>
            </Card>
          )}

          {/* opt-out por responsável (Tela 5) */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Nunca negativar este responsável
                  {row.optOut && <Badge variant="neutral" size="sm"><Icon name="shield-off" size={11} />Nunca negativar</Badge>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 3, lineHeight: 1.5, maxWidth: 340 }}>
                  {row.optOut
                    ? "Este responsável nunca terá dívidas enviadas ao SPC/Serasa. Avisos de cobrança continuam sendo enviados normalmente."
                    : "Este responsável segue a régua normal: lembretes, avisos e negativação automática."}</div>
              </div>
              <Toggle checked={row.optOut} onChange={() => { setOptCheck(false); setModal(row.optOut ? "optout-rev" : "optout"); }} />
            </div>
          </Card>
        </div>

        {/* histórico da régua (Tela 6) */}
        <Card style={{ padding: 24, alignSelf: "start" }}>
          <SectionHead title="Histórico da régua" sub="Auditoria completa — tentativas com erro não são escondidas" />
          <ReguaTimeline logs={row.logs} />
        </Card>
      </div>

      {/* modal — baixa manual (fallback) */}
      <Modal open={modal === "baixa"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="file-check-2" size={22} color="var(--color-primary)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Solicitar baixa desta negativação?</h3>
          <p style={{ margin: "8px 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            Isso remove a cobrança do SPC/Serasa. Use esta opção apenas se o pagamento já foi confirmado por outro meio — o caminho padrão é a <strong style={{ color: "var(--color-text)" }}>baixa automática</strong>, que ocorre assim que o pagamento é registrado no sistema.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button iconLeft="check" onClick={() => {
              row.etapa = "REGULARIZED";
              row.dunning.resolvedAt = "22/06/2026"; row.dunning.actorId = "Fran Ribeiro";
              row.logs = [{ action: "CANCELLATION", date: "22/06/2026 às " + new Date().toTimeString().slice(0, 5), result: "success" }, ...row.logs];
              setModal(null); toast("Baixa solicitada com sucesso. A cobrança foi regularizada.", "success"); rerender();
            }}>Solicitar baixa</Button>
          </div>
        </div>
      </Modal>

      {/* modal — opt-out (confirmação forte com dupla checagem) */}
      <Modal open={modal === "optout"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="shield-off" size={22} color="var(--color-danger-primary)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Marcar {row.resp} como opt-out de negativação?</h3>
          <p style={{ margin: "8px 0 14px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            A partir de agora, <strong style={{ color: "var(--color-text)" }}>nenhuma cobrança deste responsável será enviada ao SPC/Serasa</strong>, em nenhuma matrícula — atual ou futura. Essa configuração é permanente até que alguém a reverta manualmente aqui mesmo.</p>
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--badge-warning-bg)", fontSize: 13, color: "var(--badge-warning-fg)", lineHeight: 1.5, marginBottom: 16 }}>
            <strong>Lembretes e avisos de cobrança continuam sendo enviados normalmente</strong> — o opt-out afeta apenas a negativação.</div>
          <div style={{ padding: 14, borderRadius: "var(--radius-md)", border: `1.5px solid ${optCheck ? "var(--color-primary)" : "var(--color-border)"}`, marginBottom: 20 }}>
            <Checkbox checked={optCheck} onChange={setOptCheck}>Entendo que esta é uma configuração permanente e afeta todas as matrículas deste responsável.</Checkbox>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" disabled={!optCheck} onClick={() => {
              row.optOut = true; setModal(null); rerender();
              toast("Opt-out ativado. As cobranças deste responsável nunca serão negativadas.", "info");
            }}>Confirmar opt-out</Button>
          </div>
        </div>
      </Modal>

      {/* modal — reverter opt-out (sem fricção forte) */}
      <Modal open={modal === "optout-rev"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Reverter opt-out de {row.resp}?</h3>
          <p style={{ margin: "8px 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            Este responsável volta a seguir a régua normal, incluindo negativação automática em caso de atraso prolongado.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={() => { row.optOut = false; setModal(null); rerender(); toast("Opt-out revertido — régua normal.", "info"); }}>Reverter opt-out</Button>
          </div>
        </div>
      </Modal>

      <PausarModal row={pausarRow} onClose={() => setPausarRow(null)} onConfirm={() => {
        pausarRow.pausada = !pausarRow.pausada;
        toast(pausarRow.pausada ? `Régua pausada para ${pausarRow.aluno}` : `Régua retomada para ${pausarRow.aluno}`, "info");
        setPausarRow(null); rerender();
      }} />
    </Shell>
  );
};

/* ── Configuração da régua (Tela 1 — Settings > Régua de cobrança) ── */
const ReguaConfigTab = ({ toast }) => {
  const [f, setF] = useState({ lembrete: "5", aviso1: "3", aviso2: "10", neg: "30" });
  const [ativa, setAtiva] = useState(true);
  const n = (k) => parseInt(f[k], 10) || 0;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "").slice(0, 3) });
  const err = {
    lembrete: n("lembrete") <= 0 && "Informe um número de dias maior que zero.",
    aviso1: (n("aviso1") <= 0 || n("aviso1") >= n("aviso2")) && "O primeiro aviso deve ser antes do segundo aviso.",
    aviso2: (n("aviso2") <= n("aviso1") || n("aviso2") >= n("neg")) && "O segundo aviso deve ficar entre o primeiro aviso e a negativação.",
    neg: n("neg") <= n("aviso2") && "A negativação deve ocorrer depois do segundo aviso.",
  };
  const ok = !err.lembrete && !err.aviso1 && !err.aviso2 && !err.neg;
  const dim = ativa ? {} : { opacity: 0.55 };
  const campos = [
    ["lembrete", "Lembrete — dias antes do vencimento", "Enviado por WhatsApp/e-mail antes da data de vencimento.", "bell"],
    ["aviso1", "Primeiro aviso — dias após o vencimento", "Enviado quando a cobrança está em atraso.", "bell-ring"],
    ["aviso2", "Segundo aviso — dias após o vencimento", "Aviso final antes da negativação.", "alarm-clock"],
    ["neg", "Negativação automática — dias após o vencimento", "A partir deste prazo, a dívida é enviada automaticamente ao SPC/Serasa. Não é preciso aprovar nada.", "gavel"],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>Régua ativa</div>
          <div style={{ fontSize: 13, color: ativa ? "var(--color-text-subtle)" : "var(--badge-warning-fg)", marginTop: 3, lineHeight: 1.5, maxWidth: 480 }}>
            {ativa
              ? "A régua está rodando para esta unidade."
              : "Nenhuma cobrança desta unidade recebe lembrete, aviso ou negativação enquanto a régua estiver desligada."}</div>
        </div>
        <Toggle checked={ativa} onChange={(v) => { setAtiva(v); toast(v ? "Régua ativada" : "Régua desligada — nenhuma ação será disparada", "info"); }} />
      </Card>

      <Card style={{ padding: 24, ...dim }}>
        <SectionHead title="Prazos da régua" sub="Ordem obrigatória: 1º aviso < 2º aviso < negativação. Mudanças valem a partir da próxima execução (8h)." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {campos.map(([k, label, helper, ic]) => (
            <Field key={k} label={label} hint={err[k] ? undefined : helper} error={err[k] || undefined}>
              <Input value={f[k]} onChange={set(k)} error={!!err[k]} inputMode="numeric" leadingIcon={ic}
                trailing={<span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-subtle)" }}>dias</span>} style={{ maxWidth: 220 }} />
            </Field>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Button iconLeft="check" disabled={!ok} onClick={() => toast("Configuração salva — vale a partir da próxima execução da régua (8h).", "success")}>Salvar configuração</Button>
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)", display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: 700 }}>
          <Icon name="circle-dollar-sign" size={17} color="var(--color-primary)" />Custos da régua</div>
        <div style={{ padding: "6px 20px" }}>
          {[["WhatsApp / e-mail", "R$ 0,55 por mensagem enviada"], ["Negativação", "R$ 9,90 por cobrança negativada"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--color-border-muted)", fontSize: 14 }}>
              <span style={{ color: "var(--color-text-subtle)" }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
          ))}
          <div style={{ padding: "11px 0", fontSize: 12.5, color: "var(--color-text-subtle)" }}>Valores cobrados pelo Asaas, repassados por uso.</div>
        </div>
      </Card>
    </div>
  );
};

Object.assign(window, { NegativacaoBody, D1Detalhe, EtapaBadge, ReguaConfigTab, REGUA_ROWS, PausarModal, ReguaTimeline });

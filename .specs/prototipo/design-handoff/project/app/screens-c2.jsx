/* Flow C (cont.) — C4 Detalhe da cobrança · modais de emissão (avulsa + lote) · C5 extra (backlog)
 * Conciliado com DH-f2: multa fixa 2% + juros 1% a.m. pro rata (só OVERDUE), desconto informativo,
 * estados BLOCKED/ERROR sem bypass, idempotência comunicada como sucesso informativo. */

const CopyRow = ({ label, value, mono, toast }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { setCopied(true); toast("Copiado para a área de transferência", "info"); setTimeout(() => setCopied(false), 1600); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: "var(--radius-md)",
      border: "1px solid var(--color-border-input)", background: "var(--color-surface)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)", fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13.5, fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)", color: "var(--color-text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>{value}</div>
      </div>
      <Button variant="secondary" size="sm" iconLeft={copied ? "check" : "copy"} onClick={copy}>{copied ? "Copiado" : "Copiar"}</Button>
    </div>
  );
};

const C4Detalhe = ({ go, sel, toast }) => {
  const c = COBRANCAS.find((x) => x.id === sel) || COBRANCAS.find((x) => x.status === "vencida");
  const [modal, setModal] = useState(null);
  const paga = c.status === "paga";
  const vencida = c.status === "vencida";
  const bloqueada = c.status === "bloqueada";
  const erro = c.status === "erro";
  const cancelada = c.status === "cancelada";
  const avencer = c.status === "avencer";

  // Multa fixa (2%, 1x) + juros pro rata dia (1% a.m.) — SÓ quando OVERDUE (RN §2.2)
  const multa = vencida ? Math.round(c.valor * 0.02 * 100) / 100 : 0;
  const juros = vencida ? Math.round(c.valor * 0.01 * ((c.atraso || 1) / 30) * 100) / 100 : 0;
  const total = c.valor + multa + juros;

  // Histórico — só o que aconteceu + o que está confirmado/agendado
  const [dd, mm, yyyy] = c.venc.split("/");
  const emit = `01/${mm}/${yyyy}`;
  const hist = [{ label: "Cobrança gerada", date: `${emit} · 08:00`, icon: "file-plus", state: "done" }];
  if (!bloqueada && !erro) hist.push({ label: "Enviada (WhatsApp · e-mail)", date: `${emit} · 08:01`, icon: "send", state: "done" });
  if (paga) {
    hist.push({ label: "Pagamento confirmado", date: c.pagoEm, icon: "check-circle-2", state: "done", tone: "ok" });
    hist.push({ label: "Nota fiscal emitida", date: c.pagoEm, icon: "receipt", state: "done", tone: "ok" });
  } else if (vencida) {
    hist.push({ label: "Cobrança vencida", date: c.venc, icon: "calendar-x", state: "done", tone: "warn" });
    hist.push({ label: "Aviso de atraso enviado", date: `${String(+dd + 1).padStart(2, "0")}/${mm}/${yyyy}`, icon: "bell-ring", state: "done", tone: "warn" });
    hist.push({ label: "Elegível p/ negativação", date: `a partir de ${String(+dd + 15).padStart(2, "0")}/${mm}/${yyyy}`, icon: "gavel", state: "scheduled", tone: "danger" });
  } else if (bloqueada) {
    hist.push({ label: "Aguardando cadastro do responsável", date: "boleto ainda não gerado", icon: "user-x", state: "current", tone: "warn" });
  } else if (erro) {
    hist.push({ label: "Falha na emissão", date: c.erroMsg || "erro no sistema de pagamento", icon: "alert-triangle", state: "done", tone: "danger" });
    hist.push({ label: "Nova tentativa automática", date: "agendada para amanhã, 08:00", icon: "refresh-cw", state: "scheduled" });
  } else if (cancelada) {
    hist.push({ label: "Cancelada pela escola", date: c.canceladaEm || "", icon: "x-circle", state: "done" });
  } else {
    hist.push({ label: "Aguardando pagamento", date: `vence em ${c.venc}`, icon: "clock", state: "current" });
    hist.push({ label: "Lembrete agendado", date: `${String(Math.max(1, +dd - 3)).padStart(2, "0")}/${mm}/${yyyy} · 3 dias antes`, icon: "bell", state: "scheduled" });
  }

  const reemitir = () => toast("Tentando emitir novamente… A cobrança volta para \"A vencer\" se der certo.", "info");

  return (
    <Shell screen="c4" go={go} back={() => go("c3")} title="Detalhe da cobrança" subtitle={`${c.aluno} — ${c.materia || "Mensalidade"} — ${c.desc.replace("Mensalidade ", "")}`} maxWidth={960}>
      {/* banners de estado — BLOCKED / ERROR */}
      {bloqueada && (
        <Card style={{ padding: 18, marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 13, background: "var(--badge-warning-bg)", border: "1px solid var(--badge-warning-fg)" }}>
          <Icon name="alert-triangle" size={20} color="var(--badge-warning-fg)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--badge-warning-fg)" }}>Responsável não cadastrado no sistema de pagamento</div>
            <div style={{ fontSize: 13.5, color: "var(--badge-warning-fg)", marginTop: 3, lineHeight: 1.5, opacity: 0.9 }}>Nenhum boleto foi gerado para esta cobrança. Complete o cadastro para emitir.</div>
          </div>
          <Button variant="secondary" size="sm" iconLeft="user-plus" onClick={() => toast("Abrindo cadastro do responsável…", "info")}>Completar cadastro do responsável</Button>
        </Card>
      )}
      {erro && (
        <Card style={{ padding: 18, marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 13, background: "var(--badge-danger-bg)", border: "1px solid var(--badge-danger-fg)" }}>
          <Icon name="alert-triangle" size={20} color="var(--badge-danger-fg)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--badge-danger-fg)" }}>Não conseguimos gerar esta cobrança no sistema de pagamento</div>
            <div style={{ fontSize: 13.5, color: "var(--badge-danger-fg)", marginTop: 3, lineHeight: 1.5, opacity: 0.9 }}>
              Motivo: {c.erroMsg || "erro técnico"}. Vamos tentar de novo automaticamente, ou você pode tentar agora.</div>
          </div>
          <Button size="sm" iconLeft="refresh-cw" onClick={reemitir}>Reemitir</Button>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
        {/* Left: amount + payment */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>{vencida ? "Total a pagar" : paga ? "Valor pago" : "Valor"}</div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1,
                  color: vencida ? "var(--badge-danger-fg)" : "var(--color-text)" }}>{brl(vencida ? total : c.valor)}</div>
              </div>
              <StatusBadge status={c.status} size="lg" />
            </div>
            {/* composição do valor */}
            {(vencida || c.descontoTipo) && (
              <div style={{ marginTop: 16, borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                {[
                  ["Valor da mensalidade", brl(c.valor)],
                  ...(c.descontoTipo ? [["Desconto aplicado (negociado na matrícula)", "− " + brl(c.descontoVal) + " já incluído"]] : []),
                  ...(vencida ? [[`Multa por atraso (2%)`, "+ " + brl(multa)], [`Juros (1% a.m., ${c.atraso} dias)`, "+ " + brl(juros)], ["Total a pagar", brl(total)]] : []),
                ].map(([k, v], i, arr) => {
                  const last = vencida && i === arr.length - 1;
                  return (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: last ? 14.5 : 13,
                      background: last ? "var(--badge-danger-bg)" : "var(--color-bg)", borderTop: i > 0 ? "1px solid var(--color-border-muted)" : "none" }}>
                      <span style={{ color: last ? "var(--badge-danger-fg)" : "var(--color-text-subtle)", fontWeight: last ? 700 : 400 }}>{k}</span>
                      <span style={{ fontWeight: last ? 800 : 600, color: last ? "var(--badge-danger-fg)" : "var(--color-text)" }}>{v}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {paga && <div style={{ marginTop: 10, fontSize: 13, color: "var(--badge-success-fg)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="check-circle-2" size={15} />Pago em {c.pagoEm} — valor confirmado pelo sistema de pagamento</div>}
            <div style={{ display: "flex", gap: 20, marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--color-border-muted)", flexWrap: "wrap" }}>
              {[["Responsável", c.resp], ["Aluno", c.aluno], ["Matéria", c.materia || "—"], ["Vencimento", c.venc]].map(([k, v]) => (
                <div key={k}><div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
          </Card>

          {/* Pagamento — boleto sempre com PIX embutido (mesmo documento) */}
          {bloqueada ? (
            <Card style={{ padding: 24, textAlign: "center" }}>
              <Icon name="file-x-2" size={30} color="var(--color-text-subtle)" />
              <p style={{ margin: "12px auto 0", fontSize: 13.5, color: "var(--color-text-subtle)", maxWidth: 380, lineHeight: 1.55 }}>
                O boleto e o PIX aparecerão aqui assim que o cadastro do responsável for concluído.</p>
            </Card>
          ) : erro ? (
            <Card style={{ padding: 24, textAlign: "center" }}>
              <Icon name="file-x-2" size={30} color="var(--color-text-subtle)" />
              <p style={{ margin: "12px auto 0", fontSize: 13.5, color: "var(--color-text-subtle)", maxWidth: 380, lineHeight: 1.55 }}>
                O boleto não foi gerado por causa da falha na emissão. Reemita para gerar o documento.</p>
            </Card>
          ) : (
            <Card style={{ padding: 24 }}>
              <SectionHead title="Pagamento" sub="Um único documento: boleto com PIX embutido" />
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  <Button variant="secondary" iconLeft="file-text" block onClick={() => toast("Abrindo boleto em PDF…", "info")}>Baixar boleto (PDF)</Button>
                  <CopyRow label="Linha digitável" value="34191.79001 01043.510047 91020.150008 1 98770000045000" mono toast={toast} />
                  <CopyRow label="PIX copia-e-cola" value="00020126580014br.gov.bcb.pix0136a1f3c2…5204000053039865802BR" mono toast={toast} />
                </div>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <QrCode size={132} />
                  <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)", marginTop: 6 }}>Aponte a câmera</div>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--color-text-subtle)" }}>#pay_{c.id.replace("cob_", "")}92k</div>
            </Card>
          )}

          {/* Nota fiscal — only when paid */}
          {paga && (
            <Card style={{ padding: 24 }}>
              <SectionHead title="Nota fiscal" sub={`NFS-e nº 0000${c.id.replace("cob_", "")} · emitida em ${c.pagoEm}`} />
              <div style={{ display: "flex", gap: 12 }}>
                <Button variant="secondary" iconLeft="download" onClick={() => toast("Baixando NFS-e (PDF)…", "info")}>Baixar PDF</Button>
                <Button variant="secondary" iconLeft="file-code-2" onClick={() => toast("Baixando NFS-e (XML)…", "info")}>Baixar XML</Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right: history + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 24 }}>
            <SectionHead title="Histórico" sub="Status até agora e próximos passos confirmados" />
            <div style={{ position: "relative" }}>
              {hist.map((h, i) => {
                const done = h.state === "done";
                const current = h.state === "current";
                const scheduled = h.state === "scheduled";
                const fg = h.tone === "ok" ? "var(--badge-success-fg)" : h.tone === "warn" ? "var(--badge-warning-fg)" : h.tone === "danger" ? "var(--badge-danger-fg)" : "var(--color-primary)";
                const bg = h.tone === "ok" ? "var(--badge-success-bg)" : h.tone === "warn" ? "var(--badge-warning-bg)" : h.tone === "danger" ? "var(--badge-danger-bg)" : "var(--color-primary-soft)";
                return (
                  <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < hist.length - 1 ? 22 : 0, position: "relative" }}>
                    {i < hist.length - 1 && <div style={{ position: "absolute", left: 15, top: 30, bottom: 0, width: 2,
                      background: done ? "var(--color-primary-soft)" : "var(--color-border)", borderRight: scheduled || hist[i + 1].state === "scheduled" ? "2px dashed var(--color-border-strong)" : "none", opacity: scheduled ? 0.6 : 1 }} />}
                    <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      background: done || current ? bg : "var(--color-surface)",
                      border: scheduled ? "1.5px dashed var(--color-border-strong)" : current ? `1.5px solid ${fg}` : "none",
                      color: done || current ? fg : "var(--color-text-subtle)", opacity: scheduled ? 0.85 : 1 }}>
                      <Icon name={h.icon} size={16} /></div>
                    <div style={{ paddingTop: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: done || current ? "var(--color-text)" : "var(--color-text-subtle)" }}>{h.label}</span>
                        {scheduled && <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                          color: "var(--color-text-subtle)", background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "2px 7px", borderRadius: 999 }}>Agendado</span>}
                        {current && <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                          color: fg, background: bg, padding: "2px 7px", borderRadius: 999 }}>Agora</span>}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 2 }}>{h.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Ações — ocultas (não desabilitadas) fora das condições: PAID/CANCELLED sem ações; BLOCKED/ERROR tratados nos banners */}
          {!paga && !cancelada && !bloqueada && !erro && (
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 14 }}>Ações</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Button iconLeft="send" block onClick={() => toast(`Reenviando… Responsável notificado novamente (WhatsApp · e-mail)`, "success")}>Reenviar cobrança</Button>
                {avencer && (
                  <Button variant="tertiary" iconLeft="x-circle" block onClick={() => setModal("cancelar")}
                    style={{ color: "var(--color-danger-primary)" }}>Cancelar cobrança</Button>
                )}
              </div>
              {vencida && (
                <div style={{ marginTop: 16, padding: 14, borderRadius: "var(--radius-md)", background: "var(--badge-warning-bg)", display: "flex", gap: 10 }}>
                  <Icon name="gavel" size={18} color="var(--badge-warning-fg)" style={{ marginTop: 1 }} />
                  <div style={{ fontSize: 12.5, color: "var(--badge-warning-fg)", lineHeight: 1.5 }}>
                    Atraso elegível para negativação após aviso prévio. <button onClick={() => go("d0")} style={{ background: "none", border: "none", padding: 0, color: "var(--badge-warning-fg)", fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Ver negativação</button></div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <Modal open={modal === "cancelar"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="x-circle" size={22} color="var(--color-danger-primary)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Cancelar esta cobrança?</h3>
          <p style={{ margin: "8px 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            Essa ação não pode ser desfeita e o boleto de {brl(c.valor)} de {c.resp} deixará de ser válido. O responsável é avisado automaticamente.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Voltar</Button>
            <Button variant="danger" onClick={() => { setModal(null); toast("Cobrança cancelada", "warning"); go("c3"); }}>Cancelar cobrança</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};

/* ─── Emissão manual avulsa (1 Enrollment × 1 mês) — RN-17, idempotência RN-03 ── */
const MESES_REF = [{ value: "2026-06", label: "Junho/2026 (mês corrente)" }, { value: "2026-07", label: "Julho/2026" }];

const EmitirAvulsaModal = ({ open, onClose, toast }) => {
  const ATIVAS = MATRICULAS.filter((m) => m.status === "ativa").flatMap((m) =>
    m.materias.map((mat) => ({ id: m.id + mat, label: `${m.aluno} — ${mat} (${m.pagante})`, aluno: m.aluno, materia: mat, semCadastro: m.semCadastro })));
  const [enr, setEnr] = useState("");
  const [mes, setMes] = useState("2026-06");
  const [enviando, setEnviando] = useState(false);
  const sel = ATIVAS.find((a) => a.id === enr);
  // idempotência preventiva: já existe Invoice p/ enrollmentId:referenceMonth?
  const jaEmitida = sel && mes === "2026-06" && COBRANCAS.some((cb) => cb.aluno === sel.aluno && cb.materia === sel.materia && cb.desc.includes("Junho"));
  const emitir = () => {
    setEnviando(true);
    setTimeout(() => {
      setEnviando(false); onClose();
      if (sel.semCadastro) toast("Não foi possível emitir: o responsável ainda não está cadastrado no sistema de pagamento. A cobrança ficou como \"Aguardando cadastro\".", "warning");
      else toast("Cobrança emitida com sucesso.", "success");
      setEnr(""); setMes("2026-06");
    }, 900);
  };
  return (
    <Modal open={open} onClose={() => !enviando && onClose()}>
      <div style={{ padding: 26 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 700 }}>Emitir cobrança avulsa</h3>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Fora do ciclo automático — sempre boleto com PIX embutido, sem escolher forma de pagamento.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Matrícula (aluno + matéria)" required>
            <Select value={enr} onChange={(e) => setEnr(e.target.value)} leadingIcon="graduation-cap"
              options={[{ value: "", label: "Selecionar matrícula ativa" }, ...ATIVAS.map((a) => ({ value: a.id, label: a.label }))]} /></Field>
          <Field label="Mês de referência" error={jaEmitida ? `Já existe cobrança de ${sel.aluno} — ${sel.materia} para este mês` : undefined}>
            <Select value={mes} onChange={(e) => setMes(e.target.value)} leadingIcon="calendar" options={MESES_REF} /></Field>
          {jaEmitida && (
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              Emitir de novo não duplica — o sistema devolve a cobrança existente. Escolha outro mês ou abra a cobrança já emitida.</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="tertiary" disabled={enviando} onClick={onClose}>Cancelar</Button>
          <Button iconLeft="receipt" disabled={!sel || jaEmitida || enviando} onClick={emitir}>{enviando ? "Emitindo…" : "Emitir cobrança"}</Button>
        </div>
      </div>
    </Modal>
  );
};

/* ─── Emissão em lote (todas Enrollments ACTIVE de uma matéria) — RN-18 ── */
const EmitirLoteModal = ({ open, onClose, toast }) => {
  const [materia, setMateria] = useState("");
  const [mes, setMes] = useState("2026-06");
  const [fase, setFase] = useState("form"); // form | confirmar | enviando | resultado
  const ativas = MATRICULAS.filter((m) => m.status === "ativa" && m.materias.includes(materia));
  const valorEstimado = ativas.length * 450;
  const jaEmitidas = mes === "2026-06" ? ativas.filter((m) => COBRANCAS.some((cb) => cb.aluno === m.aluno && cb.desc.includes("Junho"))).length : 0;
  const bloqueadas = ativas.filter((m) => m.semCadastro).length;
  const emitidas = Math.max(0, ativas.length - jaEmitidas - bloqueadas);
  const disparar = () => { setFase("enviando"); setTimeout(() => setFase("resultado"), 1400); };
  const fechar = () => { setFase("form"); setMateria(""); onClose(); };
  return (
    <Modal open={open} onClose={() => fase !== "enviando" && fechar()}>
      <div style={{ padding: 26 }}>
        {fase !== "resultado" ? (
          <>
            <h3 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 700 }}>Emitir cobrança em lote</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Todas as matrículas ativas da matéria, de uma vez. Rodar de novo não duplica cobranças já emitidas.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Matéria/turma" required>
                <Select value={materia} onChange={(e) => setMateria(e.target.value)} leadingIcon="book-open"
                  options={[{ value: "", label: "Selecionar matéria" }, ...["Matemática", "Português", "Inglês", "Japonês"].map((m) => ({ value: m, label: m }))]} /></Field>
              <Field label="Mês de referência">
                <Select value={mes} onChange={(e) => setMes(e.target.value)} leadingIcon="calendar" options={MESES_REF} /></Field>
              {materia && (
                ativas.length > 0 ? (
                  <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{ativas.length} aluno{ativas.length > 1 ? "s" : ""} ativo{ativas.length > 1 ? "s" : ""} nesta matéria</div>
                    <div style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>Valor total estimado: <strong style={{ color: "var(--color-text)" }}>{brl(valorEstimado)}</strong></div>
                    {jaEmitidas > 0 && <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>{jaEmitidas} já {jaEmitidas > 1 ? "têm" : "tem"} cobrança emitida este mês — serão ignoradas</div>}
                    {bloqueadas > 0 && <div style={{ fontSize: 12.5, color: "var(--badge-warning-fg)" }}>{bloqueadas} responsável{bloqueadas > 1 ? "is" : ""} sem cadastro no sistema de pagamento — ficarão bloqueadas</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, color: "var(--color-danger-primary)" }}>Selecione uma matéria com alunos ativos.</div>
                )
              )}
            </div>
            {fase === "confirmar" && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: "var(--radius-md)", background: "var(--badge-warning-bg)", fontSize: 13.5, color: "var(--badge-warning-fg)", lineHeight: 1.55 }}>
                <strong>Confirmar emissão em lote?</strong> Isso vai gerar até {ativas.length} cobranças reais no valor total de {brl(valorEstimado)}.
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <Button variant="tertiary" disabled={fase === "enviando"} onClick={fechar}>Cancelar</Button>
              {fase === "form" && <Button iconLeft="layers" disabled={!materia || ativas.length === 0} onClick={() => setFase("confirmar")}>Emitir em lote</Button>}
              {fase === "confirmar" && <Button iconLeft="check" onClick={disparar}>Confirmar emissão para {ativas.length} aluno{ativas.length > 1 ? "s" : ""}</Button>}
              {fase === "enviando" && <Button disabled>Emitindo… isso pode levar alguns segundos</Button>}
            </div>
          </>
        ) : (
          <>
            <h3 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 700 }}>Lote processado</h3>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--color-text-muted)" }}>{materia} · {MESES_REF.find((m) => m.value === mes).label}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                [emitidas, "cobranças emitidas", "var(--badge-success-bg)", "var(--badge-success-fg)", "check-circle-2"],
                [jaEmitidas, "já haviam sido emitidas este mês", "var(--badge-neutral-bg)", "var(--badge-neutral-fg)", "copy-check"],
                [bloqueadas, "bloqueadas — responsável sem cadastro", "var(--badge-warning-bg)", "var(--badge-warning-fg)", "user-x"],
                [0, "falharam ao emitir", "var(--badge-danger-bg)", "var(--badge-danger-fg)", "alert-triangle"],
              ].map(([n, label, bg, fg, ic]) => (
                <div key={label} style={{ padding: 14, borderRadius: "var(--radius-md)", background: bg, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Icon name={ic} size={17} color={fg} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div><div style={{ fontSize: 20, fontWeight: 800, color: fg, lineHeight: 1 }}>{n}</div>
                    <div style={{ fontSize: 12, color: fg, marginTop: 4, lineHeight: 1.4 }}>{label}</div></div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Button onClick={() => { fechar(); toast(`${emitidas} cobranças emitidas · ${jaEmitidas} já existiam · ${bloqueadas} bloqueadas`, "success"); }}>Fechar</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

/* ─── C5 Nova cobrança extra (multa/taxa avulsa) — mantida fora da spec (backlog) ── */
const C5Nova = ({ go, toast }) => {
  const [resp, setResp] = useState(null);
  const [busca, setBusca] = useState("");
  const [desc, setDesc] = useState("Multa de cancelamento");
  const [valor, setValor] = useState("250,00");

  const candidatos = ["Maria Silva", "Carlos Andrade", "Antônio Reis", "Juliana Prado"].filter((n) => n.toLowerCase().includes(busca.toLowerCase()));
  const valNum = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;

  return (
    <Shell screen="c5" go={go} back={() => go("c3")} title="Nova cobrança extra" subtitle="Multa, taxa avulsa ou item fora da mensalidade" maxWidth={760}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card style={{ padding: 24 }}>
          <SectionHead title="Responsável" sub="Busque por nome ou CPF" />
          {resp ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: "var(--radius-md)", background: "var(--color-primary-softer)", border: "1px solid var(--color-primary-soft)" }}>
              <Person name={resp} sub="Responsável financeiro" />
              <Button variant="tertiary" size="sm" iconLeft="x" onClick={() => setResp(null)}>Trocar</Button>
            </div>
          ) : (
            <>
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: Maria Silva ou 123.456.789-00" leadingIcon="search" />
              {busca && (
                <div style={{ marginTop: 10, border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {candidatos.length ? candidatos.map((n, i) => (
                    <button key={n} onClick={() => { setResp(n); setBusca(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 14px",
                      border: "none", borderBottom: i < candidatos.length - 1 ? "1px solid var(--color-border-muted)" : "none", background: "var(--color-bg)", cursor: "pointer", textAlign: "left" }}>
                      <Person name={n} /></button>
                  )) : <div style={{ padding: 14, fontSize: 13.5, color: "var(--color-text-subtle)" }}>Nenhum responsável encontrado.</div>}
                </div>
              )}
            </>
          )}
        </Card>

        <Card style={{ padding: 24 }}>
          <SectionHead title="Cobrança" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Descrição" required><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Multa de cancelamento" /></Field>
            <Field label="Valor" required>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal"
                leadingIcon="circle-dollar-sign" trailing={<span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>BRL</span>} /></Field>
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button variant="tertiary" onClick={() => go("c3")}>Cancelar</Button>
          <Button size="lg" iconRight="arrow-right" disabled={!resp || !valNum}
            onClick={() => { toast(`Cobrança de ${brl(valNum)} gerada para ${resp}`, "success"); go("c4"); }}>Gerar cobrança</Button>
        </div>
      </div>
    </Shell>
  );
};

window.C4Detalhe = C4Detalhe;
window.C5Nova = C5Nova;
window.EmitirAvulsaModal = EmitirAvulsaModal;
window.EmitirLoteModal = EmitirLoteModal;

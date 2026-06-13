/* Flow C (cont.) — C4 Detalhe da cobrança · C5 Nova cobrança extra */

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
  const contest = c.status === "contestacao";

  // Histórico = eventos que JÁ aconteceram (done) + próximos passos CONFIRMADOS (scheduled).
  // Nada especulativo: só o que ocorreu até agora e o que está agendado.
  const [dd, mm, yyyy] = c.venc.split("/");
  const emit = `01/${mm}/${yyyy}`;
  const hist = [
    { label: "Cobrança emitida", date: `${emit} · 08:00`, icon: "file-plus", state: "done" },
    { label: "Enviada (WhatsApp · e-mail · SMS)", date: `${emit} · 08:01`, icon: "send", state: "done" },
  ];
  if (paga) {
    hist.push({ label: "Pagamento confirmado", date: c.pagoEm, icon: "check-circle-2", state: "done", tone: "ok" });
    hist.push({ label: "Nota fiscal emitida", date: c.pagoEm, icon: "receipt", state: "done", tone: "ok" });
  } else if (vencida) {
    hist.push({ label: "Cobrança vencida", date: c.venc, icon: "calendar-x", state: "done", tone: "warn" });
    hist.push({ label: "Aviso de atraso enviado", date: `${String(+dd + 1).padStart(2, "0")}/${mm}/${yyyy}`, icon: "bell-ring", state: "done", tone: "warn" });
    hist.push({ label: "Reenvio de cobrança agendado", date: "02/06/2026", icon: "send", state: "scheduled" });
    hist.push({ label: "Elegível p/ negativação", date: `a partir de ${String(+dd + 15).padStart(2, "0")}/${mm}/${yyyy}`, icon: "gavel", state: "scheduled", tone: "danger" });
  } else if (contest) {
    hist.push({ label: "Contestação aberta pelo responsável", date: "12/05/2026", icon: "message-square-warning", state: "done", tone: "warn" });
    hist.push({ label: "Em análise", date: "aguardando resposta", icon: "search", state: "current", tone: "warn" });
  } else {
    // a vencer
    hist.push({ label: "Aguardando pagamento", date: `vence em ${c.venc}`, icon: "clock", state: "current" });
    hist.push({ label: "Lembrete agendado", date: `${String(Math.max(1, +dd - 3)).padStart(2, "0")}/${mm}/${yyyy} · 3 dias antes`, icon: "bell", state: "scheduled" });
  }

  return (
    <Shell screen="c4" go={go} back={() => go("c3")} title="Detalhe da cobrança" subtitle={`#${c.id.replace("cob_", "")} · ${c.desc}`} maxWidth={960}>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
        {/* Left: amount + payment */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Valor {vencida ? "atualizado" : ""}</div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1,
                  color: vencida ? "var(--badge-danger-fg)" : "var(--color-text)" }}>{brl(vencida ? c.valor + 42 : c.valor)}</div>
                {vencida && <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 8 }}>
                  {brl(c.valor)} + multa 2% + juros · <strong style={{ color: "var(--badge-danger-fg)" }}>{c.atraso} dias em atraso</strong></div>}
              </div>
              <StatusBadge status={c.status} size="lg" />
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--color-border-muted)" }}>
              {[["Responsável", c.resp], ["Aluno", c.aluno], ["Vencimento", c.venc]].map(([k, v]) => (
                <div key={k}><div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 24 }}>
            <SectionHead title="Pagamento" sub="Boleto, linha digitável e PIX" />
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                <Button variant="secondary" iconLeft="file-text" block onClick={() => toast("Abrindo boleto em PDF…", "info")}>Ver boleto (PDF)</Button>
                <CopyRow label="Linha digitável" value="34191.79001 01043.510047 91020.150008 1 98770000045000" mono toast={toast} />
                <CopyRow label="PIX copia-e-cola" value="00020126580014br.gov.bcb.pix0136a1f3c2…5204000053039865802BR" mono toast={toast} />
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <QrCode size={132} />
                <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)", marginTop: 6 }}>Aponte a câmera</div>
              </div>
            </div>
          </Card>

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

          {!paga && (
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 14 }}>Ações</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Button iconLeft="send" block onClick={() => toast(`Cobrança reenviada para ${c.resp} (WhatsApp · e-mail · SMS)`, "success")}>Reenviar cobrança</Button>
                <Button variant="tertiary" iconLeft="x-circle" block onClick={() => setModal("cancelar")}
                  style={{ color: "var(--color-danger-primary)" }}>Cancelar cobrança</Button>
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

      <Modal open={modal === "editar"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 700 }}>Editar valor</h3>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Gera uma nova cobrança com o valor ajustado.</p>
          <Field label="Novo valor"><Input defaultValue={c.valor.toFixed(2).replace(".", ",")} leadingIcon="circle-dollar-sign" inputMode="decimal" /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={() => { setModal(null); toast("Valor atualizado", "success"); }}>Salvar</Button>
          </div>
        </div>
      </Modal>
      <Modal open={modal === "cancelar"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="x-circle" size={22} color="var(--color-danger-primary)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Cancelar cobrança?</h3>
          <p style={{ margin: "8px 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            A cobrança de {c.resp} no valor de {brl(c.valor)} será cancelada. O responsável é avisado automaticamente.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Voltar</Button>
            <Button variant="danger" onClick={() => { setModal(null); toast("Cobrança cancelada", "warning"); go("c3"); }}>Cancelar cobrança</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};

/* ─── C5 Nova cobrança extra ───────────────────────────────────────────── */
const C5Nova = ({ go, toast }) => {
  const [resp, setResp] = useState(null);
  const [busca, setBusca] = useState("");
  const [desc, setDesc] = useState("Multa de cancelamento");
  const [valor, setValor] = useState("250,00");
  const [descTipo, setDescTipo] = useState("none");
  const [descVal, setDescVal] = useState("0");

  const candidatos = ["Maria Silva", "Carlos Andrade", "Antônio Reis", "Juliana Prado"].filter((n) => n.toLowerCase().includes(busca.toLowerCase()));
  const valNum = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
  const dNum = parseFloat(descVal.replace(",", ".")) || 0;
  const desconto = descTipo === "percent" ? valNum * dNum / 100 : descTipo === "fixed" ? dNum : 0;
  const total = Math.max(0, valNum - desconto);

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
            <Field label="Desconto (opcional)">
              <div style={{ display: "flex", gap: 10 }}>
                <Segmented key={descTipo} value={descTipo} onChange={setDescTipo} options={[{ value: "none", label: "Nenhum" }, { value: "percent", label: "%" }, { value: "fixed", label: "R$" }]} />
                {descTipo !== "none" && <Input value={descVal} onChange={(e) => setDescVal(e.target.value)} inputMode="decimal" style={{ flex: 1 }} placeholder={descTipo === "percent" ? "10" : "50,00"} />}
              </div>
            </Field>
          </div>
        </Card>

        <Card style={{ padding: 20, background: "var(--color-primary)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>Total da cobrança</div>
            {desconto > 0 && <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 2 }}>{brl(valNum)} − {brl(desconto)} desconto</div>}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(total)}</div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button variant="tertiary" onClick={() => go("c3")}>Cancelar</Button>
          <Button size="lg" iconRight="arrow-right" disabled={!resp || !valNum}
            onClick={() => { toast(`Cobrança de ${brl(total)} gerada para ${resp}`, "success"); go("c4"); }}>Gerar cobrança</Button>
        </div>
      </div>
    </Shell>
  );
};

window.C4Detalhe = C4Detalhe;
window.C5Nova = C5Nova;

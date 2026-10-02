/* Flow D — Inadimplência e negativação (Fran) · desktop + Configurações */

const NegativacaoBody = ({ go, setSel }) => {
  const [modal, setModal] = useState(null); // { id } for confirm
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [fil, setFil] = useState("todos");
  const [page, setPage] = useState(0);
  const NEG_PER_PAGE = 6;
  const showToast = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };
  const emAviso = INADIMPLENTES.filter((i) => i.status === "emaviso");
  const elegiveis = INADIMPLENTES.filter((i) => i.status === "elegivel");
  const negativados = INADIMPLENTES.filter((i) => i.status === "negativado");
  const totalEleg = elegiveis.reduce((s, i) => s + i.valor, 0);
  const totalNeg = negativados.reduce((s, i) => s + i.valor, 0);
  const target = INADIMPLENTES.find((x) => x.id === modal);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 24 }}>
        <Metric label="Em aviso" value={emAviso.length} sub="dentro do prazo legal" icon="bell-ring" accent="var(--badge-warning-fg)" iconBg="var(--badge-warning-bg)" />
        <Metric label="Elegíveis p/ negativar" value={elegiveis.length} sub={`${brl(totalEleg)} aguardando você`} icon="gavel" accent="var(--badge-danger-fg)" iconBg="var(--badge-danger-bg)" />
        <Metric label="Negativados" value={negativados.length} sub={`${brl(totalNeg)} no SPC/Serasa`} icon="file-x" accent="var(--badge-danger-fg)" iconBg="var(--badge-danger-bg)" />
        <Metric label="Regularizados (mês)" value="3" sub="baixa automática ao pagar" trend="up" icon="check-circle-2" accent="var(--badge-success-fg)" iconBg="var(--badge-success-bg)" />
      </div>

      <Card style={{ padding: 16, marginBottom: 22, display: "flex", alignItems: "center", gap: 12, background: "var(--color-toast-info-bg)", border: "1px solid var(--color-primary-soft)" }}>
        <Icon name="shield-check" size={20} color="var(--color-primary)" />
        <span style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          O aviso prévio é <strong style={{ color: "var(--color-text)" }}>automático e obrigatório</strong> (CDC). Passado o prazo legal, o responsável fica <strong style={{ color: "var(--color-text)" }}>elegível</strong> — mas a negativação só acontece quando <strong style={{ color: "var(--color-text)" }}>você decide</strong>, um a um.</span>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <SectionHead title="Inadimplentes" sub="Decida a negativação dos elegíveis · ordenados por dias em atraso" />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
          <Segmented value={fil} onChange={(v) => { setFil(v); setPage(0); }} size="sm" options={[
            { value: "todos", label: "Todos" },
            { value: "elegivel", label: "Elegíveis" },
            { value: "emaviso", label: "Em aviso" },
            { value: "negativado", label: "Negativados" },
          ]} />
          <div style={{ width: 240 }}>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar responsável…" leadingIcon="search" />
          </div>
        </div>
      </div>
      {(() => {
        const nq = search.trim().toLowerCase();
        const filtered = INADIMPLENTES.filter((i) => (fil === "todos" || i.status === fil) && (!nq || i.resp.toLowerCase().includes(nq) || i.aluno.toLowerCase().includes(nq)));
        const npages = Math.ceil(filtered.length / NEG_PER_PAGE) || 1;
        const nsafe = Math.min(page, npages - 1);
        const npaged = filtered.slice(nsafe * NEG_PER_PAGE, (nsafe + 1) * NEG_PER_PAGE);
        return (
        <>
        <DataTable cols={[
          { label: "Responsável" }, { label: "Aluno" }, { label: "Valor", align: "right" }, { label: "Atraso", align: "right" }, { label: "Status SPC" }, { label: "", align: "right", w: 230 },
        ]}>
          {npaged.map((i) => {
            const elig = i.status === "elegivel";
            return (
              <TrHover key={i.id}>
                <Td><Person name={i.resp} sub={maskCpf(i.cpf)} /></Td>
                <Td><span style={{ color: "var(--color-text-muted)" }}>{i.aluno}</span></Td>
                <Td align="right"><span style={{ fontWeight: 700 }}>{brl(i.valorAtualizado)}</span><div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>era {brl(i.valor)}</div></Td>
                <Td align="right"><span style={{ fontWeight: 700, color: i.atraso > 30 ? "var(--badge-danger-fg)" : "var(--badge-warning-fg)" }}>{i.atraso} dias</span></Td>
                <Td><StatusBadge status={i.status} /></Td>
                <Td align="right">
                  <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button variant="tertiary" size="sm" iconLeft="eye" onClick={() => { setSel(i.id); go("d1"); }}>Ver</Button>
                    {elig && <Button variant="danger" size="sm" iconLeft="gavel" onClick={() => setModal(i.id)}>Negativar</Button>}
                  </div>
                </Td>
              </TrHover>
            );
          })}
          {!npaged.length && <tr><td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--color-text-subtle)", fontSize: 13.5 }}>Nenhum inadimplente neste filtro.</td></tr>}
        </DataTable>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
          <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>{filtered.length} inadimplente{filtered.length !== 1 ? "s" : ""}</span>
          {npages > 1 && (
            <Pagination page={nsafe} pages={npages} onChange={setPage} />
          )}
        </div>
        </>
        );
      })()}

      <Modal open={!!target} onClose={() => setModal(null)}>
        {target && <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--badge-danger-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="gavel" size={22} color="var(--badge-danger-fg)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Negativar {target.resp}?</h3>
          <p style={{ margin: "8px 0 16px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            O nome será registrado no SPC/Serasa pelo débito de <strong style={{ color: "var(--color-text)" }}>{brl(target.valorAtualizado)}</strong>. O aviso prévio foi enviado em {target.avisoEm} — prazo legal de <strong style={{ color: "var(--color-text)" }}>10 dias (CDC art. 43)</strong> já cumprido.</p>
          <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--badge-success-bg)", display: "flex", gap: 9, marginBottom: 20 }}>
            <Icon name="check-circle-2" size={17} color="var(--badge-success-fg)" />
            <span style={{ fontSize: 12.5, color: "var(--badge-success-fg)", lineHeight: 1.5 }}>Aviso prévio cumprido — negativação permitida por lei. Baixa automática se o responsável pagar.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" iconLeft="gavel" onClick={() => { showToast(`${target.resp} negativado no SPC/Serasa`, "warning"); setModal(null); }}>Confirmar negativação</Button>
          </div>
        </div>}
      </Modal>
      <Toast toast={toast} />
    </>
  );
};

const D1Detalhe = ({ go, sel, toast }) => {
  const i = INADIMPLENTES.find((x) => x.id === sel) || INADIMPLENTES[0];
  const [modal, setModal] = useState(null);
  const isNeg = i.status === "negativado";
  const isElig = i.status === "elegivel";
  const isAviso = i.status === "emaviso";

  // Linha do tempo: o que já ocorreu (done) + estado atual (current) + o que depende de decisão/pagamento (future)
  const steps = [
    { label: "Cobrança vencida", date: i.venc, icon: "calendar-x", state: "done", tone: "warn" },
    { label: "Aviso prévio enviado", date: i.avisoEm, icon: "bell-ring", state: "done", tone: "warn" },
  ];
  if (isAviso) {
    steps.push({ label: "Prazo legal em curso", date: `elegível a partir de ${i.prazoFim}`, icon: "clock", state: "current", tone: "warn" });
    steps.push({ label: "Decisão de negativar", date: "você decide, após o prazo", icon: "gavel", state: "future", tone: "danger" });
  }
  if (isElig) {
    steps.push({ label: "Elegível para negativação", date: `desde ${i.elegivelEm} · aguardando sua decisão`, icon: "gavel", state: "current", tone: "danger" });
  }
  if (isNeg) {
    steps.push({ label: "Negativado no SPC/Serasa", date: i.negativadoEm, icon: "file-x", state: "done", tone: "danger" });
  }
  steps.push({ label: "Regularizado", date: "baixa automática ao pagar", icon: "check-circle-2", state: "future", tone: "ok" });

  return (
    <Shell screen="d1" go={go} back={() => go("d0")} title="Detalhe da negativação" subtitle={`${i.resp} · ${maskCpf(i.cpf)}`} maxWidth={920}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Valor atualizado</div>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--badge-danger-fg)" }}>{brl(i.valorAtualizado)}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 8 }}>{brl(i.valor)} + multa 2% + juros · {i.atraso} dias</div>
              </div>
              <StatusBadge status={i.status} size="lg" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingTop: 18, borderTop: "1px solid var(--color-border-muted)" }}>
              {[["Responsável", i.resp], ["CPF", maskCpf(i.cpf)], ["Aluno", i.aluno], ["Venceu em", i.venc]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border-muted)", fontSize: 14 }}>
                  <span style={{ color: "var(--color-text-subtle)" }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
              ))}
            </div>
          </Card>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 14 }}>Ações</div>
            {isElig && (
              <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--badge-danger-bg)", marginBottom: 14, display: "flex", gap: 10 }}>
                <Icon name="gavel" size={18} color="var(--badge-danger-fg)" style={{ marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: "var(--badge-danger-fg)", lineHeight: 1.5 }}>
                  Aviso prévio cumprido. Você pode negativar agora — a decisão é sua.</span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {isElig && <Button variant="danger" iconLeft="gavel" block onClick={() => setModal("negativar")}>Negativar agora</Button>}
              {isAviso && <Button variant="secondary" iconLeft="lock" block disabled>Negativar (aguardando prazo)</Button>}
              {isNeg && <Button variant="secondary" iconLeft="file-check-2" block onClick={() => toast("Solicitação de baixa enviada ao SPC/Serasa", "success")}>Solicitar baixa</Button>}
              <Button iconLeft="send" block onClick={() => toast(`Cobrança reenviada para ${i.resp}`, "success")}>Reenviar cobrança</Button>
              {!isNeg && <Button variant="tertiary" iconLeft="shield-off" block onClick={() => setModal("optout")} style={{ color: "var(--color-danger-primary)" }}>Não negativar (opt-out)</Button>}
            </div>
          </Card>
        </div>

        <Card style={{ padding: 24 }}>
          <SectionHead title="Linha do tempo" sub="Cada etapa fica registrada como prova" />
          <div style={{ position: "relative", marginTop: 4 }}>
            {steps.map((s, idx) => {
              const done = s.state === "done";
              const current = s.state === "current";
              const future = s.state === "future";
              const fg = s.tone === "ok" ? "var(--badge-success-fg)" : s.tone === "warn" ? "var(--badge-warning-fg)" : s.tone === "danger" ? "var(--badge-danger-fg)" : "var(--color-primary)";
              const bg = s.tone === "ok" ? "var(--badge-success-bg)" : s.tone === "warn" ? "var(--badge-warning-bg)" : s.tone === "danger" ? "var(--badge-danger-bg)" : "var(--color-primary-soft)";
              return (
                <div key={idx} style={{ display: "flex", gap: 16, paddingBottom: idx < steps.length - 1 ? 26 : 0, position: "relative" }}>
                  {idx < steps.length - 1 && <div style={{ position: "absolute", left: 17, top: 36, bottom: 0, width: 2,
                    background: done ? "var(--color-primary-soft)" : "var(--color-border)", opacity: future ? 0.6 : 1 }} />}
                  <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: future ? 0.55 : 1,
                    background: done || current ? bg : "var(--color-surface)",
                    border: future ? "1.5px dashed var(--color-border-strong)" : current ? `2px solid ${fg}` : "none",
                    color: done || current ? fg : "var(--color-text-subtle)" }}>
                    <Icon name={s.icon} size={18} /></div>
                  <div style={{ paddingTop: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: done || current ? "var(--color-text)" : "var(--color-text-subtle)" }}>{s.label}</span>
                      {current && <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: fg, background: bg, padding: "2px 7px", borderRadius: 999 }}>Agora</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 2 }}>{s.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal open={modal === "negativar"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--badge-danger-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="gavel" size={22} color="var(--badge-danger-fg)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Negativar {i.resp}?</h3>
          <p style={{ margin: "8px 0 16px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            O nome será registrado no SPC/Serasa pelo débito de <strong style={{ color: "var(--color-text)" }}>{brl(i.valorAtualizado)}</strong>. Aviso prévio enviado em {i.avisoEm} — prazo legal de <strong style={{ color: "var(--color-text)" }}>10 dias (CDC art. 43)</strong> já cumprido.</p>
          <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--badge-success-bg)", display: "flex", gap: 9, marginBottom: 20 }}>
            <Icon name="check-circle-2" size={17} color="var(--badge-success-fg)" />
            <span style={{ fontSize: 12.5, color: "var(--badge-success-fg)", lineHeight: 1.5 }}>Permitido por lei. A baixa é automática se o responsável pagar.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" iconLeft="gavel" onClick={() => { setModal(null); toast(`${i.resp} negativado no SPC/Serasa`, "warning"); go("d0"); }}>Confirmar negativação</Button>
          </div>
        </div>
      </Modal>
      <Modal open={modal === "optout"} onClose={() => setModal(null)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="shield-off" size={22} color="var(--color-danger-primary)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Não negativar este responsável?</h3>
          <p style={{ margin: "8px 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            {i.resp} sai da régua de negativação permanentemente. A dívida segue ativa, mas sem registro no SPC/Serasa.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setModal(null)}>Voltar</Button>
            <Button variant="danger" onClick={() => { setModal(null); toast("Responsável removido da negativação", "warning"); go("d0"); }}>Confirmar opt-out</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};

/* ─── Configurações + Régua de avisos configurável ─────────────────────── */
const CANAIS = [
  { id: "whatsapp", label: "WhatsApp", icon: "message-circle" },
  { id: "email", label: "E-mail", icon: "mail" },
  { id: "sms", label: "SMS", icon: "smartphone" },
];

const ReguaStep = ({ step, onChange, onRemove, canRemove }) => {
  const toggleCanal = (c) => onChange({ ...step, canais: step.canais.includes(c) ? step.canais.filter((x) => x !== c) : [...step.canais, c] });
  const tone = step.quando === "antes" ? "info" : step.quando === "dia" ? "warning" : "danger";
  const toneBg = tone === "info" ? "var(--color-primary-soft)" : tone === "warning" ? "var(--badge-warning-bg)" : "var(--badge-danger-bg)";
  const toneFg = tone === "info" ? "var(--color-primary-hover)" : tone === "warning" ? "var(--badge-warning-fg)" : "var(--badge-danger-fg)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: toneBg, color: toneFg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={step.quando === "antes" ? "bell" : step.quando === "dia" ? "bell-ring" : "alert-triangle"} size={19} /></span>
      <div style={{ minWidth: 150, flexShrink: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{step.label}</div>
        <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>{step.quando === "antes" ? "antes do vencimento" : step.quando === "dia" ? "no dia" : "após o vencimento"}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
        {CANAIS.map((c) => {
          const on = step.canais.includes(c.id);
          return (
            <button key={c.id} onClick={() => toggleCanal(c.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 11px", borderRadius: 999, cursor: "pointer",
                fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600,
                background: on ? "var(--color-primary)" : "var(--color-bg)", color: on ? "#fff" : "var(--color-text-subtle)",
                border: `1.5px solid ${on ? "var(--color-primary)" : "var(--color-border-input)"}`, transition: "all 120ms" }}>
              <Icon name={c.icon} size={13} />{c.label}</button>
          );
        })}
      </div>
      {canRemove && <button onClick={onRemove} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="trash-2" size={16} /></button>}
    </div>
  );
};

// Quem paga a taxa: responsável (opcional) OU escola assume como cobrança extra
const FeeChoice = ({ label, hint, value, onChange }) => {
  const opts = [
    { v: "responsavel", t: "Responsável paga", d: "Somada à cobrança do pai", icon: "user" },
    { v: "escola", t: "Escola assume", d: "Descontada do seu repasse", icon: "building-2" },
  ];
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {opts.map((o) => {
          const on = value === o.v;
          return (
            <button key={o.v} onClick={() => onChange(o.v)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: "var(--radius-md)",
              border: `1.5px solid ${on ? "var(--color-primary)" : "var(--color-border-input)"}`, background: on ? "var(--color-primary-softer)" : "var(--color-bg)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1, border: `2px solid ${on ? "var(--color-primary)" : "var(--color-border-input)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {on && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-primary)" }} />}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Icon name={o.icon} size={14} color={on ? "var(--color-primary)" : "var(--color-text-subtle)"} />{o.t}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 2 }}>{o.d}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Planos EducationHub por volume de cobranças/mês. Taxa de cartão e de negativação à parte.
const PLANOS_IX = [
  { id: "basico", nome: "Básico", preco: "R$ 450", unidade: "/mês", limite: "até 200 cobranças/mês", desc: "Cobrança automática, PIX e boleto" },
  { id: "crescimento", nome: "Crescimento", preco: "R$ 599", unidade: "/mês", limite: "201 a 500 cobranças/mês", desc: "Tudo do Básico, com mais volume" },
  { id: "pro", nome: "Pro", preco: "R$ 799", unidade: "/mês", limite: "501 a 1.000 cobranças/mês", desc: "Tudo do Crescimento + relatórios avançados" },
  { id: "custom", nome: "Sob medida", preco: "Sob consulta", unidade: "", limite: "acima de 1.000 cobranças/mês", desc: "Alto volume, API e suporte dedicado" },
];

const SettingsDarkCard = () => {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.dataset.mode === "dark");
  useEffect(() => {
    document.documentElement.dataset.mode = dark ? "dark" : "light";
    try { localStorage.setItem("ex-mode", dark ? "dark" : "light"); } catch (e) {}
    if (window.lucide) window.lucide.createIcons();
  }, [dark]);
  return (
    <Card style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 42, height: 42, borderRadius: 10, background: "var(--color-surface)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={dark ? "sun" : "moon"} size={20} /></span>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Modo escuro</div>
          <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 2 }}>Alterna entre tema claro e escuro em toda a plataforma</div>
        </div>
      </div>
      <Toggle checked={dark} onChange={(v) => setDark(v)} />
    </Card>
  );
};

const FATURAS = [
  { id: "f-jun", mes: "Junho 2026", venc: "05/07", status: "aberto", itens: [
    { desc: "Plano Básico · mensalidade", val: 450 },
    { desc: "Taxa de negativação SPC/Serasa", detalhe: "3 inclusões × R$ 29,90", val: 89.70 },
  ] },
  { id: "f-mai", mes: "Maio 2026", pago: "05/06", status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 450 },
    { desc: "Taxa de negativação SPC/Serasa", detalhe: "1 inclusão × R$ 29,90", val: 29.90 },
  ] },
  { id: "f-abr", mes: "Abril 2026", pago: "05/05", status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 450 },
  ] },
  { id: "f-mar", mes: "Março 2026", pago: "05/04", status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 450 },
    { desc: "Taxa de negativação SPC/Serasa", detalhe: "2 inclusões × R$ 29,90", val: 59.80 },
  ] },
  { id: "f-fev", mes: "Fevereiro 2026", pago: "05/03", status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 450 },
  ] },
  { id: "f-jan", mes: "Janeiro 2026", pago: "05/02", status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 450 },
  ] },
  { id: "f-dez", mes: "Dezembro 2025", pago: "05/01", status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 450 },
  ] },
  { id: "f-nov", mes: "Novembro 2025", pago: "05/12", status: "paga", itens: [
    { desc: "Plano Básico · mensalidade", val: 450 },
  ] },
];

const FaturaDetalheModal = ({ fatura, onClose, toast }) => {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState("detalhe"); // detalhe | pix | card
  if (!fatura) return null;
  const total = fatura.itens.reduce((s, i) => s + i.val, 0);
  const aberto = fatura.status === "aberto";
  return (
    <Modal open={!!fatura} onClose={onClose} width={460}>
      <div style={{ padding: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Fatura EducationHub</div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{fatura.mes}</h3>
            <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 3 }}>{aberto ? `Vence em ${fatura.venc}` : `Paga em ${fatura.pago}`}</div>
          </div>
          {aberto ? <Badge variant="warning" dot>Em aberto</Badge> : <Badge variant="success" dot>Paga</Badge>}
        </div>

        {/* Detalhamento — sempre visível */}
        <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden", marginBottom: 18 }}>
          {fatura.itens.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 16px", borderBottom: "1px solid var(--color-border-muted)", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.desc}</div>
                {it.detalhe && <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 2 }}>{it.detalhe}</div>}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{brl(it.val)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 16px", background: "var(--color-primary-softer)" }}>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--color-primary)" }}>{brl(total)}</span>
          </div>
        </div>

        {!aberto && <Button block variant="secondary" iconLeft="download" onClick={() => toast("Baixando fatura (PDF)…", "info")}>Baixar PDF</Button>}

        {aberto && view === "detalhe" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button block iconLeft="qr-code" onClick={() => setView("pix")}>Pagar com PIX</Button>
            <Button block variant="secondary" iconLeft="credit-card" onClick={() => { onClose(); toast("Pagamento no cartão •••• 8842 confirmado", "success"); }}>Pagar com cartão •••• 8842</Button>
          </div>
        )}

        {aberto && view === "pix" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(total)}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 4, marginBottom: 18 }}>{fatura.mes} · fatura EducationHub</div>
            <QrCode size={172} />
            <div style={{ fontSize: 13, color: "var(--color-text-subtle)", margin: "14px 0 18px" }}>Abra o app do banco e escaneie</div>
            <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, height: 48, borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--color-primary)", background: copied ? "var(--color-primary-softer)" : "var(--color-bg)", color: "var(--color-primary)",
                fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              <Icon name={copied ? "check" : "copy"} size={18} />{copied ? "Código copiado!" : "Copiar código PIX"}</button>
            <Button block size="lg" iconLeft="check-circle" style={{ marginTop: 10 }} onClick={() => { onClose(); toast("Pagamento confirmado — fatura quitada", "success"); }}>Já paguei</Button>
            <button onClick={() => setView("detalhe")} style={{ marginTop: 10, background: "none", border: "none", color: "var(--color-text-subtle)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Voltar</button>
          </div>
        )}
      </div>
    </Modal>
  );
};

const Settings = ({ go, toast }) => {
  const [tab, setTab] = useState("dados");
  const [fechamento, setFechamento] = useState("25");
  const [vencimento, setVencimento] = useState("10");
  const [firstCharge, setFirstCharge] = useState("PROPORTIONAL");
  const [regrasModal, setRegrasModal] = useState(false);
  const [contratoObrig, setContratoObrig] = useState(false);
  const [taxaCartao, setTaxaCartao] = useState("responsavel");
  const [taxaNeg, setTaxaNeg] = useState("responsavel");
  const [inscricao, setInscricao] = useState("1.234.567-8");
  const [issRate, setIssRate] = useState("5");
  const [simplesNacional, setSimplesNacional] = useState(true);
  const [retencoes, setRetencoes] = useState({ pis: false, cofins: false, csll: false, inss: false, ir: false });
  const issErr = (parseFloat(issRate.replace(",", ".")) || 0) > 10 ? "Alíquota máxima é 10%." : null;
  const [planoAtual] = useState("basico");
  const [planoSel, setPlanoSel] = useState("basico");
  const [planoModal, setPlanoModal] = useState(false);
  const [billingModal, setBillingModal] = useState(false);
  const [faturaSel, setFaturaSel] = useState(null);
  const [faturaFilter, setFaturaFilter] = useState("todas");
  const [faturaPage, setFaturaPage] = useState(0);
  const FAT_PER_PAGE = 5;
  const showToast = (msg, type) => { if (toast) toast(msg, type); };

  const firstChargeLabel = firstCharge === "PROPORTIONAL" ? "Proporcional aos dias restantes" : "1º mês isento";
  const dados = [
    { t: "Dados da escola", icon: "building-2", rows: [["Razão social", "Kumon Camargos"], ["CNPJ", "12.345.678/0001-90"], ["Endereço", "Av. Tito Fulgêncio, 420 — BH/MG"], ["Contato", "contato@kumoncamargos.com.br"]] },
    { t: "Conta para repasse", icon: "landmark", rows: [["Banco", "Banco Inter"], ["Agência", "0001"], ["Conta", "****-5521"], ["Titular", "Kumon Camargos LTDA"]] },
    { t: "Regras de cobrança", icon: "receipt", rows: [["Dia de vencimento", `Todo dia ${vencimento}`], ["Dia de fechamento", `Dia ${fechamento}`], ["Primeiro boleto", firstChargeLabel], ["Multa por atraso", "2%"], ["Juros ao mês", "1% a.m."]] },
  ];
  const plano = PLANOS_IX.find((p) => p.id === planoAtual);

  return (
    <Shell screen="settings" go={go} title="Configurações" subtitle="Dados, taxas e plano da unidade Kumon Camargos" maxWidth={860}>
      <div style={{ marginBottom: 22 }}>
        <Segmented key={tab} value={tab} onChange={setTab} options={[
          { value: "dados", label: "Dados da escola" },
          { value: "regua", label: "Régua de cobrança" },
          { value: "fiscal", label: "Fiscal" },
          { value: "taxas", label: "Taxas" },
          { value: "plano", label: "Meu plano" },
        ]} />
      </div>

      {tab === "regua" && <ReguaConfigTab toast={showToast} />}

      {tab === "fiscal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", background: "var(--color-toast-info-bg)", border: "1px solid var(--color-primary-soft)" }}>
            <Icon name="info" size={18} color="var(--color-primary)" />
            <span style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              A NFS-e é emitida automaticamente a cada pagamento confirmado. Essa config vale pra unidade inteira — o código de serviço de cada matéria fica em <strong style={{ color: "var(--color-text)" }}>Matérias & Preços</strong>.</span>
          </Card>
          <Card style={{ padding: 24 }}>
            <SectionHead title="Dados fiscais" sub="Usados para emitir a NFS-e a cada pagamento recebido" />
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <Field label="Inscrição municipal" required><Input value={inscricao} onChange={(e) => setInscricao(e.target.value)} /></Field>
                <Field label="Alíquota ISS" required error={issErr} hint={issErr ? undefined : "Entre 0% e 10%"}>
                  <Input value={issRate} onChange={(e) => setIssRate(e.target.value.replace(/[^\d,]/g, ""))} error={!!issErr} inputMode="decimal" trailing={<span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)" }}>%</span>} />
                </Field>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Enquadrada no Simples Nacional?</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 2 }}>Se não, mostramos as retenções opcionais abaixo</div>
                </div>
                <Toggle checked={simplesNacional} onChange={setSimplesNacional} />
              </div>
              {!simplesNacional && (
                <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 12 }}>
                    <Icon name="info" size={15} color="var(--color-text-subtle)" style={{ marginTop: 1 }} />
                    <span style={{ fontSize: 12.5, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>Retenções são deduções sobre o serviço conforme a legislação.</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                    {[["pis", "PIS"], ["cofins", "COFINS"], ["csll", "CSLL"], ["inss", "INSS"], ["ir", "IR"]].map(([k, label]) => (
                      <Checkbox key={k} checked={retencoes[k]} onChange={(v) => setRetencoes({ ...retencoes, [k]: v })}>{label}</Checkbox>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <Button iconLeft="check" disabled={!!issErr} onClick={() => showToast("Dados fiscais salvos", "success")}>Salvar</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === "dados" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {dados.map((g) => (
            <Card key={g.t} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-surface)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: 700 }}><Icon name={g.icon} size={17} color="var(--color-primary)" />{g.t}</span>
                <Button variant="tertiary" size="sm" iconLeft="pencil" onClick={() => g.t === "Regras de cobrança" ? setRegrasModal(true) : showToast("Edição de dados — em breve", "info")}>Editar</Button>
              </div>
              <div style={{ padding: "6px 20px" }}>
                {g.rows.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--color-border-muted)", fontSize: 14, gap: 16 }}>
                    <span style={{ color: "var(--color-text-subtle)" }}>{k}</span>
                    <span style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7 }}>
                      {g.t === "Contrato" && <Icon name="file-text" size={14} color="var(--color-danger-primary)" />}{v}</span></div>
                ))}
              </div>
            </Card>
          ))}

          <Card style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 42, height: 42, borderRadius: 10, background: "var(--color-surface)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="file-signature" size={20} /></span>
              <div><div style={{ fontSize: 14.5, fontWeight: 600 }}>Exigir contrato assinado na matrícula</div>
                <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 2 }}>Quando ativo, anexar o contrato assinado (PDF/foto) vira obrigatório no cadastro do aluno</div></div>
            </div>
            <Toggle checked={contratoObrig} onChange={(v) => { setContratoObrig(v); showToast(v ? "Contrato assinado agora é obrigatório" : "Contrato assinado opcional", "info"); }} />
          </Card>

          <SettingsDarkCard />
        </div>
      )}

      {tab === "taxas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", background: "var(--color-toast-info-bg)", border: "1px solid var(--color-primary-soft)" }}>
            <Icon name="info" size={18} color="var(--color-primary)" />
            <span style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              Sua mensalidade EducationHub cobre só a geração de cobrança. As taxas de <strong style={{ color: "var(--color-text)" }}>cartão</strong> e de <strong style={{ color: "var(--color-text)" }}>negativação</strong> são opcionais — defina quem paga.</span>
          </Card>
          <Card style={{ padding: 24 }}>
            <SectionHead title="Quem paga as taxas" sub="Vale para todas as novas cobranças da unidade" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FeeChoice label="Taxa de cartão de crédito" hint="Cobrada quando o responsável paga no cartão" value={taxaCartao} onChange={setTaxaCartao} />
              <FeeChoice label="Taxa de negativação (SPC/Serasa)" hint="Cobrada ao incluir um inadimplente" value={taxaNeg} onChange={setTaxaNeg} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <Button iconLeft="check" onClick={() => showToast("Regras de taxa salvas", "success")}>Salvar</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === "plano" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 24, background: "var(--color-primary)", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.85 }}>Seu plano EducationHub</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6 }}>{plano.nome}</div>
                <div style={{ fontSize: 14, opacity: 0.92, marginTop: 4 }}>{plano.preco}{plano.unidade} · {plano.limite}</div>
                <div style={{ fontSize: 12.5, opacity: 0.82, marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name="info" size={13} />Taxa de cartão e de negativação cobradas à parte</div>
              </div>
              <Button iconLeft="arrow-up-circle" onClick={() => setPlanoModal(true)} style={{ background: "#fff", color: "var(--color-primary)" }}>Mudar de plano</Button>
            </div>
            <div style={{ display: "flex", gap: 28, marginTop: 22, flexWrap: "wrap" }}>
              {[["Cobranças no mês", "88 / 200"], ["Mensalidade", "R$ 450,00"], ["Próxima fatura", "R$ 450,00 · 05/07"]].map(([k, v]) => (
                <div key={k}><div style={{ fontSize: 12, opacity: 0.8 }}>{k}</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{v}</div></div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-surface)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: 700 }}><Icon name="credit-card" size={17} color="var(--color-primary)" />Forma de pagamento</span>
              <Button variant="tertiary" size="sm" iconLeft="pencil" onClick={() => setBillingModal(true)}>Alterar</Button>
            </div>
            <div style={{ padding: 18, display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ width: 42, height: 42, borderRadius: 10, background: "var(--color-primary-soft)", color: "var(--color-primary-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="credit-card" size={20} /></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Cartão •••• 8842</div>
                <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>Vence 09/28 · cobrança mensal automática</div></div>
              <Badge variant="success" size="sm" dot>Ativo</Badge>
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--color-surface)", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: 700 }}><Icon name="file-text" size={17} color="var(--color-primary)" />Faturas</span>
              <Segmented value={faturaFilter} onChange={(v) => { setFaturaFilter(v); setFaturaPage(0); }} size="sm" options={[
                { value: "todas", label: "Todas" },
                { value: "aberto", label: "Em aberto" },
                { value: "paga", label: "Pagas" },
              ]} />
            </div>
            {(() => {
              const filtradas = FATURAS.filter((f) => faturaFilter === "todas" ? true : f.status === faturaFilter);
              const fpages = Math.ceil(filtradas.length / FAT_PER_PAGE) || 1;
              const fsafe = Math.min(faturaPage, fpages - 1);
              const fpaged = filtradas.slice(fsafe * FAT_PER_PAGE, (fsafe + 1) * FAT_PER_PAGE);
              return (
              <>
              <div style={{ padding: "6px 20px" }}>
                {fpaged.map((fat) => {
                  const aberto = fat.status === "aberto";
                  const total = fat.itens.reduce((s, it) => s + it.val, 0);
                  const temExtra = fat.itens.length > 1;
                  return (
                  <div key={fat.id} onClick={() => setFaturaSel(fat)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid var(--color-border-muted)", gap: 12, cursor: "pointer" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{fat.mes}</div>
                      <div style={{ fontSize: 12.5, color: aberto ? "var(--badge-warning-fg)" : "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 7 }}>
                        {aberto ? `Em aberto · vence ${fat.venc}` : `Paga em ${fat.pago}`}
                        {temExtra && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="plus-circle" size={12} />taxas extras</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{brl(total)}</span>
                      <Button variant="tertiary" size="sm" iconRight="chevron-right" onClick={(e) => { e.stopPropagation(); setFaturaSel(fat); }}>Ver fatura</Button>
                    </div>
                  </div>
                );})}
                {!fpaged.length && <div style={{ padding: "18px 0", fontSize: 13.5, color: "var(--color-text-subtle)", textAlign: "center" }}>Nenhuma fatura neste filtro.</div>}
              </div>
              {fpages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 20px", borderTop: "1px solid var(--color-border-muted)" }}>
                  <span style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>{filtradas.length} fatura{filtradas.length !== 1 ? "s" : ""}</span>
                  <Pagination page={fsafe} pages={fpages} onChange={setFaturaPage} />
                </div>
              )}
              </>
              );
            })()}
          </Card>
        </div>
      )}

      {/* Modal mudar de plano */}
      <Modal open={planoModal} onClose={() => setPlanoModal(false)} width={560}>
        <div style={{ padding: 26 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Mudar de plano</h3>
          <p style={{ margin: "6px 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>O plano acompanha seu volume de cobranças por mês. Taxa de cartão e de negativação cobradas à parte.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PLANOS_IX.map((p) => {
              const active = planoSel === p.id;
              const atual = p.id === planoAtual;
              return (
                <button key={p.id} onClick={() => setPlanoSel(p.id)} style={{ textAlign: "left", padding: "15px 16px", borderRadius: "var(--radius-md)",
                  border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-input)"}`, background: active ? "var(--color-primary-softer)" : "var(--color-bg)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 140ms", fontFamily: "var(--font-sans)" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-input)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {active && <span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--color-primary)" }} />}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 700 }}>{p.nome}</span>
                      {atual && <Badge variant="primary" size="sm">Plano atual</Badge>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 2 }}>{p.limite}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{p.preco}</div>
                    {p.unidade && <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)" }}>{p.unidade}</div>}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <Button variant="tertiary" onClick={() => setPlanoModal(false)}>Cancelar</Button>
            <Button iconRight={planoSel === "custom" ? "message-circle" : "check"} disabled={planoSel === planoAtual}
              onClick={() => { setPlanoModal(false); showToast(planoSel === "custom" ? "Pedido de proposta enviado — falaremos com você" : `Plano alterado para ${PLANOS_IX.find((p) => p.id === planoSel).nome}`, "success"); }}>
              {planoSel === "custom" ? "Falar com vendas" : planoSel === planoAtual ? "Plano atual" : "Confirmar plano"}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal alterar billing — dados completos exigidos pelo Asaas (tokenização de cartão) */}
      <Modal open={billingModal} onClose={() => setBillingModal(false)} width={560}>
        <div style={{ padding: 26, maxHeight: "82vh", overflowY: "auto" }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Alterar forma de pagamento</h3>
          <p style={{ margin: "6px 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Atualize o cartão usado na sua mensalidade EducationHub. Os dados do titular são exigidos pela operadora para aprovar a cobrança recorrente.</p>

          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-subtle)", marginBottom: 12 }}>Dados do cartão</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            <Field label="Número do cartão" required><Input defaultValue="4242 4242 4242 8842" inputMode="numeric" leadingIcon="credit-card" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
              <Field label="Validade" required><Input defaultValue="09/28" inputMode="numeric" placeholder="MM/AA" /></Field>
              <Field label="CVV" required><Input defaultValue="123" inputMode="numeric" placeholder="000" /></Field>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-subtle)", marginBottom: 12 }}>Dados do titular</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nome do titular" required hint="Como impresso no cartão"><Input defaultValue="Kumon Camargos LTDA" leadingIcon="user" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <Field label="CPF / CNPJ do titular" required><Input defaultValue="12.345.678/0001-90" inputMode="numeric" /></Field>
              <Field label="Telefone" required><Input defaultValue="(31) 3456-7890" inputMode="tel" leadingIcon="phone" /></Field>
            </div>
            <Field label="E-mail" required hint="Recebe o comprovante de cada cobrança"><Input defaultValue="contato@kumoncamargos.com.br" type="email" leadingIcon="mail" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <Field label="CEP" required><Input defaultValue="30575-160" inputMode="numeric" leadingIcon="map-pin" /></Field>
              <Field label="Número" required><Input defaultValue="420" inputMode="numeric" /></Field>
              <Field label="Complemento"><Input defaultValue="" placeholder="Opcional" /></Field>
            </div>
          </div>

          <div style={{ display: "flex", gap: 9, marginTop: 18, fontSize: 12, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>
            <Icon name="lock" size={14} color="var(--color-text-subtle)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Dados protegidos e tokenizados pela operadora de pagamento. A Education X não armazena o número do seu cartão.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <Button variant="tertiary" onClick={() => setBillingModal(false)}>Cancelar</Button>
            <Button iconLeft="check" onClick={() => { setBillingModal(false); showToast("Forma de pagamento atualizada", "success"); }}>Salvar</Button>
          </div>
        </div>
      </Modal>
      <FaturaDetalheModal key={faturaSel ? faturaSel.id : "none"} fatura={faturaSel} onClose={() => setFaturaSel(null)} toast={showToast} />

      {/* Modal: Regras de cobrança (inclui regra do 1º boleto) */}
      <Modal open={regrasModal} onClose={() => setRegrasModal(false)} width={560}>
        <div style={{ padding: 26, maxHeight: "86vh", overflowY: "auto" }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Regras de cobrança</h3>
          <p style={{ margin: "6px 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Valem para todas as novas cobranças da unidade.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="Dia de vencimento" hint="1 a 28"><Input value={vencimento} onChange={(e) => setVencimento(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" leadingIcon="calendar" /></Field>
            <Field label="Dia de fechamento" hint="Antes do vencimento"><Input value={fechamento} onChange={(e) => setFechamento(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" leadingIcon="calendar-check" /></Field>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 10 }}>Primeiro boleto da matrícula</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["PROPORTIONAL", "Proporcional aos dias restantes", "A família paga apenas os dias restantes do mês em que a matrícula é aprovada. A partir do mês seguinte, mensalidade cheia."],
              ["FREE_FIRST_MONTH", "Isentar o 1º mês", "Não emite cobrança na competência de entrada. A primeira mensalidade cheia sai no mês seguinte."],
            ].map(([val, titulo, desc]) => {
              const active = firstCharge === val;
              return (
                <button key={val} onClick={() => setFirstCharge(val)} style={{ textAlign: "left", padding: "15px 16px", borderRadius: "var(--radius-md)",
                  border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-input)"}`, background: active ? "var(--color-primary-softer)" : "var(--color-bg)",
                  cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12, transition: "all 140ms", fontFamily: "var(--font-sans)" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-input)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    {active && <span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--color-primary)" }} />}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{titulo}</div>
                    <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 16, fontSize: 12.5, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>
            <Icon name="info" size={14} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>A regra do 1º boleto só pode ser alterada até 5 dias antes do fechamento do mês em curso.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <Button variant="tertiary" onClick={() => setRegrasModal(false)}>Cancelar</Button>
            <Button iconLeft="check" onClick={() => { setRegrasModal(false); showToast("Regras de cobrança salvas", "success"); }}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};

window.NegativacaoBody = NegativacaoBody;
window.D1Detalhe = D1Detalhe;
window.Settings = Settings;

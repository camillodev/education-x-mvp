/* Flow E — Portal do responsável (Maria) · mobile · conciliado com DH-f4 (F4)
 * Magic link (gate + erro genérico RN-01a) · badges RN-12a (PAID verde / PENDING azul /
 * OVERDUE vermelho / NEGATIVATED preto) · banner negativação (RN-12) · pagar PIX sem
 * confirmação otimista (D-04) · quitar vencido só PIX (D-11) · cartão PCI (form nasce
 * vazio) · histórico 12 meses + estados de NF (RN-13) · notificações derivadas (D-13). */

/* BillingConfig da unidade (mock) */
const PT_CONFIG = { lateFeePercent: 2, monthlyInterestPct: 1, acceptsCard: true, cardFeePayer: "RESPONSAVEL", cardFeePct: "2,99" };

/* Invoices — desc = Subject + referenceMonth (D-05); status conforme spec */
const PORTAL_COBRANCAS = [
  { id: "p0", desc: "Matemática — Maio/2026",  valor: 450, venc: "07/05/2026", status: "NEGATIVATED", atraso: 65, asaas: true },
  { id: "p1", desc: "Matemática — Junho/2026", valor: 450, venc: "28/06/2026", status: "OVERDUE",     atraso: 13, asaas: true },
  { id: "p2", desc: "Matemática — Julho/2026", valor: 450, venc: "07/07/2026", status: "PENDING",     asaas: true },
  { id: "p3", desc: "Material didático — Julho/2026", valor: 120, venc: "15/07/2026", status: "PENDING", asaas: false }, // RN-05: sem asaasPaymentId
  { id: "p4", desc: "Matemática — Abril/2026",   valor: 450, status: "PAID", pagoEm: "05/04/2026", nf: "00008690" },
  { id: "p5", desc: "Matemática — Março/2026",   valor: 450, status: "PAID", pagoEm: "06/03/2026", nfPending: true },
  { id: "p6", desc: "Matemática — Fevereiro/2026", valor: 450, status: "PAID", pagoEm: "05/02/2026", nf: "00008520" },
  { id: "p7", desc: "Material didático — Janeiro/2026", valor: 120, status: "PAID", pagoEm: "10/01/2026", nf: "00008444" },
];

/* multa + juros pro rata (RN-03) */
const ptTotais = (c) => {
  const multa = Math.round(c.valor * PT_CONFIG.lateFeePercent) / 100;
  const juros = Math.round(c.valor * PT_CONFIG.monthlyInterestPct * (c.atraso || 0) / 30) / 100;
  return { multa, juros, total: c.valor + multa + juros };
};

/* RN-12a — cores obrigatórias de badge (NEGATIVATED = preto, sem variante no DS) */
const PT_BADGE = { PAID: ["success", "Paga"], PENDING: ["info", "A vencer"], OVERDUE: ["danger", "Vencida"] };
const PortalBadge = ({ status }) =>
  status === "NEGATIVATED"
    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "var(--color-text)", color: "var(--color-bg)", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.01em" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }}></span>Negativada</span>
    : <Badge variant={PT_BADGE[status][0]} dot>{PT_BADGE[status][1]}</Badge>;

const PtBrand = ({ initials = "MS", onBell, count = 0 }) => (
  <div style={{ padding: "50px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-primary)", color: "#fff" }}>
    <Logo size={17} light />
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {onBell && (
        <button onClick={onBell} aria-label="Notificações" style={{ position: "relative", width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="bell" size={17} />
          {count > 0 && <span style={{ position: "absolute", top: -2, right: -2, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999, background: "var(--badge-danger-fg)", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--color-primary)" }}>{count}</span>}
        </button>
      )}
      <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{initials}</span>
    </div>
  </div>
);

const PtBack = ({ onBack, title }) => (
  <div style={{ padding: "50px 18px 12px", display: "flex", alignItems: "center", gap: 12, background: "var(--color-bg)", borderBottom: "1px solid var(--color-border-muted)" }}>
    <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--color-border)", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-muted)" }}><Icon name="arrow-left" size={17} /></button>
    <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
  </div>
);

const PtSpinner = ({ size = 34 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", border: "3px solid var(--color-border)", borderTopColor: "var(--color-primary)", display: "inline-block", animation: "pt-spin 800ms linear infinite" }}></span>
);

const FlowE = ({ exit, start = "home" }) => {
  const [view, setView] = useState("gate"); // gate | linkExpired | home | notif | historico | pay | confirming | success | detail | overdue | card | cardOk
  const [sel, setSel] = useState(start === "overdue" ? "p1" : null);
  const [copied, setCopied] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [cartao, setCartao] = useState(null); // {last4} — CardToken.isActive
  const [cardForm, setCardForm] = useState({ num: "", nome: "", val: "", cvv: "" });
  const [aceito, setAceito] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pago, setPago] = useState({}); // id -> true (webhook confirmado nesta sessão)

  /* gate do magic link — valida token e vai direto pra tela (sem tela de sucesso) */
  useEffect(() => {
    if (view === "gate") { const t = setTimeout(() => setView(start === "overdue" ? "overdue" : start), 700); return () => clearTimeout(t); }
  }, [view]);
  /* QR buscado sempre que a tela pay abre (RN-04) — nunca cacheado no cliente */
  useEffect(() => {
    if (view === "pay") { setQrLoading(true); const t = setTimeout(() => setQrLoading(false), 700); return () => clearTimeout(t); }
  }, [view]);
  /* D-04: "Já paguei" nunca confirma na hora — webhook simulado confirma depois */
  useEffect(() => {
    if (view === "confirming") { const t = setTimeout(() => { if (sel) setPago((p) => ({ ...p, [sel]: true })); setView("success"); }, 3200); return () => clearTimeout(t); }
  }, [view]);

  const st = (c) => (pago[c.id] ? "PAID" : c.status);
  const negativada = PORTAL_COBRANCAS.find((c) => st(c) === "NEGATIVATED");
  const proxima = PORTAL_COBRANCAS.find((c) => st(c) === "PENDING" && c.asaas);
  const cob = PORTAL_COBRANCAS.find((c) => c.id === sel);
  const pagas12m = PORTAL_COBRANCAS.filter((c) => st(c) === "PAID");

  /* notificações derivadas em runtime (D-13) — não persistidas */
  const notifs = [];
  if (negativada) notifs.push({ id: "neg", kind: "danger", icon: "alert-triangle", title: "Negativação ativa", time: "Hoje",
    body: `A cobrança ${negativada.desc} está vencida há ${negativada.atraso} dias e foi registrada no SPC/Serasa. Ao quitar, a baixa é automática.`,
    cta: "Quitar e regularizar", onCta: () => { setSel(negativada.id); setView("overdue"); } });
  if (proxima && !pago[proxima.id]) notifs.push({ id: "venc", kind: "warning", icon: "clock", title: "Cobrança vencendo em breve", time: "Há 1 dia",
    body: `${proxima.desc} de ${brl(proxima.valor)} vence em ${proxima.venc}.`,
    cta: "Pagar agora", onCta: () => { setSel(proxima.id); setView("pay"); } });
  notifs.push({ id: "msg1", kind: "info", icon: "message-circle", title: "Kumon Camargos", time: "2 dias atrás",
    body: "Olá! Lembrando que as aulas de reposição de Julho estão confirmadas para os sábados. Qualquer dúvida, pode chamar." });

  /* validação do form de cartão (nasce vazio — PCI: nada é reidratado) */
  const numDigits = cardForm.num.replace(/\D/g, "");
  const cardOkForm = numDigits.length === 16 && /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardForm.val) && /^\d{3,4}$/.test(cardForm.cvv) && cardForm.nome.trim().length > 2;

  let content;

  if (view === "gate") {
    /* Tela 1 — validando magic link (1 query, rápido) */
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: "var(--color-bg)" }}>
        <PtSpinner />
        <span style={{ fontSize: 13.5, color: "var(--color-text-subtle)" }}>Verificando seu acesso…</span>
      </div>
    );
  } else if (view === "linkExpired") {
    /* Tela 1 — erro genérico (RN-01a): mesma tela para os 4 motivos, sem CTA */
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <div style={{ padding: "54px 18px 0" }}><Logo size={17} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, margin: "0 auto 22px", borderRadius: "50%", background: "var(--color-surface)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="link-2-off" size={30} color="var(--color-text-subtle)" /></div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em" }}>Link inválido ou expirado</h1>
          <p style={{ margin: "12px 0 0", fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            Link inválido ou expirado — contate a escola.</p>
        </div>
        <div style={{ padding: "0 18px 54px", textAlign: "center", fontSize: 12.5, color: "var(--color-text-subtle)" }}>
          Kumon Camargos · (31) 99876-5432</div>
      </div>
    );
  } else if (view === "home") {
    content = (
      <div style={{ minHeight: "100%", background: "var(--color-surface)" }}>
        <PtBrand onBell={() => setView("notif")} count={notifs.length} />
        <div style={{ background: "var(--color-primary)", color: "#fff", padding: "4px 20px 26px" }}>
          <div style={{ fontSize: 13.5, opacity: 0.85 }}>Olá, Maria</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>João Silva · Kumon Camargos</div>
        </div>
        <div style={{ padding: "0 16px", marginTop: -16 }}>
          {/* banner de negativação (RN-12) — além do card normal na lista */}
          {negativada && (
            <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden", border: "1.5px solid var(--badge-danger-fg)" }}>
              <div style={{ background: "var(--badge-danger-bg)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 9 }}>
                <Icon name="alert-triangle" size={18} color="var(--badge-danger-fg)" />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--badge-danger-fg)" }}>Negativação ativa</span>
              </div>
              <div style={{ padding: 16 }}>
                <p style={{ margin: 0, fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  A cobrança <strong style={{ color: "var(--color-text)" }}>{negativada.desc}</strong>, vencida há {negativada.atraso} dias, está registrada no SPC/Serasa. Ao quitar, a baixa é <strong style={{ color: "var(--color-text)" }}>automática</strong>.</p>
                <Button block iconLeft="shield-check" onClick={() => { setSel(negativada.id); setView("overdue"); }} style={{ marginTop: 14 }}>Quitar e regularizar</Button>
              </div>
            </Card>
          )}

          {/* próxima cobrança PENDING */}
          {proxima && !pago[proxima.id] && (
            <Card style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Próxima cobrança</div>
                  <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>{brl(proxima.valor)}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 6 }}>{proxima.desc} · vence em {proxima.venc.slice(0, 5)}</div>
                </div>
                <PortalBadge status="PENDING" />
              </div>
              <Button block size="lg" iconLeft="qr-code" onClick={() => { setSel(proxima.id); setView("pay"); }}>Pagar agora</Button>
            </Card>
          )}

          {/* cartão — oculto se a unidade não aceita (RN-08) */}
          {PT_CONFIG.acceptsCard && (
            <Card style={{ padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: cartao ? "var(--badge-success-bg)" : "var(--color-primary-soft)", color: cartao ? "var(--badge-success-fg)" : "var(--color-primary)" }}>
                <Icon name="credit-card" size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {cartao ? <>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>•••• {cartao.last4} · Pagamento automático ativo</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>Todo mês, sem você fazer nada</div>
                </> : <>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Pagamento automático</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>Cadastre um cartão e nunca mais esqueça</div>
                </>}
              </div>
              {cartao
                ? <Button variant="tertiary" size="sm" onClick={() => { setCartao(null); }}>Remover</Button>
                : <Button variant="secondary" size="sm" iconLeft="plus" onClick={() => { setAceito(false); setCardForm({ num: "", nome: "", val: "", cvv: "" }); setView("card"); }}>Cadastrar</Button>}
            </Card>
          )}

          {/* lista de cobranças — badges RN-12a em todas */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 4px 10px" }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-subtle)" }}>Cobranças</span>
            <button onClick={() => setView("historico")} style={{ border: "none", background: "none", color: "var(--color-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>Ver histórico</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
            {PORTAL_COBRANCAS.filter((c) => c.status !== "PAID" || c.id === "p4").map((c) => {
              const s = st(c);
              return (
                <Card key={c.id} interactive onClick={() => { setSel(c.id); setView(["OVERDUE", "NEGATIVATED"].includes(s) ? "overdue" : s === "PENDING" && c.asaas ? "pay" : "detail"); }}
                  style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{c.desc}</div>
                    <div style={{ fontSize: 12.5, color: s === "OVERDUE" || s === "NEGATIVATED" ? "var(--badge-danger-fg)" : "var(--color-text-subtle)", marginTop: 2 }}>
                      {s === "PAID" ? `Pago em ${c.pagoEm}` : s === "PENDING" ? (c.asaas ? `Vence em ${c.venc.slice(0, 5)}` : "Cobrança ainda sendo processada — tente em alguns minutos") : `Vencida há ${c.atraso} dias`}</div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{brl(["OVERDUE", "NEGATIVATED"].includes(s) ? ptTotais(c).total : c.valor)}</div>
                    <PortalBadge status={s} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  } else if (view === "notif") {
    content = (
      <div style={{ minHeight: "100%", background: "var(--color-surface)" }}>
        <PtBack onBack={() => setView("home")} title="Notificações" />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 40 }}>
          {notifs.map((n) => {
            const c = { danger: ["var(--badge-danger-bg)", "var(--badge-danger-fg)"], warning: ["var(--badge-warning-bg)", "var(--badge-warning-fg)"], info: ["var(--color-primary-soft)", "var(--color-primary)"] }[n.kind];
            return (
              <Card key={n.id} style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: c[0], color: c[1], display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={n.icon} size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{n.title}</span>
                      <span style={{ fontSize: 11.5, color: "var(--color-text-subtle)", whiteSpace: "nowrap" }}>{n.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{n.body}</p>
                    {n.cta && <Button size="sm" iconLeft={n.kind === "danger" ? "shield-check" : "qr-code"} onClick={n.onCta} style={{ marginTop: 12 }}>{n.cta}</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  } else if (view === "historico") {
    /* Tela 6 — só PAID nos últimos 12 meses (RN-12b), NF condicional (RN-13) */
    content = (
      <div style={{ minHeight: "100%", background: "var(--color-surface)" }}>
        <PtBack onBack={() => setView("home")} title="Histórico de pagamentos" />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
          <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", margin: "2px 4px 6px" }}>Últimos 12 meses</div>
          {pagas12m.length ? pagas12m.map((c) => (
            <Card key={c.id} style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{c.desc}</div>
                <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 2 }}>Pago em {c.pagoEm || "hoje"}</div>
                <div style={{ marginTop: 7 }}><PortalBadge status="PAID" /></div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{brl(c.valor)}</div>
                {c.nf
                  ? <Button variant="secondary" size="sm" iconLeft="download">PDF</Button>
                  : c.nfPending
                    ? <span style={{ fontSize: 11.5, color: "var(--color-text-subtle)" }}>Nota fiscal em processamento</span>
                    : null}
              </div>
            </Card>
          )) : (
            <Card style={{ padding: 28, textAlign: "center", fontSize: 13.5, color: "var(--color-text-subtle)" }}>Nenhum pagamento nos últimos 12 meses.</Card>
          )}
        </div>
      </div>
    );
  } else if (view === "overdue") {
    /* Tela 4 — quitar vencido: breakdown obrigatório, só PIX (D-11) */
    const c = cob || PORTAL_COBRANCAS.find((x) => ["OVERDUE", "NEGATIVATED"].includes(st(x)));
    const t = ptTotais(c);
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <PtBack onBack={() => setView("home")} title="Quitar cobrança vencida" />
        <div style={{ flex: 1, padding: 18 }}>
          <Card style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="label" style={{ marginBottom: 8 }}>Valor atualizado</div>
              <PortalBadge status={st(c)} />
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--badge-danger-fg)", lineHeight: 1 }}>{brl(t.total)}</div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 7 }}>{c.desc} · vencida há {c.atraso} dias</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 16 }}>
              {[["Valor original", brl(c.valor)], [`Multa (${PT_CONFIG.lateFeePercent}%)`, brl(t.multa)], [`Juros (${PT_CONFIG.monthlyInterestPct}% a.m.)`, brl(t.juros)]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ color: "var(--color-text-subtle)" }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, paddingTop: 9, borderTop: "1px solid var(--color-border-muted)", marginTop: 3 }}>
                <span style={{ fontWeight: 700 }}>Total a pagar</span><span style={{ fontWeight: 800, color: "var(--badge-danger-fg)" }}>{brl(t.total)}</span></div>
            </div>
          </Card>
          <Card style={{ padding: 16, display: "flex", gap: 11, alignItems: "center", background: "var(--color-toast-info-bg)", border: "1px solid var(--color-primary-soft)" }}>
            <Icon name="shield-check" size={18} color="var(--color-primary)" />
            <span style={{ fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>Ao quitar, sua situação é regularizada na hora e a negativação é cancelada automaticamente.</span>
          </Card>
        </div>
        <div style={{ padding: "12px 18px 44px", borderTop: "1px solid var(--color-border-muted)", display: "flex", flexDirection: "column", gap: 10 }}>
          <Button block size="lg" iconLeft="qr-code" onClick={() => { setSel(c.id); setView("pay"); }}>Pagar com PIX</Button>
          <Button block size="lg" variant="secondary" iconLeft="check-circle" onClick={() => { setSel(c.id); setView("confirming"); }}>Já paguei o boleto</Button>
        </div>
      </div>
    );
  } else if (view === "card") {
    /* Tela 5 — PCI: form nasce vazio, nada é reidratado; mock é decorativo */
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <PtBack onBack={() => setView("home")} title="Cadastrar cartão" />
        <div style={{ flex: 1, padding: 18 }}>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            Cadastre seu cartão e a mensalidade é paga sozinha todo mês. Você pode cancelar quando quiser.</p>
          <div style={{ borderRadius: 16, padding: 20, background: "linear-gradient(120deg, var(--color-primary), var(--color-hero-to))", color: "#fff", marginBottom: 20, minHeight: 130, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Icon name="credit-card" size={26} />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>EducationHub</span>
            </div>
            <div style={{ fontSize: 17, fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>{cardForm.num || "•••• •••• •••• ••••"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.9 }}><span>{cardForm.nome.toUpperCase() || "NOME NO CARTÃO"}</span><span>{cardForm.val || "MM/AA"}</span></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Número do cartão">
              <Input value={cardForm.num} inputMode="numeric" leadingIcon="credit-card" placeholder="0000 0000 0000 0000"
                onChange={(e) => setCardForm({ ...cardForm, num: e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ") })} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Validade">
                <Input value={cardForm.val} inputMode="numeric" placeholder="MM/AA"
                  onChange={(e) => { let v = e.target.value.replace(/\D/g, "").slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2); setCardForm({ ...cardForm, val: v }); }} /></Field>
              <Field label="CVV">
                <Input value={cardForm.cvv} inputMode="numeric" placeholder="000"
                  onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></Field>
            </div>
            <Field label="Nome no cartão">
              <Input value={cardForm.nome} placeholder="Como está impresso no cartão" onChange={(e) => setCardForm({ ...cardForm, nome: e.target.value })} /></Field>
            <div style={{ padding: 14, borderRadius: "var(--radius-md)", border: `1.5px solid ${aceito ? "var(--color-primary)" : "var(--color-border)"}`,
              background: aceito ? "var(--color-primary-softer)" : "var(--color-bg)", transition: "all 140ms" }}>
              <Checkbox checked={aceito} onChange={setAceito}>Autorizo a cobrança recorrente automática neste cartão e concordo com os termos da assinatura.</Checkbox>
            </div>
            {PT_CONFIG.cardFeePayer === "RESPONSAVEL" && (
              <div style={{ display: "flex", gap: 9, fontSize: 12, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>
                <Icon name="info" size={14} color="var(--color-text-subtle)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Ao pagar no cartão, a escola cobra <strong>{PT_CONFIG.cardFeePct}%</strong> de taxa adicional. No PIX e boleto, nenhuma taxa extra.</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 9, fontSize: 12, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>
              <Icon name="lock" size={14} color="var(--color-text-subtle)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Seus dados vão direto para o processador de pagamentos e não ficam salvos aqui. Se você sair desta tela, será preciso digitar de novo.</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 18px 44px", borderTop: "1px solid var(--color-border-muted)" }}>
          <Button block size="lg" disabled={!aceito || !cardOkForm || salvando} iconLeft={salvando ? undefined : "lock"}
            onClick={() => { setSalvando(true); setTimeout(() => { setCartao({ last4: numDigits.slice(-4) }); setSalvando(false); setView("cardOk"); }, 900); }}>
            {salvando ? "Salvando…" : "Salvar cartão"}</Button>
        </div>
      </div>
    );
  } else if (view === "cardOk") {
    /* Tela 5b — copy verbatim da spec */
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <PtBrand />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
          <div style={{ width: 84, height: 84, margin: "0 auto 24px", borderRadius: "50%", background: "var(--badge-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", animation: "ex-scale-in 360ms ease" }}>
            <Icon name="credit-card" size={40} color="var(--badge-success-fg)" /></div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Cartão cadastrado!</h1>
          <p style={{ margin: "14px 0 0", fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            Pagamento automático ativado no cartão <strong style={{ color: "var(--color-text)" }}>•••• {cartao ? cartao.last4 : ""}</strong>. As próximas mensalidades serão pagas sozinhas.</p>
        </div>
        <div style={{ padding: "12px 18px 44px" }}>
          <Button block size="lg" iconLeft="home" onClick={() => setView("home")}>Voltar ao início</Button>
        </div>
      </div>
    );
  } else if (view === "pay") {
    /* Tela 3 — QR buscado on-demand (RN-04); "Já paguei" nunca confirma na hora (D-04) */
    const alvo = cob || proxima;
    const vencidaOuNeg = ["OVERDUE", "NEGATIVATED"].includes(st(alvo));
    const valorPagar = vencidaOuNeg ? ptTotais(alvo).total : alvo.valor;
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <PtBack onBack={() => setView(vencidaOuNeg ? "overdue" : "home")} title="Pagar com PIX" />
        <div style={{ flex: 1, padding: "8px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(valorPagar)}</div>
          <div style={{ fontSize: 13.5, color: "var(--color-text-subtle)", marginTop: 4, marginBottom: 22 }}>{alvo.desc}</div>
          {qrLoading ? (
            <div style={{ width: 190, height: 190, borderRadius: 12, background: "var(--color-surface)", border: "1px solid var(--color-border-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PtSpinner size={28} /></div>
          ) : <QrCode size={190} />}
          <div style={{ fontSize: 13, color: "var(--color-text-subtle)", margin: "14px 0 14px" }}>Abra o app do banco e escaneie</div>
          <div style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border-muted)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 12 }}>
            {qrLoading ? "…" : "00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef1234567890"}</div>
          <button disabled={qrLoading} onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, height: 48, borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--color-primary)", background: copied ? "var(--color-primary-softer)" : "var(--color-bg)", color: "var(--color-primary)",
              fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: qrLoading ? 0.5 : 1 }}>
            <Icon name={copied ? "check" : "copy"} size={18} />{copied ? "Copiado!" : "Copiar código PIX"}</button>
        </div>
        <div style={{ padding: "12px 18px 44px", borderTop: "1px solid var(--color-border-muted)" }}>
          <Button block size="lg" variant="secondary" iconLeft="check-circle" onClick={() => { setSel(alvo.id); setView("confirming"); }}>Já paguei</Button>
          <div style={{ fontSize: 12, color: "var(--color-text-subtle)", textAlign: "center", marginTop: 10 }}>A confirmação é automática em segundos.</div>
        </div>
      </div>
    );
  } else if (view === "confirming") {
    /* D-04 — aguardando webhook; nunca afirma que já foi pago */
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <PtBrand />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 28px", textAlign: "center", gap: 20 }}>
          <PtSpinner size={44} />
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em" }}>Confirmando pagamento…</h1>
          <p style={{ margin: 0, fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            A confirmação é automática — assim que o banco avisar, o status muda sozinho. Você pode fechar esta tela.</p>
        </div>
        <div style={{ padding: "12px 18px 44px" }}>
          <Button block size="lg" variant="secondary" iconLeft="home" onClick={() => setView("home")}>Voltar ao início</Button>
        </div>
      </div>
    );
  } else if (view === "success") {
    /* alcançada apenas quando o webhook confirma */
    const wasVencida = cob && ["OVERDUE", "NEGATIVATED"].includes(cob.status);
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <PtBrand />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
          <div style={{ width: 84, height: 84, margin: "0 auto 24px", borderRadius: "50%", background: "var(--badge-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", animation: "ex-scale-in 360ms ease" }}>
            <Icon name="check" size={44} color="var(--badge-success-fg)" strokeWidth={3} /></div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Pagamento confirmado!</h1>
          <p style={{ margin: "14px 0 0", fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            {wasVencida
              ? <>O banco confirmou o pagamento. Sua situação foi <strong style={{ color: "var(--color-success)" }}>regularizada</strong> e a negativação foi cancelada automaticamente.</>
              : <>O banco confirmou o pagamento da mensalidade de <strong style={{ color: "var(--color-text)" }}>João</strong>. A nota fiscal fica disponível no histórico em instantes.</>}</p>
        </div>
        <div style={{ padding: "12px 18px 44px" }}>
          <Button block size="lg" iconLeft="home" onClick={() => setView("home")}>Voltar ao início</Button>
        </div>
      </div>
    );
  } else {
    /* detail — inclui RN-05 (sem asaasPaymentId → botão desabilitado, motivo visível) */
    const s = st(cob);
    const isPaid = s === "PAID";
    content = (
      <div style={{ minHeight: "100%", background: "var(--color-surface)" }}>
        <PtBack onBack={() => setView("home")} title="Detalhe da cobrança" />
        <div style={{ padding: 16 }}>
          <Card style={{ padding: 22, marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(cob.valor)}</div>
            <div style={{ fontSize: 13.5, color: "var(--color-text-subtle)", marginTop: 6 }}>{cob.desc}</div>
            <div style={{ marginTop: 14 }}><PortalBadge status={s} /></div>
          </Card>
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
            {[[isPaid ? "Pago em" : "Vence em", isPaid ? cob.pagoEm : cob.venc], ["Cobrança", `#${cob.id.toUpperCase()}`]].map(([k, v], i, a) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "13px 16px", fontSize: 14, borderBottom: i < a.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}>
                <span style={{ color: "var(--color-text-subtle)" }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
            ))}
          </Card>
          {isPaid ? (
            cob.nf ? (
              <Card style={{ padding: 18, display: "flex", alignItems: "center", gap: 13 }}>
                <span style={{ width: 42, height: 42, borderRadius: 11, background: "var(--color-primary-soft)", color: "var(--color-primary-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="file-text" size={20} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Nota fiscal nº {cob.nf}</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>NFS-e · disponível para IR</div>
                </div>
                <Button variant="secondary" size="sm" iconLeft="download">PDF</Button>
              </Card>
            ) : cob.nfPending ? (
              <Card style={{ padding: 16, fontSize: 13, color: "var(--color-text-subtle)", textAlign: "center" }}>Nota fiscal em processamento</Card>
            ) : null
          ) : (
            <>
              <Button block size="lg" iconLeft="qr-code" disabled={!cob.asaas} onClick={() => setView("pay")}>Pagar agora</Button>
              {!cob.asaas && <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", textAlign: "center", marginTop: 10 }}>Cobrança ainda sendo processada — tente em alguns minutos.</div>}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: 18 }}>
      <style>{`@keyframes pt-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-text-subtle)" }}>
        <Icon name="smartphone" size={16} />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Portal do responsável · celular da Maria</span>
      </div>
      <IOSDevice>{content}</IOSDevice>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={exit} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999,
          border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          <Icon name="arrow-left" size={15} />Voltar ao protótipo</button>
        <button onClick={() => setView(view === "linkExpired" ? "home" : "linkExpired")} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999,
          border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          <Icon name={view === "linkExpired" ? "check" : "link-2-off"} size={15} />{view === "linkExpired" ? "Voltar ao portal" : "Simular link expirado"}</button>
      </div>
    </div>
  );
};

window.FlowE = FlowE;

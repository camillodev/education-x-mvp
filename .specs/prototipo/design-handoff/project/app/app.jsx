/* Education X — app router + launcher */

// Fluxos conciliados com as specs (uploads/mvp-01…06 + DH-f1…f5).
// backlog: true = fora das specs do MVP — sai da navbar, vive na aba Backlog da home.
const FLOWS = [
  // Specs MVP — escola
  { id: "a",    go: "a",   spec: "MVP-01", title: "Onboarding da escola",             persona: "Admin",       device: "Desktop",              icon: "building-2" },
  { id: "c6",   go: "c6",  spec: "MVP-02", title: "Matrícula assistida + aprovação", persona: "Orientador",  device: "Desktop",              icon: "user-plus" },
  { id: "b",    go: "b",   spec: "MVP-02", title: "Matrícula via link (Mobile)",     persona: "Responsável", device: ["Desktop", "Mobile"],   icon: "smartphone" },
  { id: "c3",   go: "c3",  spec: "MVP-03", title: "Cobrança automática",              persona: "Automático",  device: "Desktop",              icon: "receipt" },
  { id: "nf",   go: "c3",  spec: "MVP-04", title: "Nota fiscal + régua",              persona: "Automático",  device: "Desktop",              icon: "file-check" },
  { id: "neg",  go: "d0",  spec: "MVP-05", title: "Negativação + régua de cobrança",  persona: "Orientador",  device: "Desktop",              icon: "gavel" },
  { id: "rep-fin", go: "rep", spec: "MVP-06", title: "Relatório financeiro",     persona: "Orientador", device: "Desktop", icon: "bar-chart-3" },
  { id: "dash", go: "c0",  spec: "F5",     title: "Dashboard da escola",              persona: "Orientador",  device: "Desktop",              icon: "layout-dashboard" },
  { id: "cfg",  go: "settings", spec: "MVP-04·05", title: "Configurações (fiscal + SPC)", persona: "Admin",   device: "Desktop",              icon: "settings-2" },
  // Roadmap — portal do responsável (DH-f4)
  { id: "e-portal",  go: "e",         backlog: true, title: "Portal do responsável (Roadmap)",           persona: "Responsável", device: ["Desktop", "Mobile"], icon: "layout-dashboard" },
  { id: "e-card",    go: "e",         backlog: true, title: "Pagamento automático (cartão) (Roadmap)",   persona: "Responsável", device: ["Desktop", "Mobile"], icon: "credit-card" },
  { id: "e-overdue", go: "e-overdue", backlog: true, title: "Pagamentos atrasados (Roadmap)",            persona: "Responsável", device: ["Desktop", "Mobile"], icon: "alert-triangle" },
  { id: "e-notif",   go: "e",         backlog: true, title: "Notificações da escola (Roadmap)",          persona: "Responsável", device: ["Desktop", "Mobile"], icon: "bell" },
  // Backlog — fora das specs do MVP (removidos da navbar)
  { id: "contas",  go: "fin:contas", backlog: true, title: "Contas a pagar (Roadmap)",          persona: "Orientador", device: "Desktop", icon: "file-minus" },
  { id: "caixa",   go: "fin:caixa",  backlog: true, title: "Fluxo de caixa (Roadmap)",          persona: "Orientador", device: "Desktop", icon: "line-chart" },
  { id: "ext",     go: "ext",        backlog: true, title: "Extrato (Roadmap)",                 persona: "Orientador", device: "Desktop", icon: "arrow-left-right" },
  { id: "rep-rel", go: "rep",        backlog: true, title: "Relatório de desempenho (Roadmap)", persona: "Orientador", device: "Desktop", icon: "trending-up" },
];

const PERSONA_VARIANT = { Admin: "neutral", Orientador: "primary", Responsável: "success", Automático: "warning" };

const LaunchCard = ({ f, hover, setHover, go }) => {
  const devices = Array.isArray(f.device) ? f.device : [f.device];
  return (
    <Card interactive onClick={() => go(f.go)}
      onMouseEnter={() => setHover(f.id)} onMouseLeave={() => setHover(null)}
      style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--color-primary-soft)", color: "var(--color-primary-hover)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={f.icon} size={26} />
        </span>
        {f.spec && <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
          color: "var(--color-text-subtle)", padding: "3px 8px", borderRadius: 999, border: "1px solid var(--color-border)" }}>{f.spec}</span>}
        {f.backlog && <Badge variant="warning" size="sm">Backlog</Badge>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{f.title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
        {devices.map((d) => (
          <Badge key={d} variant="neutral" size="sm"><Icon name={d === "Mobile" ? "smartphone" : "monitor"} size={11} />{d}</Badge>
        ))}
      </div>
    </Card>
  );
}

const Launcher = ({ go }) => {
  const [hover, setHover] = useState(null);
  const [filter, setFilter] = useState("todas");
  const FILTER_MAP = {
    todas:        (f) => !f.backlog,
    escola:       (f) => !f.backlog && ["Orientador", "Automático"].includes(f.persona),
    responsaveis: (f) => !f.backlog && f.persona === "Responsável",
    admin:        (f) => !f.backlog && f.persona === "Admin",
    backlog:      (f) => !!f.backlog,
  };
  const visible = FLOWS.filter(FILTER_MAP[filter]);
  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      {/* hero */}
      <div style={{ background: "linear-gradient(120deg, var(--color-hero-from), var(--color-hero-to))", color: "#fff", padding: "0 0 64px", position: "relative", overflow: "hidden" }}>
        <svg viewBox="0 0 1400 400" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.7 }} aria-hidden="true">
          <circle cx="1150" cy="80" r="220" fill="rgba(255,255,255,0.06)" />
          <circle cx="1280" cy="320" r="160" fill="rgba(255,255,255,0.05)" />
          <circle cx="120" cy="340" r="180" fill="rgba(255,255,255,0.05)" />
        </svg>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 28px 0", position: "relative" }}>
          <Logo size={22} light />
          <div style={{ marginTop: 56, maxWidth: 720 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.85, marginBottom: 16 }}>EducationHub · gestão financeira escolar</div>
            <h1 style={{ margin: 0, fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Matrícula e cobrança<br />que rodam sozinhas</h1>
            <p style={{ margin: "18px 0 0", fontSize: 17, lineHeight: 1.55, opacity: 0.92, maxWidth: 620 }}>
              A plataforma de gestão financeira para escolas que querem parar de correr atrás de mensalidade — da matrícula no celular do pai ao dinheiro na conta.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <Button size="lg" variant="secondary" iconLeft="layout-dashboard" onClick={() => go("c0")} style={{ background: "#fff", border: "none" }}>Abrir o painel da escola</Button>
              <Button size="lg" iconLeft="smartphone" onClick={() => go("b")} style={{ background: "rgba(255,255,255,0.16)", color: "#fff", boxShadow: "none" }}>Abrir Painel dos Responsáveis</Button>
            </div>
          </div>
        </div>
      </div>

      {/* flat flow grid — todos os fluxos sem separação */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 28px 72px" }}>
        {/* filter tabs */}
        <div style={{ marginBottom: 24 }}>
          <Segmented value={filter} onChange={setFilter}
            options={[
              { value: "todas",        label: "Todas" },
              { value: "escola",       label: "Escola" },
              { value: "responsaveis", label: "Responsáveis" },
              { value: "admin",        label: "Admin" },
              { value: "backlog",      label: "Backlog" },
            ]} />
        </div>
        {filter === "backlog" && (
          <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--color-text-muted)", maxWidth: 640 }}>
            Fluxos fora das specs do MVP — saíram da navegação principal, mas continuam navegáveis aqui.
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {visible.map((f) => <LaunchCard key={f.id} f={f} hover={hover} setHover={setHover} go={go} />)}
        </div>
        <div style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "var(--color-text-subtle)" }}>
          EducationHub · gestão financeira para escolas
        </div>
      </div>
    </div>
  );
};

/* ─── Router ───────────────────────────────────────────────────────────── */
const App = () => {
  const [screen, setScreen] = useState("home");
  const [sel, setSel] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };
  const go = (s) => { window.scrollTo(0, 0); document.querySelectorAll("main").forEach((m) => m.scrollTo && m.scrollTo(0, 0)); setScreen(s); };

  useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  let view;
  if (screen.indexOf("fin:") === 0) {
    view = <FinanceiroPage key={screen} go={go} toast={showToast} initialTab={screen.slice(4)} />;
  } else
  switch (screen) {
    case "home":  view = <Launcher go={go} />; break;
    case "a":     view = <FlowA go={go} exit={() => go("home")} onDone={() => go("c0")} onImport={() => go("imp")} setSel={setSel} />; break;
    case "materias": view = <MateriasEscola go={go} sel={sel} toast={showToast} />; break;
    case "b":     view = <FlowB exit={() => go("home")} />; break;
    case "e":     view = <FlowE exit={() => go("home")} />; break;
    case "e-overdue": view = <FlowE exit={() => go("home")} start="overdue" />; break;
    case "c0":    view = <C0Dashboard go={go} toast={showToast} />; break;
    case "rep":   view = <RelatoriosPage go={go} toast={showToast} />; break;
    case "ext":   view = <ExtratoPage go={go} toast={showToast} />; break;
    case "c1":    view = <C1Pendentes go={go} setSel={setSel} />; break;
    case "c2":    view = <C2Revisar go={go} sel={sel} toast={showToast} />; break;
    case "c3":    view = <C3Cobrancas key="c3" go={go} setSel={setSel} />; break;
    case "c4":    view = <C4Detalhe go={go} sel={sel} toast={showToast} />; break;
    case "c5":    view = <C5Nova go={go} toast={showToast} />; break;
    case "d0":    view = <C3Cobrancas key="d0" go={go} setSel={setSel} initialTab="negativacao" />; break;
    case "d1":    view = <D1Detalhe go={go} sel={sel} toast={showToast} />; break;
    case "settings": view = <Settings go={go} toast={showToast} />; break;
    case "imp":   view = <ImportCSV go={go} toast={showToast} />; break;
    case "c6":    view = <C6NovaMatricula go={go} toast={showToast} />; break;
    case "confirm": view = <FlowConfirm exit={() => go("c1")} />; break;
    default:      view = <Launcher go={go} />;
  }

  const onHome = screen === "home";
  return (
    <>
      {/* persistent home button (except on launcher) */}
      {!onHome && (
        <button onClick={() => go("home")} title="Voltar ao início"
          style={{ position: "fixed", left: 16, bottom: 16, zIndex: 50, width: 46, height: 46, borderRadius: 12,
            border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-muted)",
            boxShadow: "var(--shadow-md)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="home" size={20} />
        </button>
      )}
      {view}
      <Toast toast={toast} />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

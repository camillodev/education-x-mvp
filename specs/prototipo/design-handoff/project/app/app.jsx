/* Education X — app router + launcher */

const FLOWS = [
  // 1 · Matrículas
  { id: "c6",       go: "c6",             title: "Matrícula manual",          persona: "Orientador",  device: "Desktop",              icon: "user-plus" },
  { id: "b",        go: "b",              title: "Matrícula via link",         persona: "Responsável", device: ["Desktop", "Mobile"],   icon: "smartphone" },
  // 2 · Cobranças
  { id: "cobranca", go: "c3",             title: "Geração de cobrança",        persona: "Automático",  device: "Desktop",              icon: "receipt" },
  { id: "neg",      go: "d0",             title: "Processo de negativação",    persona: "Orientador",  device: "Desktop",              icon: "gavel" },
  { id: "saque",    go: "fin",            title: "Retirada do pagamento",      persona: "Orientador",  device: "Desktop",              icon: "arrow-up-right" },
  // 3 · Relatórios
  { id: "rep-fin",  go: "rep:financeiro", title: "Relatório financeiro",       persona: "Orientador",  device: "Desktop",              icon: "wallet" },
  { id: "rep-rel",  go: "rep:relatorios", title: "Relatório de desempenho",    persona: "Orientador",  device: "Desktop",              icon: "bar-chart-3" },
  { id: "rep-ext",  go: "rep:extrato",    title: "Extrato",                    persona: "Orientador",  device: "Desktop",              icon: "file-spreadsheet" },
  // 4 · Processo dos responsáveis
  { id: "e-portal", go: "e",              title: "Portal do responsável",      persona: "Responsável", device: ["Desktop", "Mobile"],   icon: "layout-dashboard" },
  { id: "e-assina", go: "e",              title: "Pagamento via assinatura",   persona: "Responsável", device: ["Desktop", "Mobile"],   icon: "credit-card" },
  { id: "e-overdue",go: "e-overdue",      title: "Pagamentos atrasados",       persona: "Responsável", device: ["Desktop", "Mobile"],   icon: "alert-triangle" },
  { id: "e-neg",    go: "e-overdue",      title: "Processo de negativação",    persona: "Responsável", device: ["Desktop", "Mobile"],   icon: "shield-alert" },
  { id: "e-notif",  go: "e",              title: "Notificações da escola",     persona: "Responsável", device: ["Desktop", "Mobile"],   icon: "bell" },
  // 5 · Configurações  ·  6 · Admin onboarding
  { id: "cfg",      go: "settings",       title: "Configurações",              persona: "Admin",       device: "Desktop",              icon: "settings-2" },
  { id: "a",        go: "a",              title: "Onboarding da escola",       persona: "Admin",       device: "Desktop",              icon: "building-2" },
];

const PERSONA_VARIANT = { Admin: "neutral", Orientador: "primary", Responsável: "success", Automático: "warning" };

const LaunchCard = ({ f, hover, setHover, go }) => {
  const devices = Array.isArray(f.device) ? f.device : [f.device];
  return (
    <Card interactive onClick={() => go(f.go)}
      onMouseEnter={() => setHover(f.id)} onMouseLeave={() => setHover(null)}
      style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, cursor: "pointer" }}>
      <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--color-primary-soft)", color: "var(--color-primary-hover)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={f.icon} size={26} />
      </span>
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
    todas:        () => true,
    escola:       (f) => ["Orientador", "Automático"].includes(f.persona),
    responsaveis: (f) => f.persona === "Responsável",
    admin:        (f) => f.persona === "Admin",
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
            <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.85, marginBottom: 16 }}>Education X · gestão financeira escolar</div>
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
            ]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {visible.map((f) => <LaunchCard key={f.id} f={f} hover={hover} setHover={setHover} go={go} />)}
        </div>
        <div style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "var(--color-text-subtle)" }}>
          Education X · gestão financeira para escolas
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
  if (screen.indexOf("rep:") === 0) {
    view = <C0Dashboard key={screen} go={go} toast={showToast} initialTab={screen.slice(4)} />;
  } else
  switch (screen) {
    case "home":  view = <Launcher go={go} />; break;
    case "a":     view = <FlowA exit={() => go("home")} onDone={() => go("c0")} onImport={() => go("imp")} />; break;
    case "b":     view = <FlowB exit={() => go("home")} />; break;
    case "e":     view = <FlowE exit={() => go("home")} />; break;
    case "e-overdue": view = <FlowE exit={() => go("home")} start="overdue" />; break;
    case "c0":    view = <C0Dashboard go={go} toast={showToast} />; break;
    case "fin":   view = <C0Dashboard key="dash-fin" go={go} toast={showToast} initialTab="financeiro" />; break;
    case "c1":    view = <C1Pendentes go={go} setSel={setSel} />; break;
    case "c2":    view = <C2Revisar go={go} sel={sel} toast={showToast} />; break;
    case "c3":    view = <C3Cobrancas go={go} setSel={setSel} />; break;
    case "c4":    view = <C4Detalhe go={go} sel={sel} toast={showToast} />; break;
    case "c5":    view = <C5Nova go={go} toast={showToast} />; break;
    case "d0":    view = <C3Cobrancas go={go} setSel={setSel} initialTab="negativacao" />; break;
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

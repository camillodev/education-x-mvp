/* Education X — app shell: Logo, Sidebar (Fran), Topbar, AdminShell (Admin IX) */

const Logo = ({ size = 22, light }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
    <span style={{
      width: size + 8, height: size + 8, borderRadius: 8, flexShrink: 0,
      background: light ? "rgba(255,255,255,0.16)" : "var(--color-primary)",
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size - 4, letterSpacing: "-0.04em",
    }}>X</span>
    <span style={{ fontSize: size - 2, fontWeight: 800, letterSpacing: "-0.03em",
      color: light ? "#fff" : "var(--color-text)" }}>
      Education<span style={{ color: light ? "#fff" : "var(--color-primary)" }}>X</span>
    </span>
  </div>
);

const NAV = [
  { id: "c0", label: "Dashboard", icon: "layout-dashboard" },
  { id: "c1", label: "Matrículas", icon: "user-plus", badge: 3 },
  { id: "c3", label: "Cobranças", icon: "receipt" },
  { id: "settings", label: "Configurações", icon: "settings", section: true },
];

// which sidebar item is highlighted for a given screen
const NAV_GROUP = {
  c0: "c0", fin: "c0", c1: "c1", c2: "c1", c6: "c1", c3: "c3", c4: "c3", c5: "c3", d0: "c3", d1: "c3", settings: "settings",
};

// ─── Month picker (topbar) ───────────────────────────────────────────────
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MonthPicker = () => {
  const [i, setI] = useState(5); // Junho
  const [y, setY] = useState(2026);
  const step = (d) => { let ni = i + d, ny = y; if (ni > 11) { ni = 0; ny++; } if (ni < 0) { ni = 11; ny--; } setI(ni); setY(ny); };
  const isCurrent = i === 5 && y === 2026;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, padding: 3, borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
      <button onClick={() => step(-1)} aria-label="Mês anterior" style={{ width: 30, height: 30, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chevron-left" size={17} /></button>
      <span style={{ minWidth: 132, textAlign: "center", fontSize: 13.5, fontWeight: 600, color: "var(--color-text)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        <Icon name="calendar" size={15} color="var(--color-text-subtle)" />{MESES[i]} {y}</span>
      <button onClick={() => step(1)} disabled={isCurrent} aria-label="Próximo mês" style={{ width: 30, height: 30, borderRadius: 7, border: "none", background: "transparent", cursor: isCurrent ? "default" : "pointer", color: isCurrent ? "var(--color-border-input)" : "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chevron-right" size={17} /></button>
    </div>
  );
};

// ─── Dark mode toggle ────────────────────────────────────────────────────
const DarkToggle = ({ sidebar }) => {
  const [dark, setDark] = useState(() => (typeof document !== "undefined" && document.documentElement.dataset.mode === "dark"));
  useEffect(() => {
    document.documentElement.dataset.mode = dark ? "dark" : "light";
    try { localStorage.setItem("ex-mode", dark ? "dark" : "light"); } catch (e) {}
    if (window.lucide) window.lucide.createIcons();
  }, [dark]);
  if (sidebar) {
    return (
      <button onClick={() => setDark((d) => !d)} title={dark ? "Modo claro" : "Modo escuro"}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px",
          borderRadius: "var(--radius-md)", border: "none", textAlign: "left", cursor: "pointer",
          background: "transparent", color: "var(--color-text-muted)",
          fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 500 }}>
        <Icon name={dark ? "sun" : "moon"} size={19} strokeWidth={2} />
        <span style={{ flex: 1 }}>{dark ? "Modo claro" : "Modo escuro"}</span>
        <span style={{ width: 36, height: 20, borderRadius: 999, background: dark ? "var(--color-primary)" : "var(--color-border-input)",
          display: "inline-flex", alignItems: "center", padding: "0 3px", transition: "background 160ms", flexShrink: 0 }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff",
            transform: dark ? "translateX(16px)" : "translateX(0)", transition: "transform 160ms" }} />
        </span>
      </button>
    );
  }
  return (
    <button onClick={() => setDark((d) => !d)} title={dark ? "Modo claro" : "Modo escuro"}
      style={{ width: 38, height: 38, borderRadius: 9, border: "1px solid var(--color-border)", background: "var(--color-bg)", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon name={dark ? "sun" : "moon"} size={18} />
    </button>
  );
};

const Sidebar = ({ screen, go }) => {
  const activeNav = NAV_GROUP[screen] || screen;
  return (
    <aside style={{ width: 244, flexShrink: 0, background: "var(--color-bg)", borderRight: "1px solid var(--color-border)",
      display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: "20px 20px 18px" }}>
        <Logo size={22} />
      </div>
      <nav style={{ flex: 1, padding: "4px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV.map((it) => {
          const active = activeNav === it.id;
          return (
            <React.Fragment key={it.id}>
              {it.section && <div style={{ height: 1, background: "var(--color-border-muted)", margin: "10px 8px" }} />}
              <button onClick={() => go(it.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px",
                  borderRadius: "var(--radius-md)", border: "none", textAlign: "left", cursor: "pointer",
                  background: active ? "var(--color-primary-soft)" : "transparent",
                  color: active ? "var(--color-primary-hover)" : "var(--color-text-muted)",
                  fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: active ? 600 : 500,
                  transition: "background 140ms, color 140ms" }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-surface)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <Icon name={it.icon} size={19} strokeWidth={active ? 2.4 : 2} />
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.badge && <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 20, height: 20, padding: "0 6px",
                  borderRadius: 999, background: active ? "var(--color-primary)" : "var(--color-primary)", color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{it.badge}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      <div style={{ padding: 14, margin: 12, borderRadius: "var(--radius-md)", background: "var(--color-surface)",
        display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--color-primary)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>FR</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Fran Ribeiro</div>
          <div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>Orientadora</div>
        </div>
        <Icon name="log-out" size={16} color="var(--color-text-subtle)" />
      </div>
    </aside>
  );
};

const Topbar = ({ title, subtitle, actions, back, showMonth }) => (
  <header style={{ height: 68, flexShrink: 0, background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)",
    padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    position: "sticky", top: 0, zIndex: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
      {back && (
        <button onClick={back} style={{ width: 38, height: 38, borderRadius: 9, border: "1px solid var(--color-border)",
          background: "var(--color-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-text-muted)", flexShrink: 0 }}><Icon name="arrow-left" size={18} /></button>
      )}
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {showMonth && <MonthPicker />}
      {actions}
    </div>
  </header>
);

// Page chrome wrapper
const Shell = ({ screen, go, title, subtitle, actions, back, children, maxWidth = 1180, showMonth }) => (
  <div style={{ display: "flex", minHeight: "100vh", background: "transparent" }}>
    <Sidebar screen={screen} go={go} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Topbar title={title} subtitle={subtitle} actions={actions} back={back} showMonth={showMonth} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth, margin: "0 auto", padding: "28px 28px 72px", animation: "ex-rise 280ms ease" }}>
          {children}
        </div>
      </main>
    </div>
  </div>
);

// Admin IX shell (Flow A) — distinct platform-operator chrome
const AdminShell = ({ children, back, step }) => (
  <div style={{ minHeight: "100vh", background: "transparent" }}>
    <header style={{ height: 64, background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)",
      padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {back && (
          <button onClick={back} style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid var(--color-border)",
            background: "var(--color-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--color-text-muted)" }}><Icon name="arrow-left" size={18} /></button>
        )}
        <Logo size={20} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary-hover)", background: "var(--color-primary-soft)",
          padding: "4px 10px", borderRadius: 999, letterSpacing: "0.04em" }}>ADMIN IX</span>
      </div>
      <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>Operação da plataforma</span>
    </header>
    <main style={{ animation: "ex-rise 280ms ease" }}>{children}</main>
  </div>
);

Object.assign(window, { Logo, Sidebar, Topbar, Shell, AdminShell, NAV_GROUP, MonthPicker, DarkToggle });

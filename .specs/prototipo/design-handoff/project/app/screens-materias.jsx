/* Matérias & Preços por escola — conciliado com mvp-01 (Passo 3, "Dor 2 — redesign dos planos").
 * Decisão de escopo: vive como tela própria por escola (a partir da lista em A0), não como passo do
 * wizard admin. Os 4 planos (Mensal/Tri/Sem/Anual) são todos opcionais — valor é sempre exibido /mês,
 * nunca multiplicado por período; desconto vs. Mensal é sempre calculado, nunca digitado. */

const PLAN_KEYS = [
  { k: "mensal", label: "Mensal" },
  { k: "trimestral", label: "Trimestral" },
  { k: "semestral", label: "Semestral" },
  { k: "anual", label: "Anual" },
];

const descontoPct = (mensal, valor) => {
  const m = parseFloat(mensal), v = parseFloat(valor);
  if (!m || !v || v >= m) return null;
  return Math.round((1 - v / m) * 100);
};

const PlanoInput = ({ label, value, onChange, mensal, isMensal }) => {
  const pct = !isMensal ? descontoPct(mensal, value) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text-muted)" }}>{label}</label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        placeholder="—" inputMode="decimal" leadingIcon="banknote"
        trailing={<span style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>/mês</span>} />
      <div style={{ minHeight: 20 }}>
        {pct != null && (
          <Badge variant="success" size="sm"><Icon name="trending-down" size={11} />{pct}% mais barato que Mensal</Badge>
        )}
      </div>
    </div>
  );
};

const MateriaCard = ({ m, onChange, onRemove, removable }) => (
  <Card style={{ padding: 20 }}>
    <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "flex-end" }}>
      <Field label="Nome da matéria" required><Input value={m.nome} onChange={(e) => onChange({ ...m, nome: e.target.value })} placeholder="Ex.: Matemática" leadingIcon="book-open" /></Field>
      <Field label="Código NFS-e" hint="Opcional"><Input value={m.codigo || ""} onChange={(e) => onChange({ ...m, codigo: e.target.value })} placeholder="Ex.: 08.01" style={{ maxWidth: 160 }} /></Field>
      {removable && (
        <button onClick={onRemove} title="Remover matéria" style={{ width: 46, height: 46, border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-bg)", cursor: "pointer", color: "var(--color-text-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="trash-2" size={16} /></button>
      )}
    </div>
    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Planos — todos opcionais, valor sempre mensal</div>
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 16, minWidth: 640 }}>
        {PLAN_KEYS.map(({ k, label }) => (
          <PlanoInput key={k} label={label} value={m[k]} mensal={m.mensal} isMensal={k === "mensal"}
            onChange={(v) => onChange({ ...m, [k]: v })} />
        ))}
      </div>
    </div>
  </Card>
);

const MateriasEscola = ({ go, sel, toast }) => {
  const escola = ESCOLAS.find((e) => e.id === sel) || ESCOLAS[0];
  const [lista, setLista] = useState(() => (MATERIAS_POR_ESCOLA[escola.id] || []).map((m) => ({ ...m })));
  const update = (id, next) => setLista((l) => l.map((m) => (m.id === id ? next : m)));
  const remove = (id) => setLista((l) => l.filter((m) => m.id !== id));
  const add = () => setLista((l) => [...l, { id: "mat_" + Date.now(), nome: "", codigo: "", mensal: null, trimestral: null, semestral: null, anual: null }]);

  return (
    <AdminShell back={() => go("a")} go={go}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 28px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <Button variant="tertiary" size="sm" iconLeft="arrow-left" onClick={() => go("a")}>Escolas</Button>
        </div>
        <div style={{ marginBottom: 26 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{escola.nome}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Matérias & Preços</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.5, maxWidth: 560 }}>
            Cada matéria pode ter até 4 planos. O valor mostrado é sempre o mensal — nunca multiplicamos por período. O desconto ao lado é calculado sozinho, comparando com o Mensal.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {lista.map((m) => (
            <MateriaCard key={m.id} m={m} removable={lista.length > 1}
              onChange={(next) => update(m.id, next)} onRemove={() => remove(m.id)} />
          ))}
          {lista.length === 0 && (
            <Card style={{ padding: 40, textAlign: "center", color: "var(--color-text-subtle)", fontSize: 14 }}>Nenhuma matéria cadastrada.</Card>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <Button variant="secondary" iconLeft="plus" onClick={add}>Adicionar matéria</Button>
          <Button iconLeft="check" onClick={() => toast(`Matérias de ${escola.nome} salvas.`, "success")}>Salvar alterações</Button>
        </div>
      </div>
    </AdminShell>
  );
};

window.MateriasEscola = MateriasEscola;

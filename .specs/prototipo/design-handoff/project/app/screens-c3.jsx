/* C6 — Matrícula assistida (orientador, desktop) · conciliado com DH-f1 (campo a campo)
 * Passo 1 Responsável (busca + cadastro + selfPayer + Consulta Serasa)
 * Passo 2 Alunos (até 5; pulado se selfPayer) · Passo 3 Matérias, plano e desconto (por aluno)
 * Passo 4 Revisão (CPF mascarado + "Enviar link" OU "Confirmar agora")
 * + FlowConfirm — confirmação do responsável via link (/m/confirmar/[token]) */

const Row2c = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>;

const MATERIAS = [["Matemática", "var(--color-primary)"], ["Português", "#FCC000"], ["Inglês", "#E42618"], ["Japonês", "#83B81A"]];
const C6_TIPOS = [{ value: "MOTHER", label: "Mãe" }, { value: "FATHER", label: "Pai" }, { value: "LEGAL_GUARDIAN", label: "Responsável legal" }];
const TIPO_LABEL = { MOTHER: "Mãe", FATHER: "Pai", LEGAL_GUARDIAN: "Responsável legal" };

// Máscara de PII (exibição de dado salvo): 123.456.789-00 → ***.456.789-**
const maskCpf = (cpf) => {
  const d = (cpf || "").replace(/\D/g, "").padStart(11, "0");
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

// Responsáveis já cadastrados (busca interna — R6: Guardian existente é reaproveitado)
const GUARDIANS = [
  { nome: "Carlos Andrade", cpf: "222.333.444-00", email: "carlos.andrade@email.com", tel: "(31) 98800-1010", tipo: "FATHER", serasa: { score: 745, negativado: false, em: "12/05/2026" } },
  { nome: "Patrícia Lopes", cpf: "333.444.555-00", email: "patricia.lopes@email.com", tel: "(31) 99700-2020", tipo: "MOTHER", serasa: null },
  { nome: "Antônio Reis", cpf: "321.654.987-00", email: "antonio.reis@email.com", tel: "(31) 98111-9090", tipo: "FATHER", serasa: { score: 320, negativado: true, em: "28/04/2026" } },
  { nome: "Renata Alves", cpf: "555.666.777-00", email: "renata.alves@email.com", tel: "(31) 99500-4040", tipo: "LEGAL_GUARDIAN", serasa: null },
  { nome: "Fernanda Dias", cpf: "666.777.888-00", email: "fernanda.dias@email.com", tel: "(31) 98400-5050", tipo: "MOTHER", serasa: null },
];

/* ── validações client-side (o servidor sempre revalida) ── */
const cDigits = (s) => (s || "").replace(/\D/g, "");
const cValidNome = (s) => (s || "").trim().length >= 3 && (s || "").trim().includes(" ");
const cValidCpf = (s) => cDigits(s).length === 11;
const cValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");
const cValidFone = (s) => cDigits(s).length === 11;
const cValidData = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(s || "");

const ScoreBadge = ({ score, negativado }) => {
  const variant = negativado || score < 400 ? "danger" : score < 700 ? "warning" : "success";
  const label = negativado ? `Score ${score} · negativado` : `Score ${score}`;
  return <Badge variant={variant} dot>{label}</Badge>;
};

/* ── Card Consulta Serasa (R15–R18: só no fluxo manual, opcional, consentimento LGPD) ── */
const SerasaCard = ({ guardian, consent, setConsent, consentReg, resultado, onConsultar, loading }) => {
  // Guardian reaproveitado já consultado (R17): mostra o resultado salvo, sem reconsulta
  if (guardian && guardian.serasa && !resultado) {
    return (
      <Card style={{ padding: 20 }}>
        <SectionHead title="Consulta Serasa" sub="Já consultado para este responsável — sem nova cobrança" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <ScoreBadge score={guardian.serasa.score} negativado={guardian.serasa.negativado} />
          <span style={{ fontSize: 13, color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="check-circle-2" size={15} color="var(--badge-success-fg)" />Consultado em {guardian.serasa.em}</span>
        </div>
      </Card>
    );
  }
  return (
    <Card style={{ padding: 20 }}>
      <SectionHead title="Consulta Serasa (opcional)" sub="A matrícula segue normalmente sem a consulta" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", fontSize: 12.5, color: "var(--color-text-muted)", display: "flex", gap: 9, alignItems: "flex-start", lineHeight: 1.5 }}>
          <Icon name="info" size={15} color="var(--color-text-subtle)" style={{ flexShrink: 0, marginTop: 1 }} />
          Cada consulta custa R$ 16,99, repassado à escola. O responsável nunca consulta o próprio score.
        </div>
        <Checkbox checked={consent} onChange={setConsent}>O responsável autoriza a consulta de score de crédito (Serasa) para esta matrícula.</Checkbox>
        {consent && !consentReg && (
          <span style={{ fontSize: 12, color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="loader-2" size={13} style={{ animation: "ex-spin 900ms linear infinite" }} />Registrando o aceite (IP do orientador)…</span>
        )}
        {resultado ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ScoreBadge score={resultado.score} negativado={resultado.negativado} />
            <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>Consultado agora · resultado salvo no cadastro</span>
          </div>
        ) : (
          <Button variant="secondary" iconLeft={loading ? "loader-2" : "search"} disabled={!consentReg || loading} onClick={onConsultar}
            style={loading ? { pointerEvents: "none" } : undefined}>
            {loading ? "Consultando… (até 5s)" : "Consultar Serasa"}</Button>
        )}
      </div>
    </Card>
  );
};

const C6NovaMatricula = ({ go, toast }) => {
  // ── responsável ──
  const [busca, setBusca] = useState("");
  const [guardianSel, setGuardianSel] = useState(null); // Guardian existente reaproveitado (R6)
  const [g, setG] = useState({ nome: "", cpf: "", email: "", tel: "", tipo: "" });
  const [selfPayer, setSelfPayer] = useState(false);
  const [touched, setTouched] = useState({});
  // ── serasa ──
  const [consent, setConsent] = useState(false);
  const [consentReg, setConsentReg] = useState(false);
  const [serasaLoading, setSerasaLoading] = useState(false);
  const [serasaResult, setSerasaResult] = useState(null);
  // ── alunos / planos ──
  const emptyAluno = () => ({ nome: "", nascimento: "", notes: "", materias: [], plano: "Mensal", desconto: false, descontoTipo: "percent", descontoVal: "0" });
  const [alunos, setAlunos] = useState([emptyAluno()]);
  const [step, setStep] = useState(0);
  const [confirmarModal, setConfirmarModal] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { // consentimento → registra TermsAcceptance antes de habilitar o botão (R16)
    if (consent && !consentReg) { const t = setTimeout(() => setConsentReg(true), 700); return () => clearTimeout(t); }
    if (!consent) setConsentReg(false);
  }, [consent]);

  const consultarSerasa = () => {
    setSerasaLoading(true);
    setTimeout(() => {
      setSerasaLoading(false);
      const low = (g.nome || "").toLowerCase().includes("reis");
      setSerasaResult(low ? { score: 320, negativado: true } : { score: 745, negativado: false });
    }, 1600);
  };

  const setGF = (k) => (e) => { setG({ ...g, [k]: e.target.value }); if (guardianSel) setGuardianSel(null); };
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const pickGuardian = (og) => { setGuardianSel(og); setG({ nome: og.nome, cpf: og.cpf, email: og.email, tel: og.tel, tipo: og.tipo }); setBusca(""); };

  const gErr = {
    nome: !cValidNome(g.nome) && "Digite o nome completo",
    cpf: !cValidCpf(g.cpf) && "CPF inválido",
    email: !cValidEmail(g.email) && "Digite um e-mail válido",
    tel: !cValidFone(g.tel) && "Digite um celular válido com DDD",
    tipo: !g.tipo && "Selecione o tipo de responsável",
  };
  const gOk = !gErr.nome && !gErr.cpf && !gErr.email && !gErr.tel && !gErr.tipo;

  const resultados = busca.trim().length >= 2
    ? GUARDIANS.filter((og) => og.nome.toLowerCase().includes(busca.trim().toLowerCase()) || cDigits(og.cpf).includes(cDigits(busca)))
    : [];

  // ── passos dinâmicos: selfPayer pula "Alunos" (R10) ──
  const STEPS = selfPayer ? ["Responsável", "Matérias e plano", "Revisão"] : ["Responsável", "Alunos", "Matérias e plano", "Revisão"];
  const stepId = STEPS[step]; // rótulo do passo atual

  const setAluno = (i, k, v) => setAlunos((c) => c.map((a, j) => (j === i ? { ...a, [k]: v } : a)));
  const toggleMat = (i, m) => setAlunos((c) => c.map((a, j) => (j === i ? { ...a, materias: a.materias.includes(m) ? a.materias.filter((x) => x !== m) : [...a.materias, m] } : a)));
  const maxed = alunos.length >= 5;

  // selfPayer: Student criado automaticamente com os dados do Guardian
  const alunosEfetivos = selfPayer ? [{ ...alunos[0], nome: g.nome, nascimento: alunos[0].nascimento || "—" }] : alunos;

  const alunosOk = selfPayer || alunos.every((a) => (a.nome || "").trim().length >= 2 && cValidData(a.nascimento));

  const planoDe = (a) => PLANOS.find((p) => p.nome === a.plano) || PLANOS[0];
  const descNum = (a) => parseFloat((a.descontoVal || "0").replace(/\./g, "").replace(",", ".")) || 0;
  const descErr = (a) => {
    if (!a.desconto) return null;
    if (a.descontoTipo === "percent" && descNum(a) > 100) return "O desconto não pode passar de 100%.";
    if (a.descontoTipo === "fixed" && descNum(a) >= planoDe(a).parcela) return "O desconto não pode ser maior que o valor da mensalidade.";
    return null;
  };
  const descValor = (a) => !a.desconto ? 0 : a.descontoTipo === "percent" ? planoDe(a).parcela * Math.min(descNum(a), 100) / 100 : Math.min(descNum(a), planoDe(a).parcela);
  const finalPorMateria = (a) => Math.max(0, planoDe(a).parcela - descValor(a));
  const planosOk = alunosEfetivos.every((a) => a.materias.length >= 1 && !descErr(a));
  const totalMensal = alunosEfetivos.reduce((s, a) => s + finalPorMateria(a) * a.materias.length, 0);

  const enviar = (presencial) => {
    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      if (presencial) { setConfirmarModal(false); toast("Matrícula registrada. Agora é só aguardar a aprovação da escola.", "success"); }
      else toast("Link enviado! O responsável tem 72 horas para confirmar.", "success");
      go("c1");
    }, 900);
  };

  /* ── stepper ── */
  const stepper = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {STEPS.map((s, i) => {
        const on = i === step, done = i < step;
        return (
          <button key={s} onClick={() => done && setStep(i)} disabled={!done && !on}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999,
              border: `1.5px solid ${on ? "var(--color-primary)" : "var(--color-border)"}`,
              background: on ? "var(--color-primary-softer)" : "var(--color-bg)", cursor: done ? "pointer" : "default",
              fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: on ? 700 : 500,
              color: on ? "var(--color-primary-hover)" : done ? "var(--color-text-muted)" : "var(--color-text-subtle)" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "var(--badge-success-bg)" : on ? "var(--color-primary)" : "var(--color-surface)",
              color: done ? "var(--badge-success-fg)" : on ? "#fff" : "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700 }}>
              {done ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
            {s}
          </button>
        );
      })}
    </div>
  );

  return (
    <Shell screen="c6" go={go} back={() => go("c1")} title="Nova matrícula" subtitle="Você preenche — o responsável confirma pelo link e dá o aceite" maxWidth={760}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {stepper}

        {/* ═══ Passo 1 — Responsável ═══ */}
        {stepId === "Responsável" && (
        <>
          <Card style={{ padding: 24 }}>
            <SectionHead title="Buscar responsável" sub="Se já é cadastrado, reaproveitamos os dados — sem digitar de novo" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou CPF" leadingIcon="search" />
            {busca.trim().length >= 2 && (
              resultados.length > 0 ? (
                <div style={{ marginTop: 12, border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {resultados.map((og) => (
                    <button key={og.cpf} onClick={() => pickGuardian(og)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px",
                        border: "none", borderBottom: "1px solid var(--color-border-muted)", background: "var(--color-bg)", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }}>
                      <span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", display: "block" }}>{og.nome}</span>
                        <span style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>{maskCpf(og.cpf)} · {og.email}</span>
                      </span>
                      <Icon name="chevron-right" size={16} color="var(--color-text-subtle)" />
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 12, fontSize: 13.5, color: "var(--color-text-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="user-x" size={16} />Nenhum responsável encontrado. Cadastre um novo abaixo.</div>
              )
            )}
            {guardianSel && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)",
                background: "var(--badge-success-bg)", fontSize: 13, color: "var(--badge-success-fg)", fontWeight: 600 }}>
                <Icon name="user-check" size={16} />Responsável existente reaproveitado — cadastro de cobrança (Asaas) será reutilizado.</div>
            )}
          </Card>

          <Card style={{ padding: 24 }}>
            <SectionHead title={guardianSel ? "Dados do responsável" : "Cadastrar novo responsável"} sub="Quem recebe o link e autoriza a cobrança" />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Row2c>
                <Field label="Nome completo" required error={touched.nome && gErr.nome ? gErr.nome : undefined}>
                  <Input value={g.nome} onChange={setGF("nome")} onBlur={blur("nome")} error={!!(touched.nome && gErr.nome)} placeholder="Ex.: Maria Silva" leadingIcon="user" /></Field>
                <Field label="CPF" required error={touched.cpf && gErr.cpf ? gErr.cpf : undefined}>
                  <Input value={g.cpf} onChange={setGF("cpf")} onBlur={blur("cpf")} error={!!(touched.cpf && gErr.cpf)} placeholder="000.000.000-00" inputMode="numeric" /></Field>
              </Row2c>
              <Row2c>
                <Field label="E-mail" required hint="Recebe o link de confirmação e os boletos" error={touched.email && gErr.email ? gErr.email : undefined}>
                  <Input value={g.email} onChange={setGF("email")} onBlur={blur("email")} error={!!(touched.email && gErr.email)} type="email" placeholder="email@exemplo.com" leadingIcon="mail" /></Field>
                <Field label="Celular (WhatsApp)" required error={touched.tel && gErr.tel ? gErr.tel : undefined}>
                  <Input value={g.tel} onChange={setGF("tel")} onBlur={blur("tel")} error={!!(touched.tel && gErr.tel)} inputMode="tel" placeholder="(00) 00000-0000" leadingIcon="phone" /></Field>
              </Row2c>
              <Field label="Tipo de responsável" required error={touched.tipo && gErr.tipo ? gErr.tipo : undefined}>
                <Segmented key={g.tipo} value={g.tipo} onChange={(v) => setG({ ...g, tipo: v })} options={C6_TIPOS} size="sm" /></Field>
              <div style={{ borderTop: "1px solid var(--color-border-muted)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>O aluno é o próprio responsável financeiro</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 3, maxWidth: 420, lineHeight: 1.5 }}>
                    Paga a própria mensalidade. O passo "Alunos" é pulado — criamos o aluno com os dados acima.</div>
                </div>
                <Toggle checked={selfPayer} onChange={setSelfPayer} />
              </div>
            </div>
          </Card>

          <SerasaCard guardian={guardianSel} consent={consent} setConsent={setConsent} consentReg={consentReg}
            resultado={serasaResult} onConsultar={consultarSerasa} loading={serasaLoading} />

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button variant="tertiary" onClick={() => go("c1")}>Cancelar</Button>
            <Button size="lg" iconRight="arrow-right" disabled={!gOk} onClick={() => setStep(1)}>Continuar</Button>
          </div>
        </>
        )}

        {/* ═══ Passo 2 — Alunos (pulado se selfPayer) ═══ */}
        {stepId === "Alunos" && (
        <>
          <Card style={{ padding: 24 }}>
            <SectionHead title="Alunos" sub="Até 5 alunos por matrícula" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {alunos.map((a, i) => (
                <div key={i} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aluno {i + 1}</span>
                    {alunos.length > 1 && (
                      <button onClick={() => setAlunos((c) => c.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                        <Icon name="trash-2" size={15} />Remover</button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <Row2c>
                      <Field label="Nome do aluno" required error={a.nome !== "" && a.nome.trim().length < 2 ? "Digite o nome do aluno" : undefined}>
                        <Input value={a.nome} onChange={(e) => setAluno(i, "nome", e.target.value)} placeholder="Ex.: João Silva" leadingIcon="graduation-cap" /></Field>
                      <Field label="Data de nascimento" required error={a.nascimento !== "" && !cValidData(a.nascimento) ? "Data de nascimento inválida" : undefined}>
                        <Input value={a.nascimento} onChange={(e) => setAluno(i, "nascimento", e.target.value)} placeholder="DD/MM/AAAA" inputMode="numeric" leadingIcon="calendar" /></Field>
                    </Row2c>
                    <Field label="Observações" hint="Opcional — só a escola vê">
                      <Input value={a.notes} onChange={(e) => setAluno(i, "notes", e.target.value)} placeholder="Ex.: alergias, turno preferido…" /></Field>
                  </div>
                </div>
              ))}
              {!maxed ? (
                <button onClick={() => setAlunos((c) => [...c, emptyAluno()])}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: "var(--radius-md)",
                    border: "1.5px dashed var(--color-primary)", background: "transparent", color: "var(--color-primary)", cursor: "pointer",
                    fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700 }}>
                  <Icon name="plus" size={17} />Adicionar aluno</button>
              ) : (
                <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  <Icon name="info" size={15} color="var(--color-text-subtle)" style={{ flexShrink: 0, marginTop: 1 }} />
                  Máximo de 5 alunos por matrícula. Para mais alunos, crie uma nova matrícula.</div>
              )}
            </div>
          </Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button variant="tertiary" iconLeft="arrow-left" onClick={() => setStep(0)}>Voltar</Button>
            <Button size="lg" iconRight="arrow-right" disabled={!alunosOk} onClick={() => setStep(2)}>Continuar</Button>
          </div>
        </>
        )}

        {/* ═══ Passo 3 — Matérias, plano e desconto (por aluno) ═══ */}
        {stepId === "Matérias e plano" && (
        <>
          {alunosEfetivos.map((a, i) => (
            <Card key={i} style={{ padding: 24 }}>
              <SectionHead title={selfPayer ? `${g.nome || "Aluno"} (o próprio responsável)` : (a.nome || `Aluno ${i + 1}`)}
                sub="Todas as matérias deste aluno usam o mesmo plano" />
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted-strong)", display: "block", marginBottom: 10 }}>Matérias</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                    {MATERIAS.map(([m, c]) => (
                      <Chip key={m} label={m} color={c} active={a.materias.includes(m)} onClick={() => toggleMat(selfPayer ? 0 : i, m)} />
                    ))}
                  </div>
                  {a.materias.length === 0 && <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 8 }}>Selecione ao menos uma matéria.</div>}
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted-strong)", display: "block", marginBottom: 10 }}>Plano <span style={{ fontWeight: 400, color: "var(--color-text-subtle)" }}>· valor sempre por mês</span></label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <Segmented key={a.plano + i} value={a.plano} onChange={(v) => setAluno(selfPayer ? 0 : i, "plano", v)} options={PLANOS.map((p) => p.nome)} size="sm" />
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>Valor de tabela</div>
                      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(planoDe(a).parcela)}<span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-text-subtle)" }}>/mês por matéria</span></div>
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--color-border-muted)", paddingTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: a.desconto ? 14 : 0 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>Desconto (opcional)</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 2 }}>Por aluno — só existe no fluxo assistido</div>
                    </div>
                    <Toggle checked={!!a.desconto} onChange={(v) => { setAluno(selfPayer ? 0 : i, "desconto", v); setAluno(selfPayer ? 0 : i, "descontoVal", "0"); }} />
                  </div>
                  {a.desconto && (
                    <>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Segmented key={a.descontoTipo + i} value={a.descontoTipo} onChange={(v) => setAluno(selfPayer ? 0 : i, "descontoTipo", v)}
                          options={[{ value: "percent", label: "%" }, { value: "fixed", label: "R$" }]} size="sm" />
                        <Input value={a.descontoVal} onChange={(e) => setAluno(selfPayer ? 0 : i, "descontoVal", e.target.value)} inputMode="decimal"
                          error={!!descErr(a)}
                          leadingIcon={a.descontoTipo === "fixed" ? "circle-dollar-sign" : undefined}
                          trailing={a.descontoTipo === "percent" ? <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted)" }}>%</span> : null}
                          style={{ flex: 1 }} placeholder={a.descontoTipo === "percent" ? "10" : "50,00"} />
                      </div>
                      {descErr(a) && <div style={{ fontSize: 12.5, color: "var(--color-danger-primary)", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="alert-circle" size={13} />{descErr(a)}</div>}
                      <div style={{ marginTop: 12, fontSize: 14, color: "var(--color-text-muted)" }}>
                        De <s style={{ color: "var(--color-text-subtle)" }}>{brl(planoDe(a).parcela)}</s> por <strong style={{ color: "var(--color-primary)", fontSize: 15 }}>{brl(finalPorMateria(a))}/mês</strong> por matéria
                        <span style={{ fontSize: 12, color: "var(--color-text-subtle)" }}> · valor final é recalculado e auditado no servidor</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}

          <Card style={{ padding: 20, background: "var(--color-primary)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>Total mensal da matrícula</div>
              <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 2 }}>{alunosEfetivos.length} aluno{alunosEfetivos.length > 1 ? "s" : ""} · {alunosEfetivos.reduce((s, a) => s + a.materias.length, 0)} mensalidade{alunosEfetivos.reduce((s, a) => s + a.materias.length, 0) !== 1 ? "s" : ""} · descontos aplicados</div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(totalMensal)}<span style={{ fontSize: 14, fontWeight: 500, opacity: 0.85 }}>/mês</span></div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button variant="tertiary" iconLeft="arrow-left" onClick={() => setStep(selfPayer ? 0 : 1)}>Voltar</Button>
            <Button size="lg" iconRight="arrow-right" disabled={!planosOk} onClick={() => setStep(selfPayer ? 2 : 3)}>Revisar</Button>
          </div>
        </>
        )}

        {/* ═══ Passo 4 — Revisão ═══ */}
        {stepId === "Revisão" && (
        <>
          <Card style={{ padding: 24 }}>
            <SectionHead title="Responsável financeiro" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px 24px", fontSize: 14 }}>
              {[["Nome", g.nome], ["CPF", maskCpf(g.cpf)], ["E-mail", g.email], ["Celular", g.tel], ["Tipo", TIPO_LABEL[g.tipo] || "—"],
                ...(selfPayer ? [["Pagante", "O próprio aluno (selfPayer)"]] : [])].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginBottom: 2 }}>{k}</div>
                  <div style={{ fontWeight: 600 }}>{v || "—"}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 4px" }}><SectionHead title="Matrículas" sub="Matéria, plano e valor não são mais editáveis aqui — volte aos passos para ajustar" /></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr style={{ background: "var(--color-surface)" }}>
                    {["Aluno", "Matéria", "Plano", "Tabela", "Desconto", "Final/mês"].map((h, hi) => (
                      <th key={h} style={{ textAlign: hi >= 3 ? "right" : "left", padding: "10px 16px", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase",
                        letterSpacing: "0.06em", color: "var(--color-text-subtle)", borderBottom: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alunosEfetivos.flatMap((a, i) => a.materias.map((m) => (
                    <tr key={i + m} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                      <td style={{ padding: "11px 16px", fontSize: 14, fontWeight: 600 }}>{a.nome || `Aluno ${i + 1}`}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13.5, color: "var(--color-text-muted)" }}>{m}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13.5, color: "var(--color-text-muted)" }}>{a.plano}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13.5, textAlign: "right", color: "var(--color-text-muted)" }}>{brl(planoDe(a).parcela)}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13.5, textAlign: "right", color: descValor(a) ? "var(--badge-success-fg)" : "var(--color-text-subtle)" }}>{descValor(a) ? "− " + brl(descValor(a)) : "—"}</td>
                      <td style={{ padding: "11px 16px", fontSize: 14, textAlign: "right", fontWeight: 700 }}>{brl(finalPorMateria(a))}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", background: "var(--color-primary-softer)" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted)" }}>Total mensal</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary)" }}>{brl(totalMensal)}/mês</span>
            </div>
          </Card>

          <Card style={{ padding: 16, display: "flex", gap: 11, alignItems: "flex-start", background: "var(--color-toast-info-bg)", border: "1px solid var(--color-primary-soft)" }}>
            <Icon name="info" size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
              Nos dois caminhos a matrícula ainda passa pela <strong style={{ color: "var(--color-text)" }}>aprovação da escola</strong> antes de ficar ativa. O cadastro de cobrança (Asaas) só é criado na aprovação.</span>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <Button variant="tertiary" iconLeft="arrow-left" onClick={() => setStep(selfPayer ? 1 : 2)}>Voltar</Button>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="secondary" iconLeft="user-check" disabled={enviando} onClick={() => setConfirmarModal(true)}>Confirmar agora (responsável presente)</Button>
              <Button size="lg" iconLeft="send" disabled={enviando} onClick={() => enviar(false)}>{enviando ? "Enviando…" : "Enviar link ao responsável"}</Button>
            </div>
          </div>
        </>
        )}
      </div>

      {/* modal — confirmação presencial */}
      <Modal open={confirmarModal} onClose={() => setConfirmarModal(false)}>
        <div style={{ padding: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="user-check" size={22} color="var(--color-primary)" /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Confirmar presencialmente?</h3>
          <p style={{ margin: "8px 0 16px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            Você confirma <strong style={{ color: "var(--color-text)" }}>em nome de {g.nome || "o responsável"}</strong>, que está presente na unidade.
            Registramos a nota "confirmado presencialmente" com seu IP e horário.</p>
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", fontSize: 12.5, color: "var(--color-text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
            A matrícula segue para a aprovação da escola — não fica ativa neste clique.</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setConfirmarModal(false)}>Cancelar</Button>
            <Button iconLeft="check" disabled={enviando} onClick={() => enviar(true)}>{enviando ? "Registrando…" : "Confirmar agora"}</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};

/* ── FlowConfirm — o responsável recebe a matrícula PRÉ-PREENCHIDA (/m/confirmar/[token]) ──
 * Dados pessoais editáveis (sobrescrevem o orientador) · matéria/plano/valor travados (R13)
 * Token 72h → estado "link expirado" disponível na demonstração */
const FlowConfirm = ({ exit }) => {
  const [step, setStep] = useState(0); // 0 = revisar/aceitar, 1 = enviado p/ aprovação
  const [expirado, setExpirado] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [verContrato, setVerContrato] = useState(false);
  const [resp, setResp] = useState({ nome: "Maria Silva", cpf: "123.456.789-00", email: "maria.silva@email.com", tel: "(31) 98765-4321" });
  const [alunoNome, setAlunoNome] = useState("João Silva");
  const [alunoNasc, setAlunoNasc] = useState("14/03/2015");
  const setR = (k) => (e) => setResp((c) => ({ ...c, [k]: e.target.value }));

  const travados = [
    ["Matérias", "Matemática, Português"],
    ["Plano", "Mensal · " + brl(450) + "/mês por matéria"],
    ["Valor mensal", brl(900) + "/mês"],
    ["Vencimento", "Todo dia 10"],
  ];

  const body = expirado ? (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <MBrandBar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 26px", textAlign: "center" }}>
        <div style={{ width: 76, height: 76, margin: "0 auto 22px", borderRadius: "50%", background: "var(--badge-warning-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="hourglass" size={36} color="var(--badge-warning-fg)" /></div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Esse link expirou</h1>
        <p style={{ margin: "12px 0 0", fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
          O link de confirmação vale por <strong style={{ color: "var(--color-text)" }}>72 horas</strong>. Fale com a secretaria da Kumon Camargos para receber um novo.</p>
      </div>
      <div style={{ padding: "12px 18px 44px" }}>
        <Button variant="secondary" size="lg" block iconLeft="rotate-ccw" onClick={() => setExpirado(false)}>Voltar à demonstração</Button>
      </div>
    </div>
  ) : step === 0 ? (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <div style={{ padding: "50px 18px 14px", background: "var(--color-primary)", color: "#fff" }}>
        <Logo size={17} light />
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Kumon Camargos enviou</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 2 }}>Confirme sua matrícula</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 18 }}>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          A escola já preencheu tudo. Confira e ajuste <strong style={{ color: "var(--color-text)" }}>seus dados</strong>, leia o contrato e dê o aceite.</p>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 8 }}>
          <div style={{ padding: "9px 14px", background: "var(--color-surface)", display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, color: "var(--color-text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <Icon name="lock" size={12} />Definido pela escola</div>
          {travados.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", fontSize: 14, borderTop: "1px solid var(--color-border-muted)" }}>
              <span style={{ color: "var(--color-text-subtle)" }}>{k}</span>
              <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>
          Matéria, plano e valor foram combinados com a secretaria e não podem ser alterados aqui.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Seus dados — pode corrigir</div>
          <Field label="Nome"><Input value={resp.nome} onChange={setR("nome")} leadingIcon="user" /></Field>
          <Field label="CPF"><Input value={resp.cpf} onChange={setR("cpf")} inputMode="numeric" /></Field>
          <Field label="E-mail"><Input value={resp.email} onChange={setR("email")} type="email" leadingIcon="mail" /></Field>
          <Field label="Celular (WhatsApp)"><Input value={resp.tel} onChange={setR("tel")} inputMode="tel" leadingIcon="phone" /></Field>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>Dados do aluno</div>
          <Field label="Nome do aluno"><Input value={alunoNome} onChange={(e) => setAlunoNome(e.target.value)} leadingIcon="graduation-cap" /></Field>
          <Field label="Data de nascimento"><Input value={alunoNasc} onChange={(e) => setAlunoNasc(e.target.value)} inputMode="numeric" leadingIcon="calendar" /></Field>
        </div>
        <button onClick={() => setVerContrato(!verContrato)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderRadius: "var(--radius-md)", border: `1px solid ${verContrato ? "var(--color-primary)" : "var(--color-border)"}`, background: "var(--color-surface)",
          cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="file-signature" size={15} color="var(--color-primary)" />Ler o contrato da Kumon Camargos</span>
          <Icon name={verContrato ? "chevron-up" : "chevron-down"} size={16} />
        </button>
        {verContrato && (
          <div style={{ padding: 14, fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.6, background: "var(--color-surface)", borderRadius: "var(--radius-md)", marginTop: 8, maxHeight: 150, overflowY: "auto", animation: "ex-fade 200ms ease" }}>
            <strong>Contrato de prestação de serviços educacionais — Kumon Camargos.</strong> O responsável autoriza a cobrança recorrente da mensalidade do plano. Atraso: multa de 2% + juros de 1% ao mês. Cancelamento com 30 dias de aviso. Dados tratados conforme a LGPD. Nota fiscal emitida a cada pagamento. Documento enviado pela unidade.
          </div>
        )}
        <div style={{ marginTop: 16, padding: 14, borderRadius: "var(--radius-md)", border: `1.5px solid ${aceito ? "var(--color-primary)" : "var(--color-border)"}`, background: aceito ? "var(--color-primary-softer)" : "var(--color-bg)", transition: "all 140ms" }}>
          <Checkbox checked={aceito} onChange={setAceito}>Li e aceito o contrato de matrícula da Kumon Camargos.</Checkbox>
        </div>
      </div>
      <div style={{ padding: "12px 18px 44px", borderTop: "1px solid var(--color-border-muted)" }}>
        <Button block size="lg" disabled={!aceito} iconRight="send" onClick={() => setStep(1)}>Confirmar matrícula</Button>
      </div>
    </div>
  ) : (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <div style={{ padding: "50px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><Logo size={17} /></div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
        <div style={{ width: 84, height: 84, margin: "0 auto 24px", borderRadius: "50%", background: "var(--badge-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", animation: "ex-scale-in 360ms ease" }}>
          <Icon name="check" size={40} color="var(--badge-success-fg)" strokeWidth={2.6} /></div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Confirmado!</h1>
        <p style={{ margin: "14px 0 0", fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
          A <strong style={{ color: "var(--color-text)" }}>Kumon Camargos</strong> vai revisar e aprovar em breve. Você recebe um aviso assim que a matrícula do {alunoNome.split(" ")[0]} for aprovada.</p>
        <div style={{ margin: "22px auto 0", display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999,
          background: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)", fontSize: 13, fontWeight: 700 }}>
          <Icon name="clock" size={15} />Aguardando aprovação da escola
        </div>
      </div>
      <div style={{ padding: "12px 18px 44px" }}>
        <Button variant="secondary" size="lg" block iconLeft="rotate-ccw" onClick={() => { setStep(0); setAceito(false); }}>Recomeçar</Button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-text-subtle)" }}>
        <Icon name="smartphone" size={16} />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Confirmação da matrícula · celular da Maria</span>
      </div>
      <IOSDevice>{body}</IOSDevice>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={exit} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999,
          border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          <Icon name="arrow-left" size={15} />Voltar ao protótipo</button>
        <button onClick={() => { setExpirado(!expirado); setStep(0); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999,
          border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          <Icon name="hourglass" size={15} />{expirado ? "Ver link válido" : "Simular link expirado (72h)"}</button>
      </div>
    </div>
  );
};

window.C6NovaMatricula = C6NovaMatricula;
window.FlowConfirm = FlowConfirm;
window.Row2c = Row2c;
window.maskCpf = maskCpf;

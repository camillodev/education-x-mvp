/* Flow B — Matrícula via link (responsável, mobile) · conciliado com DH-f1 (campo a campo)
 * B1 boas-vindas · B2 seus dados (5 campos + tipo) · B3 alunos (até 5, matérias por aluno)
 * B4 plano (1 por matrícula, valor sempre /mês, resumo consolidado) · B5 aceite · B6 enviado */

const MBrandBar = () => (
  <div style={{ padding: "50px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <Logo size={17} />
    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 5 }}>
      <Icon name="shield-check" size={14} color="var(--badge-success-fg)" />Seguro
    </span>
  </div>
);

const MProgress = ({ step }) => (
  <div style={{ display: "flex", gap: 6, padding: "0 18px 14px" }}>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, transition: "background 200ms",
        background: i <= step ? "var(--color-primary)" : "var(--color-border)" }} />
    ))}
  </div>
);

// Mobile screen scaffold: brand bar + (progress) + scroll body + sticky footer
const MScreen = ({ step, onBack, body, footer }) => (
  <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
    <div style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--color-bg)", paddingTop: 4 }}>
      <MBrandBar />
      {step != null && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px 10px" }}>
            {onBack && <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--color-border)",
              background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-muted)" }}>
              <Icon name="arrow-left" size={17} /></button>}
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-subtle)" }}>Passo {step + 1} de 4</span>
          </div>
          <MProgress step={step} />
        </>
      )}
    </div>
    <div style={{ flex: 1, padding: "4px 18px 16px" }}>{body}</div>
    <div style={{ position: "sticky", bottom: 0, background: "var(--color-bg)", padding: "12px 18px 44px",
      borderTop: "1px solid var(--color-border-muted)", boxShadow: "0 -4px 16px -8px rgba(0,0,0,0.1)" }}>{footer}</div>
  </div>
);

const MField = ({ label, hint, error, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
    <label style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted-strong)" }}>{label}</label>
    {children}
    {error
      ? <span style={{ fontSize: 12, color: "var(--color-danger-primary)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="alert-circle" size={13} />{error}</span>
      : hint && <span style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>{hint}</span>}
  </div>
);

/* ── validações client-side (formato) — o servidor sempre revalida ── */
const bOnlyDigits = (s) => (s || "").replace(/\D/g, "");
const bValidCpf = (s) => bOnlyDigits(s).length === 11;
const bValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");
const bValidFone = (s) => bOnlyDigits(s).length === 11;
const bValidNome = (s) => (s || "").trim().length >= 3 && (s || "").trim().includes(" ");
const bValidData = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(s || "");

const B_MATERIAS = [["Matemática", "var(--color-primary)"], ["Português", "#FCC000"], ["Inglês", "#E42618"], ["Japonês", "#83B81A"]];
const B_TIPOS = [{ value: "MOTHER", label: "Mãe" }, { value: "FATHER", label: "Pai" }, { value: "LEGAL_GUARDIAN", label: "Responsável legal" }];

const FlowB = ({ exit }) => {
  const [step, setStep] = useState(-1); // -1=welcome, 0..3 steps, 4=sent
  const [g, setG] = useState({ nome: "Maria Silva", cpf: "123.456.789-00", email: "maria.silva@email.com", tel: "(31) 98765-4321", tipo: "MOTHER" });
  const [touched, setTouched] = useState({});
  const emptyAluno = () => ({ nome: "", nascimento: "", materias: [] });
  const [alunos, setAlunos] = useState([{ nome: "João Silva", nascimento: "14/03/2015", materias: ["Matemática", "Português"] }]);
  const [tried3, setTried3] = useState(false);
  const [plano, setPlano] = useState(null);
  const [aceito, setAceito] = useState(false);
  const [showTermos, setShowTermos] = useState(false);
  const planoObj = PLANOS.find((p) => p.id === plano);

  const setGF = (k) => (e) => setG({ ...g, [k]: e.target.value });
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  // B2 — erros por campo (exibidos após blur; botão bloqueado enquanto houver inválido)
  const gErr = {
    nome: !bValidNome(g.nome) && "Digite seu nome completo.",
    cpf: !bValidCpf(g.cpf) && "CPF inválido. Confira os números.",
    email: !bValidEmail(g.email) && "Digite um e-mail válido.",
    tel: !bValidFone(g.tel) && "Digite um celular válido, com DDD.",
    tipo: !g.tipo && "Selecione o tipo de responsável",
  };
  const gOk = !gErr.nome && !gErr.cpf && !gErr.email && !gErr.tel && !gErr.tipo;

  // B3 — validação por bloco de aluno
  const setAluno = (i, k, v) => setAlunos((cur) => cur.map((a, j) => (j === i ? { ...a, [k]: v } : a)));
  const toggleMat = (i, m) => setAlunos((cur) => cur.map((a, j) => (j === i ? { ...a, materias: a.materias.includes(m) ? a.materias.filter((x) => x !== m) : [...a.materias, m] } : a)));
  const alunoErr = (a) => ({
    nome: (a.nome || "").trim().length < 2 && "Digite o nome do aluno.",
    nascimento: !bValidData(a.nascimento) && "Verifique a data de nascimento.",
    materias: a.materias.length === 0 && `Selecione ao menos uma matéria${a.nome ? ` para ${a.nome.split(" ")[0]}` : ""}.`,
  });
  const alunosOk = alunos.every((a) => { const e = alunoErr(a); return !e.nome && !e.nascimento && !e.materias; });
  const maxed = alunos.length >= 5;
  const totalMensalidades = alunos.reduce((s, a) => s + a.materias.length, 0);

  let content;

  if (step === -1) {
    // B1 — Boas-vindas (rota /m/[token] — 100% leitura)
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <MBrandBar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, margin: "0 auto 22px", borderRadius: 20, background: "var(--color-primary-soft)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="graduation-cap" size={36} color="var(--color-primary)" />
          </div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Matrícula · Kumon Camargos</div>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Vamos matricular<br />o João</h1>
          <p style={{ margin: "14px 0 0", fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            Leva menos de 5 minutos. Seus dados ficam seguros e a escola confirma a matrícula em seguida.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26, textAlign: "left" }}>
            {[["smartphone", "Tudo pelo celular"], ["lock", "Dados protegidos"], ["file-check", "Boleto e nota fiscal de verdade"]].map(([ic, t]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14.5, color: "var(--color-text-muted-strong)" }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}><Icon name={ic} size={17} /></span>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ padding: "12px 18px 44px" }}>
          <Button size="lg" block iconRight="arrow-right" onClick={() => setStep(0)}>Começar matrícula</Button>
          <button onClick={exit} style={{ width: "100%", marginTop: 10, padding: 8, border: "none", background: "transparent",
            color: "var(--color-text-subtle)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Sair da demonstração</button>
        </div>
      </div>
    );
  } else if (step === 0) {
    // B2 — Seus dados (5 campos obrigatórios)
    content = (
      <MScreen step={0} onBack={() => setStep(-1)}
        footer={<Button size="lg" block iconRight="arrow-right" disabled={!gOk} onClick={() => setStep(1)}>Continuar</Button>}
        body={<>
          <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" }}>Seus dados</h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Você é o responsável financeiro pela matrícula.</p>
          <MField label="Nome completo" error={touched.nome && gErr.nome}>
            <Input value={g.nome} onChange={setGF("nome")} onBlur={blur("nome")} error={!!(touched.nome && gErr.nome)} /></MField>
          <MField label="CPF" error={touched.cpf && gErr.cpf}>
            <Input value={g.cpf} onChange={setGF("cpf")} onBlur={blur("cpf")} error={!!(touched.cpf && gErr.cpf)} placeholder="000.000.000-00" inputMode="numeric" leadingIcon="user" /></MField>
          <MField label="E-mail" hint="É onde você vai receber os boletos." error={touched.email && gErr.email}>
            <Input value={g.email} onChange={setGF("email")} onBlur={blur("email")} error={!!(touched.email && gErr.email)} type="email" leadingIcon="mail" /></MField>
          <MField label="Celular (WhatsApp)" hint="Usamos para avisos importantes por WhatsApp." error={touched.tel && gErr.tel}>
            <Input value={g.tel} onChange={setGF("tel")} onBlur={blur("tel")} error={!!(touched.tel && gErr.tel)} placeholder="(00) 00000-0000" inputMode="tel" leadingIcon="phone" /></MField>
          <MField label="Você é" error={touched.tipo && gErr.tipo}>
            <Segmented key={g.tipo} value={g.tipo} onChange={(v) => setG({ ...g, tipo: v })} options={B_TIPOS} size="sm" /></MField>
        </>} />
    );
  } else if (step === 1) {
    // B3 — Dados do(s) aluno(s) — até 5, matérias por aluno
    content = (
      <MScreen step={1} onBack={() => setStep(0)}
        footer={<Button size="lg" block iconRight="arrow-right" disabled={!alunosOk} onClick={() => setStep(2)}>Próximo</Button>}
        body={<>
          <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" }}>{alunos.length > 1 ? "Dados dos alunos" : "Dados do aluno"}</h2>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--color-text-muted)" }}>Quem vai estudar na unidade. Cada aluno escolhe as próprias matérias.</p>
          {alunos.map((a, i) => {
            const err = alunoErr(a);
            const show = tried3 || touched["a" + i];
            return (
              <div key={i} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aluno {i + 1}</span>
                  {alunos.length > 1 && (
                    <button onClick={() => setAlunos((c) => c.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                      <Icon name="trash-2" size={14} />Remover</button>
                  )}
                </div>
                <MField label="Nome do aluno" error={show && err.nome}>
                  <Input value={a.nome} onChange={(e) => setAluno(i, "nome", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, ["a" + i]: true }))} error={!!(show && err.nome)} leadingIcon="user" /></MField>
                <MField label="Data de nascimento" error={show && err.nascimento}>
                  <Input value={a.nascimento} onChange={(e) => setAluno(i, "nascimento", e.target.value)} error={!!(show && err.nascimento)} placeholder="DD/MM/AAAA" inputMode="numeric" leadingIcon="calendar" /></MField>
                <div>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted-strong)", display: "block", marginBottom: 10 }}>Matérias</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                    {B_MATERIAS.map(([m, c]) => (
                      <Chip key={m} label={m} color={c} active={a.materias.includes(m)} onClick={() => toggleMat(i, m)} />
                    ))}
                  </div>
                  {show && err.materias && <div style={{ fontSize: 12, color: "var(--color-danger-primary)", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="alert-circle" size={13} />{err.materias}</div>}
                </div>
              </div>
            );
          })}
          {!maxed ? (
            <button onClick={() => { setTried3(true); if (alunosOk) setAlunos((c) => [...c, emptyAluno()]); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: "var(--radius-md)",
                border: "1.5px dashed var(--color-primary)", background: "transparent", color: "var(--color-primary)", cursor: "pointer",
                fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700 }}>
              <Icon name="plus" size={16} />Adicionar outro aluno
            </button>
          ) : (
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              <Icon name="info" size={15} color="var(--color-text-subtle)" style={{ flexShrink: 0, marginTop: 1 }} />
              Máximo de 5 alunos por matrícula. Para mais alunos, crie uma nova matrícula.
            </div>
          )}
        </>} />
    );
  } else if (step === 2) {
    // B4 — Escolha o plano (1 plano para a matrícula toda; valor sempre /mês; só planos com preço)
    content = (
      <MScreen step={2} onBack={() => setStep(1)}
        footer={<Button size="lg" block iconRight="arrow-right" disabled={!planoObj} onClick={() => setStep(3)}>Próximo</Button>}
        body={<>
          <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" }}>Escolha o plano</h2>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--color-text-muted)" }}>O período é o compromisso do contrato — o valor é sempre por mês.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {PLANOS.map((p) => {
              const active = plano === p.id;
              return (
                <button key={p.id} onClick={() => setPlano(p.id)} style={{ textAlign: "left", padding: "15px 16px", borderRadius: "var(--radius-md)",
                  border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-input)"}`, background: active ? "var(--color-primary-softer)" : "var(--color-bg)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 140ms" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-input)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {active && <span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--color-primary)" }} />}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 700 }}>{p.nome}</span>
                      {p.badge && <Badge variant={p.id === "anual" ? "success" : "primary"} size="sm">{p.badge}</Badge>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-text-subtle)", marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{brl(p.parcela)}</div>
                    <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)" }}>/mês por matéria</div>
                  </div>
                </button>
              );
            })}
          </div>
          {!planoObj && <div style={{ fontSize: 13, color: "var(--color-text-subtle)", textAlign: "center", marginBottom: 8 }}>Escolha um plano para continuar.</div>}
          {planoObj && (
            <div style={{ padding: 18, borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "#fff" }}>
              <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>
                {alunos.length} aluno{alunos.length > 1 ? "s" : ""} × {totalMensalidades} matéria{totalMensalidades > 1 ? "s" : ""}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(planoObj.parcela * totalMensalidades)}</span>
                <span style={{ fontSize: 14, opacity: 0.85 }}>/mês</span>
              </div>
              {planoObj.id !== "mensal" && (() => {
                const mensal = PLANOS.find((p) => p.id === "mensal");
                const economia = (mensal.parcela - planoObj.parcela) * totalMensalidades * planoObj.meses;
                return <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name="tag" size={13} />Você economiza {brl(economia)} vs. plano mensal</div>;
              })()}
            </div>
          )}
        </>} />
    );
  } else if (step === 3) {
    // B5 — Quase lá (resumo + contrato + aceite obrigatório)
    content = (
      <MScreen step={3} onBack={() => setStep(2)}
        footer={<Button size="lg" block disabled={!aceito} iconRight="send" onClick={() => setStep(4)}>Enviar matrícula</Button>}
        body={<>
          <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" }}>Quase lá</h2>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--color-text-muted)" }}>Revise o resumo e aceite o contrato para enviar.</p>
          <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 16 }}>
            {[
              ...alunos.map((a, i) => [alunos.length > 1 ? `Aluno ${i + 1}` : "Aluno", `${a.nome} · ${a.materias.join(", ")}`]),
              ["Plano", planoObj ? `${planoObj.nome} · ${brl(planoObj.parcela)}/mês por matéria` : "—"],
              ["Total mensal", planoObj ? `${brl(planoObj.parcela * totalMensalidades)}/mês` : "—"],
              ["Vencimento", "Todo dia 10"],
            ].map(([k, v], i, arr) => (
              <div key={k + i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", fontSize: 14,
                borderBottom: i < arr.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}>
                <span style={{ color: "var(--color-text-subtle)", flexShrink: 0 }}>{k}</span>
                <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "65%" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
            {[["Cobrança automática todo mês via PIX ou boleto", "repeat"], ["Atraso: multa de 2% + juros de 1% ao mês", "alert-triangle"], ["Cancelamento com 30 dias de aviso", "calendar-x"]].map(([t, ic]) => (
              <div key={t} style={{ display: "flex", gap: 10, fontSize: 13.5, color: "var(--color-text-muted-strong)", alignItems: "center" }}>
                <Icon name={ic} size={16} color="var(--color-primary)" />{t}</div>
            ))}
          </div>
          <button onClick={() => setShowTermos(!showTermos)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: "var(--radius-md)", border: `1px solid ${showTermos ? "var(--color-primary)" : "var(--color-border)"}`, background: "var(--color-surface)",
            cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="file-signature" size={15} color="var(--color-primary)" />Ler o contrato da Kumon Camargos</span>
            <Icon name={showTermos ? "chevron-up" : "chevron-down"} size={16} />
          </button>
          {showTermos && (
            <div style={{ padding: 14, fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.6, background: "var(--color-surface)",
              borderRadius: "var(--radius-md)", marginTop: 8, maxHeight: 160, overflowY: "auto", animation: "ex-fade 200ms ease" }}>
              <strong>Contrato de prestação de serviços educacionais — Kumon Camargos.</strong> O responsável autoriza a cobrança recorrente da mensalidade do plano escolhido. Em caso de atraso, incidem multa de 2% e juros de 1% ao mês sobre o valor devido. O cancelamento pode ser solicitado a qualquer tempo, com aviso prévio de 30 dias. Os dados pessoais são tratados conforme a LGPD. A escola emitirá nota fiscal de serviço a cada pagamento confirmado. Documento personalizado anexado pela unidade.
            </div>
          )}
          <div style={{ marginTop: 16, padding: 14, borderRadius: "var(--radius-md)", border: `1.5px solid ${aceito ? "var(--color-primary)" : "var(--color-border)"}`,
            background: aceito ? "var(--color-primary-softer)" : "var(--color-bg)", transition: "all 140ms" }}>
            <Checkbox checked={aceito} onChange={setAceito}>Li e aceito o contrato de matrícula da Kumon Camargos.</Checkbox>
          </div>
        </>} />
    );
  } else {
    // B6 — Enviado (status = PENDING_SCHOOL_APPROVAL → "aguardando aprovação da escola")
    content = (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <MBrandBar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
          <div style={{ width: 84, height: 84, margin: "0 auto 24px", borderRadius: "50%", background: "var(--badge-success-bg)",
            display: "flex", alignItems: "center", justifyContent: "center", animation: "ex-scale-in 360ms ease" }}>
            <Icon name="check" size={44} color="var(--badge-success-fg)" strokeWidth={3} />
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Matrícula enviada!</h1>
          <p style={{ margin: "14px 0 0", fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            A <strong style={{ color: "var(--color-text)" }}>Kumon Camargos</strong> vai revisar e confirmar em breve. Você recebe um aviso assim que for aprovada.</p>
          <div style={{ margin: "22px auto 0", display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999,
            background: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)", fontSize: 13, fontWeight: 700 }}>
            <Icon name="clock" size={15} />Aguardando aprovação da escola
          </div>
        </div>
        <div style={{ padding: "12px 18px 44px" }}>
          <Button variant="secondary" size="lg" block iconLeft="rotate-ccw" onClick={() => { setStep(-1); setAceito(false); setPlano(null); }}>Recomeçar demonstração</Button>
          <button onClick={exit} style={{ width: "100%", marginTop: 10, padding: 8, border: "none", background: "transparent",
            color: "var(--color-text-subtle)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Voltar ao início</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-text-subtle)" }}>
        <Icon name="smartphone" size={16} />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Matrícula via link · aberto no celular da Maria</span>
      </div>
      <IOSDevice>{content}</IOSDevice>
      <button onClick={exit} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999,
        border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-muted)",
        fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
        <Icon name="arrow-left" size={15} />Voltar ao protótipo
      </button>
    </div>
  );
};

window.FlowB = FlowB;
window.MScreen = MScreen;
window.MField = MField;
window.MBrandBar = MBrandBar;

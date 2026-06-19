/* C6 — Nova matrícula preenchida pela escola → envia ao pai p/ confirmar + aceitar.
 * Para escolas com processo interno próprio de matrícula. */

const Row2c = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>;

const C6NovaMatricula = ({ go, toast }) => {
  const emptyAluno = () => ({ nome: "", nascimento: "", materias: ["Matemática"] });
  const [f, setF] = useState({
    pagante: "", cpf: "", email: "", tel: "",
    temEndereco: false, cep: "", rua: "", numero: "", cidade: "",
    alunos: [emptyAluno()],
    plano: "Mensal", descontoTipo: "percent", descontoVal: "0", vencimento: "10",
  });
  const [tab, setTab] = useState(0);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const setAluno = (i, key, value) => setF((cur) => ({ ...cur, alunos: cur.alunos.map((a, idx) => idx === i ? { ...a, [key]: value } : a) }));
  const toggleMatAluno = (i, m) => setF((cur) => ({ ...cur, alunos: cur.alunos.map((a, idx) => idx === i ? { ...a, materias: a.materias.includes(m) ? a.materias.filter((x) => x !== m) : [...a.materias, m] } : a) }));
  const addAluno = () => setF((cur) => cur.alunos.length >= 5 ? cur : { ...cur, alunos: [...cur.alunos, emptyAluno()] });
  const removeAluno = (i) => setF((cur) => ({ ...cur, alunos: cur.alunos.filter((_, idx) => idx !== i) }));

  const planoObj = PLANOS.find((p) => p.nome === f.plano) || PLANOS[0];
  const planoMensal = PLANOS.find((p) => p.id === "mensal") || PLANOS[0];
  const nAlunos = f.alunos.length;
  const baseMensal = planoMensal.parcela;
  const comPlano = planoObj.parcela;
  const descNum = parseFloat((f.descontoVal || "0").replace(/\./g, "").replace(",", ".")) || 0;
  const descValor = f.descontoTipo === "percent" ? comPlano * descNum / 100 : descNum;
  const totalMensal = Math.max(0, comPlano - descValor);
  const economiaAnual = Math.max(0, (baseMensal - totalMensal) * 12);
  const maxed = f.alunos.length >= 5;
  const cadastroOk = f.pagante && f.email && f.alunos.every((a) => a.nome);

  return (
    <Shell screen="c6" go={go} back={() => go("c1")} title="Nova matrícula" subtitle="Preencha os dados — o responsável só confirma e dá o aceite" maxWidth={760}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ overflowX: "auto", paddingBottom: 2 }}>
          <Segmented key={tab} value={String(tab)} onChange={(v) => setTab(Number(v))}
            options={[{ value: "0", label: "1 · Cadastro" }, { value: "1", label: "2 · Plano e cobrança" }]} />
        </div>

        {tab === 0 && (
        <>
          <Card style={{ padding: 16, display: "flex", gap: 11, alignItems: "center", background: "var(--color-toast-info-bg)", border: "1px solid var(--color-primary-soft)" }}>
            <Icon name="info" size={18} color="var(--color-primary)" />
            <span style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              Tem processo de matrícula próprio? Cadastre aqui e envie ao pai só para <strong style={{ color: "var(--color-text)" }}>confirmar e aceitar</strong> — sem ele preencher nada.</span>
          </Card>

          <Card style={{ padding: 24 }}>
            <SectionHead title="Responsável financeiro" sub="Quem recebe o link e autoriza a cobrança" />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Row2c>
                <Field label="Nome" required><Input value={f.pagante} onChange={set("pagante")} placeholder="Ex.: Maria Silva" leadingIcon="user" /></Field>
                <Field label="CPF"><Input value={f.cpf} onChange={set("cpf")} placeholder="000.000.000-00" inputMode="numeric" /></Field>
              </Row2c>
              <Row2c>
                <Field label="E-mail" required hint="Recebe o link de confirmação"><Input value={f.email} onChange={set("email")} type="email" placeholder="email@exemplo.com" leadingIcon="mail" /></Field>
                <Field label="Celular (WhatsApp)"><Input value={f.tel} onChange={set("tel")} inputMode="tel" placeholder="(31) 90000-0000" leadingIcon="phone" /></Field>
              </Row2c>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 2 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>Adicionar endereço</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 2 }}>Opcional — usado na nota fiscal e no contrato</div>
                </div>
                <Toggle checked={f.temEndereco} onChange={(v) => setF({ ...f, temEndereco: v })} />
              </div>
              {f.temEndereco && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "ex-fade 200ms ease" }}>
                  <Row2c>
                    <Field label="CEP"><Input value={f.cep} onChange={set("cep")} placeholder="00000-000" inputMode="numeric" leadingIcon="map-pin" /></Field>
                    <Field label="Cidade"><Input value={f.cidade} onChange={set("cidade")} placeholder="Belo Horizonte" /></Field>
                  </Row2c>
                  <Row2c>
                    <Field label="Rua"><Input value={f.rua} onChange={set("rua")} placeholder="Av. Exemplo" /></Field>
                    <Field label="Número"><Input value={f.numero} onChange={set("numero")} placeholder="123" inputMode="numeric" /></Field>
                  </Row2c>
                </div>
              )}
            </div>
          </Card>

          <Card style={{ padding: 24 }}>
            <SectionHead title="Alunos" sub="O aluno pode ser o próprio responsável ou outras pessoas" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {f.alunos.map((a, i) => (
                <div key={i} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aluno {i + 1}</span>
                    {f.alunos.length > 1 && (
                      <button onClick={() => removeAluno(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-subtle)", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                        <Icon name="trash-2" size={15} />Remover</button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <Row2c>
                      <Field label="Nome do aluno" required><Input value={a.nome} onChange={(e) => setAluno(i, "nome", e.target.value)} placeholder="Ex.: João Silva" leadingIcon="graduation-cap" /></Field>
                      <Field label="Data de nascimento"><Input value={a.nascimento} onChange={(e) => setAluno(i, "nascimento", e.target.value)} placeholder="DD/MM/AAAA" inputMode="numeric" leadingIcon="calendar" /></Field>
                    </Row2c>
                    <Checkbox checked={!!f.pagante && a.nome === f.pagante} onChange={(v) => setAluno(i, "nome", v ? f.pagante : "")}>O aluno é o próprio responsável</Checkbox>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted-strong)", display: "block", marginBottom: 10 }}>Matérias</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                        {[["Matemática", "var(--color-primary)"], ["Português", "#FCC000"], ["Inglês", "#E42618"], ["Japonês", "#83B81A"]].map(([m, c]) => (
                          <Chip key={m} label={m} color={c} active={a.materias.includes(m)} onClick={() => toggleMatAluno(i, m)} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addAluno} disabled={maxed}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: "var(--radius-md)",
                  border: `1.5px dashed ${maxed ? "var(--color-border)" : "var(--color-primary)"}`, background: "transparent",
                  color: maxed ? "var(--color-text-subtle)" : "var(--color-primary)", cursor: maxed ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, opacity: maxed ? 0.7 : 1 }}>
                <Icon name={maxed ? "ban" : "plus"} size={17} />{maxed ? "Máximo de alunos" : "Adicionar aluno"}
              </button>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button variant="tertiary" onClick={() => go("c1")}>Cancelar</Button>
            <Button size="lg" iconRight="arrow-right" disabled={!cadastroOk} onClick={() => setTab(1)}>Continuar para plano</Button>
          </div>
        </>
        )}

        {tab === 1 && (
        <>
          <Card style={{ padding: 24 }}>
            <SectionHead title="Plano" sub="Quanto mais longo o período, maior o desconto" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PLANOS.map((p) => {
                const active = f.plano === p.nome;
                return (
                  <button key={p.id} onClick={() => setF({ ...f, plano: p.nome })} style={{ textAlign: "left", padding: "15px 16px", borderRadius: "var(--radius-md)",
                    border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-input)"}`, background: active ? "var(--color-primary-softer)" : "var(--color-bg)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 140ms", fontFamily: "var(--font-sans)" }}>
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
                      <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)" }}>/mês</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", gap: 9, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              <Icon name="repeat" size={15} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Cobrança recorrente como <strong style={{ color: "var(--color-text)" }}>assinatura</strong> — sem parcelamento. O responsável paga via cartão, boleto ou PIX.</span>
            </div>
          </Card>

          <Card style={{ padding: 24 }}>
            <SectionHead title="Desconto de negociação" sub="Aplicado sobre a mensalidade total" />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Segmented key={f.descontoTipo} value={f.descontoTipo} onChange={(v) => setF({ ...f, descontoTipo: v })}
                options={[{ value: "percent", label: "%" }, { value: "fixed", label: "R$" }]} size="sm" />
              <Input value={f.descontoVal} onChange={(e) => setF({ ...f, descontoVal: e.target.value })} inputMode="decimal"
                leadingIcon={f.descontoTipo === "fixed" ? "circle-dollar-sign" : undefined}
                trailing={f.descontoTipo === "percent" ? <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted)" }}>%</span> : null}
                style={{ flex: 1 }} placeholder={f.descontoTipo === "percent" ? "10" : "50,00"} />
            </div>
          </Card>

          <Card style={{ padding: 24 }}>
            <SectionHead title="Vencimento da fatura" sub="Vem das configurações da escola — ajuste se precisar" />
            <Field label="Dia do vencimento" hint="Todo mês o boleto vence neste dia">
              <Input value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                inputMode="numeric" leadingIcon="calendar" style={{ maxWidth: 220 }}
                trailing={<span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>de cada mês</span>} />
            </Field>
          </Card>

          <Card style={{ padding: 24 }}>
            <SectionHead title="Resumo da cobrança" sub={`${nAlunos} ${nAlunos === 1 ? "aluno" : "alunos"} · plano ${f.plano} · vence dia ${f.vencimento}`} />
            <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
              {[
                ["Mensalidade cheia", brl(baseMensal), false],
                [`Desconto do plano ${f.plano}`, "− " + brl(Math.max(0, baseMensal - comPlano)), false],
                ["Desconto de negociação" + (f.descontoTipo === "percent" && descNum ? ` (${descNum}%)` : ""), "− " + brl(descValor), false],
                ["Economia anual total", brl(economiaAnual), false],
              ].map(([k, v, hi]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", fontSize: hi ? 15.5 : 13.5,
                  background: hi ? "var(--color-primary-softer)" : "var(--color-bg)", borderTop: hi ? "1px solid var(--color-border)" : "none" }}>
                  <span style={{ color: hi ? "var(--color-text)" : "var(--color-text-subtle)", fontWeight: hi ? 700 : 400 }}>{k}</span>
                  <span style={{ fontWeight: hi ? 800 : 600, color: hi ? "var(--color-primary)" : "var(--color-text)" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: 18, borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                <Icon name="wallet" size={18} />
                <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.92 }}>Total mensal a pagar</span>
              </div>
              <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{brl(totalMensal)}</span>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button variant="tertiary" iconLeft="arrow-left" onClick={() => setTab(0)}>Voltar</Button>
            <Button size="lg" iconRight="send" disabled={!cadastroOk} onClick={() => { toast(`Link de confirmação enviado para ${f.email}`, "success"); go("c1"); }}>Enviar para confirmação</Button>
          </div>
        </>
        )}
      </div>
    </Shell>
  );
};

/* Variante mobile — o pai recebe a matrícula PRÉ-PREENCHIDA e só confirma + aceita */
const FlowConfirm = ({ exit }) => {
  const [step, setStep] = useState(0); // 0 = revisar/aceitar, 1 = confirmado
  const [aceito, setAceito] = useState(false);
  const [verContrato, setVerContrato] = useState(false);

  const dados = [
    ["Aluno", "João Silva"], ["Matérias", "Matemática, Português"],
    ["Plano", "Mensal · " + brl(450) + "/mês"], ["Vencimento", "Todo dia 10"],
    ["Responsável", "Maria Silva"],
  ];

  const body = step === 0 ? (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <div style={{ padding: "50px 18px 14px", background: "var(--color-primary)", color: "#fff" }}>
        <Logo size={17} light />
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Kumon Camargos enviou</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 2 }}>Confirme a matrícula do João</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 18 }}>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          A escola já preencheu tudo. Confira os dados, leia o contrato e dê o seu aceite.</p>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 16 }}>
          {dados.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", fontSize: 14, borderBottom: i < dados.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}>
              <span style={{ color: "var(--color-text-subtle)" }}>{k}</span>
              <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
            </div>
          ))}
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
          <Checkbox checked={aceito} onChange={setAceito}>Confirmo os dados, li o contrato e autorizo a cobrança recorrente.</Checkbox>
        </div>
      </div>
      <div style={{ padding: "12px 18px 44px", borderTop: "1px solid var(--color-border-muted)" }}>
        <Button block size="lg" disabled={!aceito} iconRight="check" onClick={() => setStep(1)}>Confirmar matrícula</Button>
      </div>
    </div>
  ) : (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <div style={{ padding: "50px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><Logo size={17} /></div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
        <div style={{ width: 84, height: 84, margin: "0 auto 24px", borderRadius: "50%", background: "var(--badge-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", animation: "ex-scale-in 360ms ease" }}>
          <Icon name="check" size={44} color="var(--badge-success-fg)" strokeWidth={3} /></div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Matrícula confirmada!</h1>
        <p style={{ margin: "14px 0 0", fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
          Tudo certo com a matrícula de <strong style={{ color: "var(--color-text)" }}>João</strong>. Você recebe o primeiro boleto no WhatsApp e no e-mail.</p>
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
      <button onClick={exit} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999,
        border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
        <Icon name="arrow-left" size={15} />Voltar ao protótipo</button>
    </div>
  );
};

window.C6NovaMatricula = C6NovaMatricula;
window.FlowConfirm = FlowConfirm;
window.Row2c = Row2c;

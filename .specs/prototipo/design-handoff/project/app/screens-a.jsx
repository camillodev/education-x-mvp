/* Flow A — Onboarding da escola (Admin IX) · desktop */

const WizardShell = ({ step, title, sub, children, footer, back }) => (
  <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 28px 80px" }}>
    <div style={{ marginBottom: 28 }}>
      <Stepper steps={["Dados da escola", "Regras de cobrança", "Contrato", "Revisão"]} current={step} />
    </div>
    <Card style={{ padding: 32 }}>
      <div style={{ marginBottom: 26 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Passo {step + 1} de 4</div>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h2>
        {sub && <p style={{ margin: "8px 0 0", fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{sub}</p>}
      </div>
      {children}
    </Card>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
      <Button variant="tertiary" iconLeft="arrow-left" onClick={back}>Voltar</Button>
      {footer}
    </div>
  </div>
);

const Row2 = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>{children}</div>;

// Fee-routing chooser: responsável paga (opcional) OU escola assume como cobrança extra
const FeeRouter = ({ label, hint, value, onChange }) => {
  const opts = [
    { v: "responsavel", t: "Responsável paga", d: "Repassada ao pai (opcional)", icon: "user" },
    { v: "escola", t: "Escola assume", d: "Vira cobrança extra da unidade", icon: "building-2" },
  ];
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
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

const FlowA = ({ exit, onDone, onImport, go, setSel }) => {
  const [sub, setSub] = useState(0); // 0=list,1=step0..4=step3,5=loading,6=success
  const [f, setF] = useState({
    nome: "Kumon Camargos", cnpj: "12.345.678/0001-90", email: "contato@kumoncamargos.com.br", tel: "(31) 3456-7890",
    cep: "30575-160", endereco: "Av. Tito Fulgêncio, 420", complemento: "", cidade: "Belo Horizonte", uf: "MG",
    vencimento: "10", fechamento: "25", multa: "2", juros: "1",
    habilitaSpc: true, autoCobranca: true, aceitaCartao: true,
    contrato: "",
    taxaCartao: "responsavel", taxaNegativacao: "responsavel",
    franquia: false, franquiaMae: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // criar vs editar escola — o wizard é o mesmo, só muda o preenchimento e o copy
  const [editId, setEditId] = useState(null);
  const slugEmail = (nome) => "contato@" + nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "") + ".com.br";
  const novaEscola = () => { setEditId(null); setSub(1); };
  const editarEscola = (e) => {
    setEditId(e.id);
    setF((prev) => ({ ...prev, nome: e.nome, cnpj: e.cnpj, email: slugEmail(e.nome),
      franquia: true, franquiaMae: e.franquia,
      habilitaSpc: e.status === "ativa", autoCobranca: e.status === "ativa" }));
    setSub(1);
  };

  // A0 list controls — search / filtros / paginação
  const [q, setQ] = useState("");
  const [fFranquia, setFFranquia] = useState("todas");
  const [fStatus, setFStatus] = useState("todos");
  const [page, setPage] = useState(0);

  // A0 — Lista de escolas
  if (sub === 0) {
    const last5 = (c) => c.replace(/\D/g, "").slice(-5);
    const franquias = [...new Set(ESCOLAS.map((e) => e.franquia))];
    const filtered = ESCOLAS.filter((e) => {
      const okFr = fFranquia === "todas" || e.franquia === fFranquia;
      const okSt = fStatus === "todos" || e.status === fStatus;
      const term = q.trim().toLowerCase();
      const okQ = term === "" || e.nome.toLowerCase().includes(term) ||
        e.franquia.toLowerCase().includes(term) || last5(e.cnpj).includes(term.replace(/\D/g, ""));
      return okFr && okSt && okQ;
    });
    const PAGE = 6;
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
    const cur = Math.min(page, pageCount - 1);
    const rows = filtered.slice(cur * PAGE, cur * PAGE + PAGE);
    const resetPage = () => setPage(0);
    const cols = [
      { h: "Escola", a: "left" }, { h: "Franquia", a: "left" }, { h: "CNPJ", a: "left" },
      { h: "Status", a: "left" }, { h: "", a: "right" },
    ];
    return (
      <AdminShell back={exit} go={go}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 28px 40px", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Escolas conectadas</div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Gestão de escolas</h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--color-text-muted)" }}>Onboarde uma unidade e ela já cobra os pais dela no mesmo dia.</p>
            </div>
            <Button size="lg" iconLeft="plus" onClick={novaEscola}>Nova escola</Button>
          </div>

          {/* toolbar: busca + filtros (mesma linha; quebra com elegância no laptop) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <Input value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} leadingIcon="search"
              placeholder="Buscar por escola, franquia ou CNPJ" style={{ flex: "1 1 240px", minWidth: 220, maxWidth: 380, height: 42 }} />
            <Select value={fFranquia} leadingIcon="git-branch"
              onChange={(e) => { setFFranquia(e.target.value); resetPage(); }}
              options={[{ value: "todas", label: "Todas as franquias" }, ...franquias.map((fr) => ({ value: fr, label: fr }))]}
              style={{ marginLeft: "auto", flexShrink: 0 }} />
            <Segmented size="sm" value={fStatus} onChange={(v) => { setFStatus(v); resetPage(); }}
              options={[{ value: "todos", label: "Todas" }, { value: "ativa", label: "Ativas" }, { value: "suspensa", label: "Suspensas" }]}
              style={{ flexShrink: 0 }} />
          </div>

          <Card style={{ overflow: "hidden", flex: "0 0 auto" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "var(--color-surface)" }}>
                    {cols.map((c, i) => (
                      <th key={i} style={{ textAlign: c.a, padding: "12px 14px", fontSize: 11.5,
                        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-subtle)",
                        borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{c.h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                          <span style={{ width: 36, height: 36, borderRadius: 9, background: "var(--color-primary-soft)",
                            color: "var(--color-primary-hover)", display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{e.nome.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{e.nome}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 13.5, color: "var(--color-text-muted)" }}>{e.franquia}</td>
                      <td style={{ padding: "13px 14px", fontSize: 13.5, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>•••• {last5(e.cnpj)}</td>
                      <td style={{ padding: "13px 14px" }}>
                        {e.status === "ativa" ? <Badge variant="success" dot>Ativa</Badge> : <Badge variant="danger" dot>Suspensa</Badge>}
                      </td>
                      <td style={{ padding: "13px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <Button variant="tertiary" size="sm" iconLeft="book-open" onClick={() => { setSel(e.id); go("materias"); }}>Matérias</Button>
                          <Button variant="tertiary" size="sm" iconLeft="pencil" onClick={() => editarEscola(e)}>Editar</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={cols.length} style={{ padding: "40px 18px", textAlign: "center", color: "var(--color-text-subtle)", fontSize: 14 }}>
                      Nenhuma escola encontrada com esses filtros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* paginação */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>
              {filtered.length === 0 ? "0 escolas" :
                `${cur * PAGE + 1}–${Math.min(cur * PAGE + PAGE, filtered.length)} de ${filtered.length} escolas`}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Pagination page={cur} pages={pageCount} onChange={setPage} />
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  // A1 — Dados da escola
  if (sub === 1) {
    return (
      <AdminShell back={exit} go={go}>
        <WizardShell step={0} title={editId ? "Editar — dados da escola" : "Dados da escola"} sub={editId ? `Ajuste os dados de ${f.nome}. As alterações são salvas ao concluir a revisão.` : "Identificação e contato da unidade. Tudo é salvo como rascunho automaticamente."} back={() => setSub(0)}
          footer={<Button size="lg" iconRight="arrow-right" onClick={() => setSub(2)}>Próximo</Button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label="Nome da escola" required><Input value={f.nome} onChange={set("nome")} leadingIcon="building-2" /></Field>
            <Row2>
              <Field label="CNPJ" required hint="Usado para criar a subconta de pagamentos"><Input value={f.cnpj} onChange={set("cnpj")} inputMode="numeric" /></Field>
              <Field label="Telefone" required><Input value={f.tel} onChange={set("tel")} inputMode="tel" leadingIcon="phone" /></Field>
            </Row2>
            <Field label="E-mail de contato" required><Input value={f.email} onChange={set("email")} type="email" leadingIcon="mail" /></Field>
            <div style={{ height: 1, background: "var(--color-border-muted)", margin: "4px 0" }} />
            <Row2>
              <Field label="CEP" required><Input value={f.cep} onChange={set("cep")} inputMode="numeric" /></Field>
              <Field label="Endereço" required><Input value={f.endereco} onChange={set("endereco")} /></Field>
            </Row2>
            <Row2>
              <Field label="Complemento" hint="Sala, andar, bloco"><Input value={f.complemento} onChange={set("complemento")} placeholder="Ex.: Sala 201" /></Field>
              <Field label="Cidade" required><Input value={f.cidade} onChange={set("cidade")} /></Field>
            </Row2>
            <Row2>
              <Field label="UF" required><Input value={f.uf} onChange={set("uf")} /></Field>
              <div />
            </Row2>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>Unidade franqueada</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)", marginTop: 2 }}>Esta escola faz parte de uma rede franqueada?</div>
                </div>
                <Toggle checked={f.franquia} onChange={(v) => setF({ ...f, franquia: v, franquiaMae: "" })} />
              </div>
              {f.franquia && (
                <div style={{ marginTop: 14 }}>
                  <Field label="Rede franqueadora" hint="Nome da unidade principal / rede">
                    <Input value={f.franquiaMae} onChange={set("franquiaMae")} placeholder="Ex.: Kumon Brasil" leadingIcon="git-branch" />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </WizardShell>
      </AdminShell>
    );
  }

  // A2 — Regras de cobrança
  if (sub === 2) {
    return (
      <AdminShell back={exit} go={go}>
        <WizardShell step={1} title="Regras de cobrança" sub="Defaults sensatos já preenchidos — ajuste se a unidade pedir." back={() => setSub(1)}
          footer={<Button size="lg" iconRight="arrow-right" onClick={() => setSub(3)}>Próximo</Button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Row2>
              <Field label="Dia de vencimento" required hint="De 1 a 28"><Input value={f.vencimento} onChange={set("vencimento")} inputMode="numeric" trailing={<span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>do mês</span>} /></Field>
              <Field label="Dia de fechamento" required hint="Quando os boletos do mês são emitidos"><Input value={f.fechamento} onChange={set("fechamento")} inputMode="numeric" trailing={<span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>do mês</span>} /></Field>
            </Row2>
            <Row2>
              <Field label="Multa por atraso" hint="Padrão de mercado: 2%"><Input value={f.multa} onChange={set("multa")} inputMode="decimal" trailing={<span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)" }}>%</span>} /></Field>
              <Field label="Juros ao mês" hint="Padrão de mercado: 1% a.m."><Input value={f.juros} onChange={set("juros")} inputMode="decimal" trailing={<span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)" }}>% a.m.</span>} /></Field>
            </Row2>
            <div style={{ height: 1, background: "var(--color-border-muted)", margin: "4px 0" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                <Icon name="coins" size={18} color="var(--color-primary)" />
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>Opções de cobrança</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                {[{k: "habilitaSpc", t: "Negativar via SPC/Serasa", d: "Habilita o fluxo de negativação para inadimplentes", icon: "gavel"},
                  {k: "autoCobranca", t: "Cobrança automática", d: "Gera boletos no fechamento sem intervenção manual", icon: "repeat"},
                  {k: "aceitaCartao", t: "Aceitar cartão de crédito", d: "Responsável pode pagar no cartão (taxa adicional)", icon: "credit-card"},
                ].map(o => (
                  <div key={o.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span style={{ width: 36, height: 36, borderRadius: 9, background: "var(--color-primary-soft)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={o.icon} size={17} /></span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.t}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 1 }}>{o.d}</div>
                      </div>
                    </div>
                    <Toggle checked={f[o.k]} onChange={(v) => setF({ ...f, [o.k]: v })} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: "var(--color-border-muted)", margin: "4px 0" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                <Icon name="coins" size={18} color="var(--color-primary)" />
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>Quem paga as taxas</span>
              </div>
              <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>
                Nossa mensalidade cobre só a geração de cobrança. Defina quem arca com a taxa de cartão e a de negativação.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FeeRouter label="Taxa de cartão de crédito" hint="Cobrada quando o responsável paga no cartão"
                  value={f.taxaCartao} onChange={(v) => setF({ ...f, taxaCartao: v })} />
                <FeeRouter label="Taxa de negativação (SPC/Serasa)" hint="Cobrada ao incluir um inadimplente"
                  value={f.taxaNegativacao} onChange={(v) => setF({ ...f, taxaNegativacao: v })} />
              </div>
            </div>
          </div>
        </WizardShell>
      </AdminShell>
    );
  }

  // A3 — Documentos: NF obrigatória + contrato da escola
  if (sub === 3) {
    return (
      <AdminShell back={exit} go={go}>
        <WizardShell step={2} title="Contrato" sub="O contrato que a escola usa com os responsáveis na matrícula. Dados fiscais (NFS-e) ficam em Configurações > Fiscal." back={() => setSub(2)}
          footer={<Button size="lg" iconRight="arrow-right" onClick={() => setSub(4)}>Próximo</Button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                <Icon name="file-signature" size={18} color="var(--color-primary)" />
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>Contrato da escola</span>
              </div>
              <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>
                Anexe o contrato de prestação de serviços. Ele será apresentado ao responsável no link de matrícula para leitura e aceite.</p>
              <FileDrop filename={f.contrato} icon="file-signature"
                hint="Anexar contrato de prestação de serviços"
                onAttach={() => setF({ ...f, contrato: "contrato-kumon-camargos.pdf" })}
                onRemove={() => setF({ ...f, contrato: "" })} />
            </div>
          </div>
        </WizardShell>
      </AdminShell>
    );
  }

  // A4 — Revisão + criar
  if (sub === 4) {
    const reviewBlocks = [
      { t: "Dados da escola", icon: "building-2", to: 1, rows: [["Nome", f.nome], ["CNPJ", f.cnpj], ["Contato", f.email], ["Endereço", `${f.endereco}, ${f.cidade}/${f.uf}`]] },
      { t: "Regras de cobrança", icon: "receipt", to: 2, rows: [["Vencimento", `Dia ${f.vencimento}`], ["Fechamento", `Dia ${f.fechamento}`], ["Multa", `${f.multa}%`], ["Juros", `${f.juros}% a.m.`], ["Taxa de cartão", f.taxaCartao === "responsavel" ? "Responsável paga" : "Escola assume"], ["Taxa de negativação", f.taxaNegativacao === "responsavel" ? "Responsável paga" : "Escola assume"]] },
      { t: "Contrato", icon: "file-signature", to: 3, rows: [["Contrato de matrícula", f.contrato || "Não anexado"]] },
    ];
    return (
      <AdminShell back={exit} go={go}>
        <WizardShell step={3} title="Revisão" sub={editId ? "Confira as alterações antes de salvar." : "Confira tudo antes de criar a subconta de pagamentos."} back={() => setSub(3)}
          footer={<Button size="lg" iconRight={editId ? "check" : "sparkles"} onClick={() => { setSub(5); setTimeout(() => setSub(6), 2600); }}>{editId ? "Salvar alterações" : "Criar escola"}</Button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {reviewBlocks.map((b) => (
              <div key={b.t} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: 600 }}><Icon name={b.icon} size={17} color="var(--color-primary)" />{b.t}</span>
                  <Button variant="tertiary" size="sm" iconLeft="pencil" onClick={() => setSub(b.to)}>Editar</Button>
                </div>
                <div style={{ padding: "6px 16px" }}>
                  {b.rows.map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--color-border-muted)", fontSize: 14 }}>
                      <span style={{ color: "var(--color-text-subtle)" }}>{k}</span>
                      <span style={{ fontWeight: 600, color: "var(--color-text)", textAlign: "right" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </WizardShell>
      </AdminShell>
    );
  }

  // A4b — Loading (criação da subconta — momento da verdade)
  if (sub === 5) {
    return (
      <AdminShell go={go}>
        <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 380, padding: 24 }}>
            <div style={{ width: 64, height: 64, margin: "0 auto 24px", borderRadius: "50%", border: "4px solid var(--color-primary-soft)",
              borderTopColor: "var(--color-primary)", animation: "ex-spin 0.8s linear infinite" }} />
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{editId ? "Salvando alterações…" : "Criando subconta…"}</h2>
            <p style={{ margin: "10px 0 0", fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              {editId ? `Atualizando os dados de ${f.nome}. Nada é salvo pela metade — se algo falhar, fazemos rollback automático.` : `Conectando ${f.nome} ao gateway de pagamentos. Nada é salvo pela metade — se algo falhar, fazemos rollback automático.`}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24, textAlign: "left" }}>
              {(editId ? ["Validando CNPJ", "Atualizando regras de cobrança", "Aplicando alterações"] : ["Validando CNPJ", "Criando subconta de pagamentos", "Aplicando regras de cobrança"]).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--color-text-muted)" }}>
                  <Icon name="check-circle-2" size={16} color="var(--color-primary)" />{s}</div>
              ))}
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  // A5 — Sucesso
  return (
    <AdminShell go={go}>
      <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 440, padding: 24, animation: "ex-scale-in 320ms ease" }}>
          <div style={{ width: 76, height: 76, margin: "0 auto 24px", borderRadius: "50%", background: "var(--badge-success-bg)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={40} color="var(--badge-success-fg)" strokeWidth={3} />
          </div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{editId ? `${f.nome} atualizada` : `${f.nome} conectada`}</h2>
          <p style={{ margin: "12px 0 0", fontSize: 15.5, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            {editId ? "As alterações foram salvas e já estão valendo para as próximas cobranças da unidade." : "Pronta para cobrar. A subconta foi criada e as regras já estão valendo — a 1ª cobrança pode sair hoje mesmo."}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
            {editId
              ? <Button size="lg" iconLeft="arrow-left" onClick={() => setSub(0)}>Voltar às escolas</Button>
              : <>
                  <Button variant="secondary" size="lg" iconLeft="upload" onClick={onImport}>Importar matrículas</Button>
                  <Button size="lg" iconRight="arrow-right" onClick={onDone}>Ir para o painel</Button>
                </>}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

window.FlowA = FlowA;

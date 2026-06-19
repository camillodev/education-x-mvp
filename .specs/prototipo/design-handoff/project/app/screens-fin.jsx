/* Financeiro — saldo disponível para saque, recebíveis (PIX vs cartão D+X),
 * extrato e antecipação de recebíveis via taxa Education X. */

const ORIGEM_ICON = { PIX: "qr-code", Boleto: "barcode", Cartão: "credit-card", Saque: "arrow-up-right", Antecipação: "zap" };

const FinanceiroBody = ({ toast }) => {
  const [saqueOpen, setSaqueOpen] = useState(false);
  const [antecipOpen, setAntecipOpen] = useState(false);
  const [sel, setSel] = useState(RECEBIVEIS.map((r) => r.id)); // recebíveis marcados p/ antecipar

  // Antecipação: taxa Education X ~ 1,99% a.m. proporcional aos dias até liberar
  const TAXA_MES = 0.0199;
  const escolhidos = RECEBIVEIS.filter((r) => sel.includes(r.id));
  const brutoTotal = escolhidos.reduce((s, r) => s + r.bruto, 0);
  const taxaTotal = escolhidos.reduce((s, r) => s + r.bruto * TAXA_MES * (r.dias / 30), 0);
  const liquido = brutoTotal - taxaTotal;
  const toggleSel = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  return (
    <>

      {/* Saldo atual — card principal, full width */}
      <Card style={{ padding: 26, background: "var(--color-primary)", color: "#fff", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.85 }}>Saldo atual</div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8, lineHeight: 1 }}>{brl(SALDO.disponivel)}</div>
          </div>
          <Icon name="wallet" size={28} style={{ opacity: 0.9 }} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <Button size="lg" iconLeft="arrow-up-right" onClick={() => setSaqueOpen(true)}
            style={{ background: "#fff", color: "var(--color-primary)" }}>Transferir para banco</Button>
          <Button size="lg" iconLeft="zap" onClick={() => setAntecipOpen(true)}
            style={{ background: "transparent", color: "#fff", border: "1.5px solid rgba(255,255,255,0.55)", boxShadow: "none" }}>Antecipar recebíveis</Button>
        </div>
      </Card>

      {/* Extrato — movido para aba própria no Dashboard */}

      {/* Modal saque */}
      <Modal open={saqueOpen} onClose={() => setSaqueOpen(false)}>
        <div style={{ padding: 26 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Resgatar saldo</h3>
          <p style={{ margin: "6px 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>Transferência via PIX para a conta cadastrada da escola.</p>
          <Field label="Valor do saque"><Input defaultValue={SALDO.disponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} leadingIcon="circle-dollar-sign" inputMode="decimal" /></Field>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface)", marginTop: 14 }}>
            <Icon name="building" size={18} color="var(--color-text-subtle)" />
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>Banco Inter · Ag 0001</div>
              <div style={{ fontSize: 12.5, color: "var(--color-text-subtle)" }}>Conta ****-5521 · CNPJ Kumon Camargos</div></div>
            <Badge variant="success" size="sm" dot>PIX na hora</Badge>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <Button variant="tertiary" onClick={() => setSaqueOpen(false)}>Cancelar</Button>
            <Button iconLeft="arrow-up-right" onClick={() => { setSaqueOpen(false); toast(`${brl(SALDO.disponivel)} resgatado via PIX`, "success"); }}>Confirmar resgate</Button>
          </div>
        </div>
      </Modal>

      {/* Modal antecipação */}
      <Modal open={antecipOpen} onClose={() => setAntecipOpen(false)} width={560}>
        <div style={{ padding: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--color-primary-soft)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="zap" size={20} /></span>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Antecipar recebíveis</h3>
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            Receba hoje o que está preso no cartão. A taxa de antecipação Education X (1,99% a.m.) incide proporcional aos dias até a liberação.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {RECEBIVEIS.map((r) => {
              const on = sel.includes(r.id);
              const taxa = r.bruto * TAXA_MES * (r.dias / 30);
              return (
                <button key={r.id} onClick={() => toggleSel(r.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${on ? "var(--color-primary)" : "var(--color-border-input)"}`, background: on ? "var(--color-primary-softer)" : "var(--color-bg)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${on ? "var(--color-primary)" : "var(--color-border-input)"}`, background: on ? "var(--color-primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {on && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.desc}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>Libera em {r.liberaEm} · {r.dias} dias · taxa {brl(taxa)}</div>
                  </div>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{brl(r.bruto)}</span>
                </button>
              );
            })}
          </div>
          <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden", marginBottom: 20 }}>
            {[["Valor bruto selecionado", brl(brutoTotal), false], ["Taxa de antecipação (Education X)", "− " + brl(taxaTotal), false], ["Você recebe hoje", brl(liquido), true]].map(([k, v, hi]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", fontSize: hi ? 15 : 13.5, background: hi ? "var(--color-primary-softer)" : "var(--color-bg)", borderTop: hi ? "1px solid var(--color-border)" : "none" }}>
                <span style={{ color: hi ? "var(--color-text)" : "var(--color-text-subtle)", fontWeight: hi ? 700 : 400 }}>{k}</span>
                <span style={{ fontWeight: hi ? 800 : 600, color: hi ? "var(--color-primary)" : "var(--color-text)" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="tertiary" onClick={() => setAntecipOpen(false)}>Cancelar</Button>
            <Button iconLeft="zap" disabled={!escolhidos.length} onClick={() => { setAntecipOpen(false); toast(`${brl(liquido)} antecipados — disponíveis para saque`, "success"); }}>Antecipar {brl(liquido)}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

window.FinanceiroBody = FinanceiroBody;

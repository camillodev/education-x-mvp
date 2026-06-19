# Personas — Education X (gestão de matrículas e cobrança para escolas)

> Quem usa o produto, suas dores, objetivos e o que cada um precisa ver na tela.
> ICP central: **franquias de educação complementar no Brasil** (Kumon, Cultura Inglesa, Wizard).

---

## P1 — Fran · Coordenadora/Orientadora da escola (usuária primária)

**Contexto:** toca o dia a dia de uma unidade Kumon/Cultura Inglesa. Não é técnica.
Vive no operacional: matrícula, mensalidade, contato com pais. Usa muito o celular.

**Dores**
- Inadimplência: mensalidade que não cai, ter que ligar/cobrar pai um a um (~2h/mês).
- Matrícula manual: preencher cadastro no papel/planilha, retrabalho.
- Segunda via de boleto e nota fiscal: pais pedem toda hora.
- Medo de errar na cobrança (valor, vencimento) e ter atrito com o pai.

**Objetivos**
- Que a cobrança "rode sozinha" (emissão + aviso automáticos).
- Saber num relance quem está em atraso e quanto.
- Matricular rápido, sem digitar tudo de novo.

**O que precisa na tela**
- Dashboard com "recebido / a vencer / vencido" e lista de próximos vencimentos.
- Lista de cobranças com status colorido e filtro (vencidas em destaque).
- Botão de reenviar cobrança e gerar cobrança extra (multa, avulso).
- Aprovar matrícula que o pai preencheu (revisar e confirmar).

**Frase dela:** *"Quero que o pai pague em dia sem eu ter que ficar cobrando."*

---

## P2 — Pimenta · Franqueado/dono da escola (comprador / decisor)

**Contexto:** dono da unidade (ou de várias). Vê o negócio, não o operacional.
É quem **decide comprar** o Education X. Olha custo, controle e profissionalismo.

**Dores**
- Não enxerga a saúde financeira da unidade com clareza.
- Inadimplência come a margem; quer pressão de cobrança (até negativação) sem trabalho.
- Quer parecer profissional para os pais (boleto/nota fiscal de verdade, não improviso).

**Objetivos**
- Reduzir inadimplência e tempo gasto com cobrança.
- Ter relatório do que entrou/vai entrar.
- Confiar que o sistema é sério (parece banco, cumpre a lei).

**O que precisa na tela (e na demo de venda)**
- Visão consolidada de recebimento e inadimplência.
- Sensação de produto sólido e confiável (estética Alfabeto, azul institucional).
- Negativação SPC/Serasa como diferencial de cobrança.

**Frase dele:** *"Quanto eu deixo de receber por mês — e como isso melhora com vocês?"*

---

## P3 — Maria · Responsável (pai/mãe que paga) — usuária final

**Contexto:** mãe/pai do aluno. Recebe cobrança e paga. Quer praticidade, no celular.
Não tem login complexo; interage por link/WhatsApp.

**Dores**
- Receber cobrança confusa ou tardia; perder o boleto.
- Não achar a segunda via nem a nota fiscal (precisa pro IR).
- Burocracia na matrícula.

**Objetivos**
- Matricular o filho rápido, pelo celular.
- Pagar fácil (PIX/boleto), receber lembrete antes de vencer.
- Acessar boletos e notas anteriores quando precisar.

**O que precisa na tela**
- Link de matrícula simples (preenche dados + aceita termos).
- Cobrança clara: valor, vencimento, PIX copia-e-cola, boleto PDF.
- (pós-MVP) portal pra ver histórico e baixar nota fiscal.

**Frase dela:** *"Me manda o PIX no WhatsApp que eu pago agora."*

---

## P4 — Admin Impact X (operador da plataforma)

**Contexto:** time IX que cadastra novas escolas e opera a plataforma.

**Dores / objetivos**
- Onboardar uma escola rápido (criar subconta Asaas, configurar, importar alunos).
- Suspender escola que não paga a IX.
- Não envolver a IX em disputa jurídica (cadeia de aceites).

**O que precisa na tela**
- Wizard de onboarding de escola.
- Lista de escolas com status (ativa/suspensa) e flag de suspensão.
- Histórico de aceites (prova legal).

**Frase:** *"Conecto uma escola nova em minutos e ela já cobra os pais dela."*

---

## Mapa persona × jornada (referência rápida)

| Jornada | Persona principal | Secundária |
|---------|-------------------|------------|
| Onboarding da escola | Admin IX | — |
| Matrícula via link | Maria (responsável) | Fran (aprova) |
| Cobrança mensal | Sistema (automático) | Fran (acompanha) |
| Inadimplência/negativação | Sistema + Fran | Pimenta (vê resultado) |
| Decisão de compra | Pimenta | Fran (influencia) |

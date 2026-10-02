# Épico 05 — Aceite de Termos (Responsabilização)

> **Prioridade:** P1 · **Doc-mãe:** [00-visao.md](./00-visao.md)
> **Status:** 🟡 Aguardando aprovação
> **Entrega:** Escola e Responsáveis aceitam as políticas da Education X via plataforma
> (aceite eletrônico simples), transferindo a responsabilidade de cobrança/negativação
> para a Escola e mantendo a IX fora de disputas judiciais.

> ⚠️ **Escopo MVP — sem contratos formais.** No MVP fazemos apenas o **aceite eletrônico
> simples (clickwrap)** registrado: a escola aceita os termos no onboarding, o responsável
> aceita na matrícula. **Não** geramos documentos de contrato formais nem usamos Autentique —
> isso adiciona complexidade desnecessária agora. A estrutura de templates versionados
> (Feature 5.3 + schema) pode começar mínima e evoluir pós-MVP.

---

## Por que este épico

A Education X gera boletos, negativa CPF no SPC/Serasa e cobra multas. Isso gera **risco
jurídico**: um responsável negativado pode processar. Sem uma cadeia de aceites clara, a
IX pode ser arrastada para a disputa. Este épico cria a blindagem:

```
Education X  →[contrato A]→  Escola  →[contrato B]→  Responsável
              IX se isenta              Escola assume a relação de cobrança
```

- **Contrato A (IX ↔ Escola):** a Escola é cliente da IX, paga pela plataforma, e assume
  total responsabilidade pela relação com seus responsáveis (cobrança, negativação, multas).
  A IX é apenas a ferramenta/intermediária técnica.
- **Contrato B (Escola ↔ Responsável):** o responsável aceita as políticas (pode ser cobrado,
  ter multa, ser negativado, regras de cancelamento). A responsabilidade é da Escola.

---

## Parte 1 — Experiência do usuário (Features)

### Feature 5.1 — Aceite do contrato IX ↔ Escola (no onboarding)

> **User story**
> Como **admin da Education X**, quero que a escola aceite os termos da plataforma durante
> o onboarding, para registrar que ela assume a responsabilidade pela cobrança dos seus responsáveis.

**Critérios de aceite**
- [ ] No onboarding, a escola vê os termos da Education X e aceita digitalmente (checkbox + registro de IP, data/hora, identificação de quem aceitou).
- [ ] O aceite fica registrado como prova (imutável, auditável).
- [ ] Sem aceite, o onboarding não conclui — a escola não fica ativa.
- [ ] Os termos deixam claro: a escola é responsável pela cobrança/negativação; a IX é a ferramenta técnica.
- [ ] Posso ver, por escola, quando e quem aceitou os termos.

---

### Feature 5.2 — Aceite duplo via link de matrícula (Escola ↔ Responsável)

> **User story**
> Como **Orientadora**, quero enviar um link de matrícula para o responsável preencher seus
> dados e aceitar os termos, e então aprovar o cadastro — confirmando a matrícula com o aceite
> dos dois lados, tudo pela plataforma, sem assinatura formal.

**O fluxo de maior valor (link de matrícula com aceite duplo):**
```
1. Escola gera um LINK de matrícula e envia ao responsável (WhatsApp / email)
2. Responsável abre o link, preenche seus dados + do aluno, escolhe o plano,
   e ACEITA os termos (clickwrap)              → ACEITE 1 (responsável)
3. Escola revisa o cadastro e APROVA           → ACEITE 2 (escola)
4. Matrícula confirmada; os dois aceites ficam registrados como prova
```

**Critérios de aceite**
- [ ] A escola gera um link único de matrícula e envia ao responsável (email/WhatsApp).
- [ ] No link, o responsável preenche seus dados (CPF, email, telefone — obrigatórios), os dados do aluno e escolhe o plano.
- [ ] O responsável vê os termos completos e marca "Li e aceito" (checkbox) — **aceite eletrônico simples / clickwrap**.
- [ ] O aceite do responsável registra: identificação, **IP**, **data/hora**, **versão exata do termo** (prova auditável).
- [ ] A escola revisa o cadastro pendente e **aprova** — a aprovação é o aceite da escola.
- [ ] Só com os **dois aceites** a matrícula é confirmada e as cobranças podem começar.
- [ ] O conteúdo dos termos vem de um **template da Education X** (cláusulas que isentam a IX são fixas), e a escola personaliza apenas valores/regras dela (multa, cancelamento).
- [ ] As cláusulas que isentam a IX de disputas são **obrigatórias** e não editáveis pela escola.

> **Reuso:** o projeto já tem specs de "wizard pai-first" (`specs/matricula/10-feature-wizard-pai-first.md`)
> e "aprovação orientadora" (`specs/matricula/11-feature-aprovacao-orientadora.md`). Esta feature
> conecta o aceite de termos a esse fluxo existente.

---

### Feature 5.3 — Registro e consulta de aceites (admin IX)

> **User story**
> Como **admin IX**, quero consultar o histórico de aceites,
> para ter prova documental em caso de questionamento.

**Acesso restrito ao admin IX** (decidido) — a consulta do histórico de aceites é
ferramenta de gestão/jurídica da Education X, não da escola.

**Critérios de aceite**
- [ ] Apenas o **admin IX** acessa o histórico de aceites (Orientadora não vê esta tela).
- [ ] Vejo, por escola, o aceite IX↔Escola (quem, quando, qual versão dos termos).
- [ ] Vejo, por responsável, o aceite de matrícula (quem, quando, qual versão).
- [ ] Os termos são **versionados** — sei qual versão cada um aceitou.
- [ ] Exporto o comprovante de aceite (PDF) para uso em eventual disputa.

---

## Parte 2 — Subsection técnica

### 2.1 — Aceite IX ↔ Escola
- Aceite digital no onboarding (decisão: checkbox + registro). Opção futura: assinatura
  formal via **Autentique** (já conectado via MCP) para contratos de maior valor.
- Registrar: `acceptedByUserId`, `acceptedAt`, `ip`, `userAgent`, `termsVersion`.

### 2.2 — Aceite Escola ↔ Responsável
- Template de termos versionado, mantido pela IX. Escola injeta variáveis (multa, prazo de
  cancelamento — vindas dos Planos, Épico 06).
- Cláusulas de isenção da IX: bloco fixo, não editável.
- Registrar aceite no ato da matrícula.

### 2.3 — Schema Prisma

```prisma
model TermsVersion {
  id        String   @id @default(cuid())
  scope     String   // "IX_SCHOOL" | "SCHOOL_GUARDIAN"
  version   Int
  body      String   // template (Mustache para variáveis da escola)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  @@unique([scope, version])
}

model TermsAcceptance {
  id             String   @id @default(cuid())
  termsVersionId String
  scope          String   // "IX_SCHOOL" | "SCHOOL_GUARDIAN"
  unitId         String
  guardianId     String?  // null para aceite IX↔Escola
  acceptedByUserId String?
  acceptedAt     DateTime @default(now())
  ip             String?
  userAgent      String?
  @@index([unitId])
  @@index([guardianId])
}
```

### 2.4 — Integração com onboarding e matrícula
- Onboarding (Épico 01, Feature 1.1): adiciona etapa de aceite IX↔Escola — bloqueia conclusão sem aceite.
- Matrícula (fluxo existente): adiciona aceite do responsável — bloqueia sem aceite.

### 2.5 — Testes (≥80%)
- Aceite registra IP/data/versão; onboarding bloqueado sem aceite.
- Matrícula bloqueada sem aceite do responsável.
- Versionamento: novo termo não invalida aceites antigos.
- Cláusula de isenção IX presente e não editável.

---

## ⚖️ Base legal — por que clickwrap basta (decidido)

Decidimos fazer **tudo via plataforma, sem assinatura formal**, usando **aceite eletrônico
simples (clickwrap)**. Isso é juridicamente válido no Brasil:

- **MP 2.200-2 + Lei 14.063/2020:** assinatura eletrônica simples é válida quando as partes
  concordam com o método e a tecnologia é **auditável**.
- **STJ (nov/2024, REsp 2159442/PR):** confirmou validade de aceite eletrônico não-ICP-Brasil.
  O ônus de provar que o aceite é falso é de **quem contesta**, não de quem aceitou.
- **O que torna auditável (e que registramos):** identificação de quem aceitou, timestamp,
  IP, user-agent, e a **versão exata** do termo aceito.

**Consequência prática:** não usamos Autentique/DocuSign para a relação Escola↔Responsável —
o clickwrap registrado é prova suficiente. Reservamos assinatura formal (opcional) só para o
contrato IX↔Escola de maior valor, se desejado.

Fontes:
[Lei da Assinatura Eletrônica — GeraContratos](https://geracontratos.com.br/recursos/lei-assinatura-eletronica-brasil) ·
[STJ valida assinatura eletrônica não ICP-Brasil — Conjur](https://www.conjur.com.br/2025-fev-12/stj-valida-uso-de-assinatura-eletronica-nao-certificada-pela-icp-brasil/) ·
[Docusign Click — validade do aceite](https://www.docusign.com/pt-br/blog/docusign-click-aceite)

---

## ✏️ Decisões para você editar

### Q1 — Quem escreve o conteúdo jurídico dos termos?
Os textos das cláusulas (especialmente as que isentam a IX) precisam de revisão jurídica.
- [ ] Advogado revisa antes de produção (recomendado — é blindagem legal)
- [ ] Começamos com template básico e revisamos depois
- **Sua resposta:** _______________

### Q2 — Assinatura formal (Autentique) para o contrato IX↔Escola?
✅ **Decidido:** Escola↔Responsável = só clickwrap (suficiente). Para IX↔Escola, pergunta aberta:
- [ ] Só aceite digital por enquanto (recomendado pro MVP)
- [ ] Aceite digital + contrato formal Autentique para escolas grandes
- **Sua resposta:** _______________

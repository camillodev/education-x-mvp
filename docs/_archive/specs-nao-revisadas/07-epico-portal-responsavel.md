# Épico 07 — Portal do Responsável

> **Prioridade:** P2 · **Doc-mãe:** [00-visao.md](./00-visao.md) · **Depende de:** Épicos 01, 05, 06
> **Status:** 🟡 Aguardando aprovação · ⚠️ **Fora do MVP** (release pós-MVP, repriorizado por vendas)
> **Entrega:** o responsável acessa um portal onde vê suas cobranças (atuais e anteriores),
> baixa boletos e notas fiscais, e acompanha a situação dos seus alunos — autoatendimento.

---

## Por que este épico

Hoje o responsável depende da escola para tudo (segunda via de boleto, nota fiscal, histórico).
Um portal de autoatendimento reduz o trabalho da escola e melhora a experiência do pai —
e é onde mora boa parte do valor percebido da plataforma para o usuário final.

---

## Parte 1 — Experiência do usuário (Features)

### Feature 7.1 — Acesso do Responsável ao portal

> **User story**
> Como **Responsável**, quero acessar um portal com login seguro, para ver minhas cobranças
> e dados dos meus alunos sem precisar ligar para a escola.

**Critérios de aceite**
- [ ] Recebo um convite/link de acesso (email/WhatsApp) ao ser cadastrado na escola.
- [ ] Faço login de forma segura.
- [ ] Vejo apenas os **meus** dados e dos **meus** alunos (isolamento — nunca de outros responsáveis).
- [ ] O acesso funciona em celular (mobile-first — a maioria dos pais usa o celular).

---

### Feature 7.2 — Ver cobranças atuais e histórico

> **User story**
> Como **Responsável**, quero ver minhas cobranças atuais e todas as anteriores,
> para acompanhar pagamentos e pegar segunda via quando precisar.

**Critérios de aceite**
- [ ] Vejo a lista das minhas cobranças com status (a vencer, paga, vencida).
- [ ] Vejo o **histórico completo** de cobranças anteriores (boletos passados).
- [ ] Para cada cobrança em aberto, acesso o boleto (PDF), a linha digitável e o PIX (copia e cola).
- [ ] Para cobranças pagas, vejo a data e valor do pagamento.
- [ ] Posso baixar a **segunda via** de um boleto a qualquer momento.

---

### Feature 7.3 — Baixar notas fiscais

> **User story**
> Como **Responsável**, quero baixar as notas fiscais das mensalidades que paguei,
> para minhas declarações (ex: dedução de educação no IR).

**Critérios de aceite**
- [ ] Para cada cobrança paga com nota fiscal emitida, baixo o PDF da NFS-e.
- [ ] Vejo o histórico de notas fiscais do ano (útil para o IR).

---

### Feature 7.4 — Ver dados dos alunos e plano

> **User story**
> Como **Responsável**, quero ver os dados dos meus alunos e o plano contratado,
> para confirmar matrícula, matérias e valores.

**Critérios de aceite**
- [ ] Vejo meus alunos, as matérias que cursam e o plano (recorrência + valor).
- [ ] Vejo os termos que aceitei (contrato de matrícula) e quando aceitei.
- [ ] Posso atualizar meus dados de contato (email/telefone) — mantém cobrança multicanal funcionando.

---

## Parte 2 — Subsection técnica

### 2.1 — Autenticação e isolamento
- Login do responsável via Clerk (role `RESPONSAVEL`, já existe no projeto).
- Todas as queries filtram por `guardianId` do usuário logado (isolamento rígido — nunca expor dados de outro responsável).
- Convite: reusa o fluxo de `GUARDIAN_INVITE_SENT` mencionado em specs de notificações.

### 2.2 — Dados de cobrança
- Cobranças vêm do nosso banco (Invoice), com `bankSlipUrl`, `invoiceUrl`, `pixQrCode` (Épico 01).
- Segunda via: link direto do boleto Asaas (`bankSlipUrl`) ou `invoiceUrl`.
- NFS-e: `NfseRecord.pdfUrl` (Épico 01).

### 2.3 — Reuso
- O projeto já tem specs de portal-pai (`specs/portal-pai/01-self-service.md`). Esta feature
  conecta o portal ao histórico de cobranças/notas da integração Asaas.

### 2.4 — Schema
- Reusa `Invoice`, `NfseRecord`, `Guardian`, `Enrollment` (sem tabelas novas).
- Garantir índice `Invoice.guardianId` para a listagem do portal.

### 2.5 — Testes (≥80%)
- Isolamento: responsável A não vê cobranças do responsável B.
- Histórico: lista cobranças atuais + anteriores corretamente.
- Segunda via: retorna URL do boleto válido.
- NFS-e: lista só notas das cobranças pagas do responsável.

---

## ✏️ Decisões para você editar

### Q1 — Login do responsável: senha ou link mágico?
- [ ] Link mágico por email/WhatsApp (sem senha — mais simples pro pai)
- [ ] Senha tradicional
- **Sua resposta:** _______________

### Q2 — Portal no MVP ou fase 2?
✅ **Decidido: fora do MVP.** O portal entra em release pós-MVP, repriorizado conforme as
vendas. Inclui ver boletos/histórico/NFS-e e, junto com o Épico 04, a gestão de cartões salvos.

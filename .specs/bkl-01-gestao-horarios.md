# Spec — Gestão de Horários (match aluno × atendente)

> **Fase:** Backlog (2º lançamento) · **Ordem:** 01
> **Status:** rascunho (Rafa + Claude, 2026-07-03). **Não construir agora** — spec escrita para o 2º ciclo.
> **Fonte de verdade:** dor real do cliente (transcript Sponte×Kumon Camargos, 2026-06-19, [36:23]) + `prisma/schema.prisma` + filosofia 37signals (pedagógico = produto separado, só se a dor puxar).
> **DS:** Alfabeto.
> **Natureza:** operacional/pedagógico, NÃO financeiro. Não toca Asaas. É a exceção consciente ao núcleo financeiro — justificada por ser dor #1 declarada e competitivamente aberta.

---

## 1. Objetivo

Permitir que a escola (unidade Kumon) faça o **match entre alunos e os horários de atendimento das atendentes/orientadoras** — alocar cada aluno num slot de horário compatível com a capacidade da atendente naquele período, evitando superlotação e furos de agenda.

**Por que existe (evidência de dor):** no transcript [36:23], o Rafa diz textual: *"Nossa maior dor hoje em dia é conseguir fazer esse match de alunos com horário de nossa atendente. Gestão de horários."* A Spontee **não resolve** [43:02] (funcionalidade não liberada para Kumon), e [36:37] a maior unidade Kumon do Brasil também pede — **competitivamente aberto**. Hoje é feito no Excel/papel.

**Por que é backlog, não MVP:** é dor pedagógica/operacional, fora da espinha financeira (matrícula+cobrança+NFS-e+negativação). A filosofia 37signals manda tratar pedagógico como produto separado, e só construir quando a dor for comprovada e priorizada. A dor está comprovada; a **priorização** fica para o 2º lançamento, depois do núcleo financeiro validado.

**DoD (Rafa):** a orientadora define os slots de horário e a capacidade de cada atendente; ao matricular (ou depois), aloca o aluno num slot compatível; o sistema impede alocar acima da capacidade e mostra a ocupação de cada horário de relance.

---

## 2. Dados necessários (o coração)

Domínio de agendamento/capacidade. Sem piso Asaas (fluxo não financeiro).

### 2b. Negócio

| Dado | Origem | Para que serve |
|---|---|---|
| Atendentes/orientadoras da unidade | novo model `Attendant` | quem atende (capacidade por horário) |
| Slots de horário | novo model `TimeSlot` | os blocos de atendimento (ex: seg 14h–15h) |
| Capacidade do slot | `TimeSlot.capacity` | máximo de alunos simultâneos naquele horário/atendente |
| Alocação aluno→slot | novo model `ScheduleAssignment` | o match em si (Student × TimeSlot) |
| Vínculo com matrícula | `Enrollment` (de `mvp-02`) | o aluno alocado é um aluno matriculado |

### 2d. Compliance / LGPD

| Campo | Classificação | Tratamento |
|---|---|---|
| Nome do aluno na grade | PII (já `Student.nameEnc`, de `mvp-02`) | exibir descriptografado só na UI autenticada; nunca em URL/log |
| Nome da atendente | PII se pessoa física | avaliar `nameEnc` no model `Attendant` |

---

## 3. Tabela de confronto

| Dado necessário | Origem | Obrigatório | Prisma | No design | Resolução |
|---|---|---|---|---|---|
| Atendente | `Attendant` (NOVO) | Sim | Falta | a definir | criar model com `unitId` + nome + ativo |
| Slot de horário | `TimeSlot` (NOVO) | Sim | Falta | grade semanal | criar model (dia da semana, hora início/fim, atendente, capacidade) |
| Alocação aluno→slot | `ScheduleAssignment` (NOVO) | Sim | Falta | célula da grade | Student × TimeSlot, com `unitId` |
| Ocupação do slot | derivado (count de assignments) | Sim | consulta | badge "3/5" na célula | agregação em tempo real ou índice |
| Aluno matriculado | `Enrollment` (mvp-02) | Sim | existe (após mvp-02) | seletor de aluno | referência ao Student/Enrollment existente |

---

## 4. Deltas de schema

Models novos: `Attendant`, `TimeSlot`, `ScheduleAssignment`. Dependem de `Student` (criado em `mvp-02`).

```prisma
enum Weekday {
  MON
  TUE
  WED
  THU
  FRI
  SAT
}

// Atendente/orientadora que atende alunos
model Attendant {
  id     String @id @default(cuid())
  unitId String

  nameEnc  String  // PII — nome da atendente (AES-256-GCM)
  isActive Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit      Unit       @relation(fields: [unitId], references: [id], onDelete: Cascade)
  timeSlots TimeSlot[]

  @@index([unitId])
  @@map("attendants")
}

// Bloco de horário de atendimento
model TimeSlot {
  id          String @id @default(cuid())
  unitId      String
  attendantId String

  weekday   Weekday
  startTime String  // "14:00" (HH:mm local da unidade)
  endTime   String  // "15:00"
  capacity  Int     // máximo de alunos simultâneos

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit        Unit                 @relation(fields: [unitId], references: [id], onDelete: Cascade)
  attendant   Attendant            @relation(fields: [attendantId], references: [id], onDelete: Cascade)
  assignments ScheduleAssignment[]

  @@index([unitId])
  @@index([attendantId])
  @@map("time_slots")
}

// Alocação de um aluno num slot (o "match")
model ScheduleAssignment {
  id         String @id @default(cuid())
  unitId     String
  timeSlotId String
  studentId  String

  createdAt DateTime @default(now())

  unit     Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  timeSlot TimeSlot @relation(fields: [timeSlotId], references: [id], onDelete: Cascade)
  student  Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([timeSlotId, studentId]) // um aluno não ocupa o mesmo slot duas vezes
  @@index([unitId])
  @@index([studentId])
  @@map("schedule_assignments")
}

// Em Unit: attendants, timeSlots, scheduleAssignments
// Em Student (mvp-02): scheduleAssignments ScheduleAssignment[]
```

---

## 5. Contratos externos

Nenhum. Fluxo interno, sem integração de terceiro. (Sem Asaas.)

---

## 6. Regras de negócio (EARS)

**RN-01:** WHEN a orientadora cria um `TimeSlot` THEN o sistema SHALL exigir atendente, dia da semana, hora início/fim e capacidade > 0.
**RN-02:** WHEN a orientadora aloca um aluno num slot AND o slot já está na capacidade máxima THEN o sistema SHALL bloquear a alocação e exibir "Horário lotado (X/X)".
**RN-03:** WHEN a orientadora aloca um aluno já alocado no mesmo slot THEN o sistema SHALL impedir duplicata (constraint `@@unique`).
**RN-04:** WHEN a grade é exibida THEN o sistema SHALL mostrar, por slot, a ocupação atual vs capacidade (ex: "3/5").
**RN-05:** IF hora de início ≥ hora de fim THEN o sistema SHALL rejeitar o slot com mensagem clara.
**RN-06:** WHEN um aluno é desmatriculado (Enrollment CANCELLED em mvp-02) THEN o sistema SHALL sinalizar (ou remover) as alocações órfãs desse aluno — decisão de UX pendente (P-02).
**RN-07:** WHEN dois slots da mesma atendente se sobrepõem no horário THEN o sistema SHALL avisar sobre conflito de agenda (não necessariamente bloquear — pode ser intencional).

---

## 7. Estados e transições

Slot não tem máquina de estados complexa. Ocupação é derivada (count de `ScheduleAssignment`): `VAZIO` (0) → `PARCIAL` (1..cap-1) → `LOTADO` (== cap). É visual, não persistido.

---

## 8. Fluxo de coleta (UX, referência ao design)

Design a definir (não há protótipo). Fluxo esperado da persona **dona/orientadora**:

1. **Configurar atendentes** — lista simples (nome, ativo).
2. **Montar a grade** — visão semanal (dias × horas). Cada célula = TimeSlot com atendente e capacidade.
3. **Alocar alunos** — a partir de um slot, seleciona alunos matriculados; ou a partir de um aluno, escolhe um slot compatível. Badge de ocupação "3/5" por célula; bloqueio quando lotado.
4. **Ver conflitos** — destaque visual de superlotação ou sobreposição de atendente.

---

## 9. Definition of Done (binário)

```bash
pnpm typecheck && pnpm test:run

# Migration com os 3 models
pnpm prisma migrate dev --name add-schedule-attendant-timeslot && \
grep -E "model Attendant|model TimeSlot|model ScheduleAssignment" prisma/schema.prisma | wc -l | grep -q "^3$"

# Alocação respeita capacidade (bloqueia o 6º num slot de 5)
pnpm dlx playwright test horarios-capacidade --reporter=line
# Grade exibe ocupação correta por slot
pnpm dlx playwright test horarios-grade --reporter=line
```
Não toca dinheiro → DoD sem exigência de sandbox Asaas, mas mantém E2E da regra de capacidade (a regra central).

---

## 10. Decisões fechadas

- **D-01 — Escopo do 2º lançamento, não do MVP.** Dor comprovada [36:23], mas fora da espinha financeira. Constrói depois do núcleo validado.
- **D-02 — Sem integração externa.** Agendamento é interno; nada de Asaas.
- **D-03 — Capacidade por slot, não por atendente global.** A mesma atendente pode ter capacidades diferentes em horários diferentes.
- **D-04 — Produto/módulo separado, não feature empilhada.** Coerente com 37signals: pedagógico não engorda o núcleo financeiro.

---

## 11. Pendências

- **P-01 — Recorrência de aluno:** um aluno assiste toda semana no mesmo slot (recorrente) ou a alocação é por data? MVP-horários provável: recorrente semanal. Confirmar com Rafa no 2º ciclo.
- **P-02 — Alocação órfã ao desmatricular:** remover automaticamente ou sinalizar? (RN-06). Decidir na UX.
- **P-03 — Relação com Enrollment vs Student:** alocar por aluno (Student) ou por matrícula (Enrollment, aluno×matéria)? Kumon tem alunos em múltiplas matérias — pode exigir alocação por Enrollment. Investigar no 2º ciclo.
- **P-04 — Timezone:** hora local da unidade. Definir se armazena TZ ou assume o da unidade.
- **P-05 — É produto separado?** Reavaliar no 2º lançamento se isto vira um SKU/módulo à parte (preço próprio) ou add-on do Education X.

---

## 12. Fatiamento em Task Contracts

Fatias ≤400 linhas, WIP = 1. **Não fatiar agora** — este bloco é planejamento do 2º lançamento. Fatiamento provável quando priorizado:

1. Migration: Attendant + TimeSlot + ScheduleAssignment.
2. Service: CRUD de atendentes e slots + validação de capacidade.
3. Service: alocação (com regra de capacidade e unique).
4. API routes.
5. UI: grade semanal + alocação + badges de ocupação.

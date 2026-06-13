# Fluxos de Tela — Education X (MVP)

> Telas navegáveis derivadas das **jornadas** (doc 02). Cada fluxo = sequência clicável.
> Visual: tema **Alfabeto** (doc 01) — azul `#0467DB`. Dados de exemplo PT-BR.
> Navegação por hotspots entre telas. Mobile-first onde a jornada é mobile (matrícula).

---

## Navegação global (telas internas — Admin IX / Fran)

- **Sidebar** fixa à esquerda: Dashboard · Matrículas · Cobranças · Negativação · Configurações
  - Logo "Education X" no topo (X em azul `#0467DB`); item ativo em azul.
- **Topbar:** seletor de escola atual + avatar do usuário.
- Layout: desktop-first para painel; matrícula do responsável é mobile-first.

---

## FLUXO A — Onboarding da escola (Admin IX) · desktop

> Jornada 1. Wizard de 4 passos.

| Tela | Conteúdo |
|------|----------|
| **A0 — Lista de escolas** | Tabela: Escola · CNPJ · Status (Ativa/Suspensa) · Cobranças/mês · Inadimplência. Botão primário "Nova escola". |
| **A1 — Dados da escola** | Stepper (1/4). Campos: nome, CNPJ (máscara), email, telefone, endereço completo. Botão "Próximo". |
| **A2 — Regras de cobrança** | Stepper (2/4). Dia de vencimento (1–28), dia de fechamento, multa % (default 2), juros % (default 1). |
| **A3 — Nota fiscal** | Stepper (3/4). Toggle "Emitir nota fiscal", inscrição municipal, código de serviço. |
| **A4 — Revisão + criar** | Stepper (4/4). Resumo de tudo. Botão "Criar escola". Estado de loading "Criando subconta...". |
| **A5 — Sucesso** | Ícone verde, "Kumon Camargos conectada — pronta para cobrar". Botões: "Importar alunos" · "Ir para o painel". |

**Hotspots:** A0→A1 (Nova escola) · A1→A2→A3→A4 (Próximo) · A4→A5 (Criar) · A5→Dashboard(C0).

---

## FLUXO B — Matrícula via link (Maria, responsável) · mobile-first

> Jornada 2. 4 passos + confirmação. Tela de celular.

| Tela | Conteúdo |
|------|----------|
| **B1 — Boas-vindas** | Topo com marca Education X + "Matrícula · Kumon Camargos". Texto curto de confiança. Botão "Começar". |
| **B2 — Meus dados** | Passo 1/4. Nome, CPF (máscara), email, telefone — todos obrigatórios, com hint. Teclado numérico em CPF/telefone. |
| **B3 — Dados do aluno** | Passo 2/4. Nome do aluno, data de nascimento, matérias (chips selecionáveis: Matemática, Português, Inglês). |
| **B4 — Plano** | Passo 3/4. Cards de plano (segmented: Mensal/Trimestral/Semestral/Anual). Valor calculado em destaque grande. |
| **B5 — Termos** | Passo 4/4. Resumo das regras (cobrança, multa, cancelamento) + texto completo expansível. Checkbox "Li e aceito". Botão "Enviar matrícula". |
| **B6 — Enviado** | Ícone sucesso. "Cadastro enviado! A escola vai confirmar e você recebe o boleto em breve." |

**Hotspots:** B1→B2→B3→B4→B5→B6. Botão "voltar" em cada passo.

---

## FLUXO C — Painel e cobranças (Fran, orientadora) · desktop

> Jornadas 3.

| Tela | Conteúdo |
|------|----------|
| **C0 — Dashboard** | 4 cards de métrica: "Recebido no mês" R$ 38.400 (verde) · "A vencer" R$ 12.600 (amarelo) · "Vencido" R$ 1.200 (vermelho) · "Alunos ativos" 84. Gráfico de barras (recebido 6 meses, azul). Lista "Próximos vencimentos" (5 itens). |
| **C1 — Matrículas pendentes** | Tabela: Aluno · Responsável · Plano · Recebido em · botão "Revisar". Badge "Pendente". |
| **C2 — Revisar matrícula** | Dados do responsável + aluno + plano. "Aceitou os termos em 02/06/2026 14:32". Botões "Aprovar" (primário) / "Recusar" (danger). |
| **C3 — Lista de cobranças** | Filtros (segmented chips): Todas · A vencer · Pagas · Vencidas. Tabela: Responsável · Aluno · Valor · Vencimento · Status (badge) · Forma. Botão "Nova cobrança extra". |
| **C4 — Detalhe da cobrança** | Valor grande + badge status. Bloco Pagamento: "Ver boleto (PDF)", linha digitável (copiar), QR PIX + copia-e-cola. Bloco Nota fiscal (se paga): nº, "Baixar PDF/XML". Bloco Histórico (emitida→enviada→paga). Ações: "Reenviar" · "Editar valor" · "Cancelar" (danger). |
| **C5 — Nova cobrança extra** | Busca responsável (por nome/CPF). Descrição (ex: "Multa de cancelamento"). Valor editável (R$). Desconto opcional (% ou fixo). Preview do total. Botão "Gerar cobrança". |

**Hotspots:** sidebar liga C0/C1/C3 · C1→C2 (Revisar) · C2→C1 (Aprovar) · C3→C4 (linha) · C3→C5 (Nova) · C5→C4.

**Badges de status (tema Alfabeto):**
- Paga = verde `#C5F0DE`/`#1D6B4F` · A vencer = amarelo `#FFF4D0`/`#8A6D1C`
- Vencida = vermelho `#FFD1D1`/`#8A1818` · Em contestação = amarelo

---

## FLUXO D — Inadimplência e negativação (Fran) · desktop

> Jornada 3 (fases 6–7).

| Tela | Conteúdo |
|------|----------|
| **D0 — Painel de negativação** | 3 cards: "Em aviso" 4 → R$ 2.100 · "Negativados" 2 → R$ 800 · "Regularizados (mês)" 3. Tabela de inadimplentes: Responsável · Valor · Dias em atraso · Status SPC (badge) · "Ver". |
| **D1 — Detalhe da negativação** | Timeline vertical: "Vencido 10/05" → "Aviso enviado 15/05" → "Negativado 22/05" → (futuro) "Regularizado". Dados do responsável + valor atualizado com multa/juros. Botões: "Pausar negativação" · "Não negativar (opt-out)". |

**Hotspots:** sidebar→D0 · D0→D1 (Ver) · D1→D0 (voltar).
**Badges SPC:** Em aviso (amarelo) · Negativado (vermelho) · Regularizado (verde).

---

## Componentes recorrentes (linguagem de UI p/ Stitch)

- **Botão primário:** fill azul `#0467DB`, texto branco, radius 10px, sombra leve.
- **Botão secundário:** outline azul, fundo branco.
- **Botão destrutivo:** fill vermelho `#EB0000`.
- **Badge de status:** pill (radius full), cores por estado (tabela acima).
- **Card de métrica:** número grande + label pequeno + ícone, fundo `#F5F5F7`, sombra leve.
- **Tabela:** linhas com hover, badge inline, ação à direita.
- **Stepper:** indicador de passo no topo dos wizards.
- **Segmented control:** filtros de cobrança e seleção de plano.
- **Sidebar:** navegação fixa, item ativo em azul.
- **Bottom sheet / modal:** confirmações (ex: cancelar cobrança).

---

## Mapa de navegação (resumo)

```
A0 Lista escolas → A1→A2→A3→A4→A5 Sucesso → C0 Dashboard
C0 ⇄ sidebar ⇄ {C1 pendentes, C3 cobranças, D0 negativação, Config}
C1 → C2 revisar → (aprova) C1
C3 → C4 detalhe ; C3 → C5 nova → C4
D0 → D1 detalhe
[Link externo] B1→B2→B3→B4→B5→B6  (responsável, mobile)
```

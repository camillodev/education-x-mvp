# Design Handoffs — Education X (MVP)

Handoffs de design para o **Claude Design**, um por spec do MVP. Cada arquivo traduz a spec técnica em **fluxo de telas para a persona dona/orientadora** — o que ela vê, o que faz, estados, campos, regras que afetam a UI.

## Formato: conciliar com o protótipo existente (não recriar)

Já existe um protótipo do Education X em andamento no Claude Design. Cada handoff começa com uma seção **"Como usar este handoff (conciliação)"** que instrui: localizar as telas que já existem, conciliar com a spec (manter o que bate, ajustar o que divergir, criar só o que faltar), e — quando houver conflito — **a spec vence** (é a fonte de verdade dos campos/regras).

## Como validar (uma por vez, não em bloco)

Leve **um handoff por vez** ao Claude Design, valide o fluxo visualmente, feche, siga pro próximo. Ordem recomendada (segue a dependência visual, não a numérica):

1. `mvp-01` onboarding — porta de entrada, define os tokens Alfabeto base
2. `mvp-03` cobrança — a **tela-hub**: NFS-e e negativação aparecem dentro dela
3. `mvp-04` NFS-e + `mvp-05` negativação — reusam a tela de cobrança
4. `mvp-02` matrícula — fluxo próprio
5. `mvp-06` transferência — tela isolada (`/financeiro`), a mais simples

> Ter os 6 prontos **não** obriga a disparar os 6 juntos. Serial por design.

## Persona única destes handoffs: dona/orientadora

A **dona/orientadora** é quem opera a escola: cadastra, cobra, negativa, transfere saldo. Tom de comunicação (do Notion de marca): *"falamos como você fala"* — informal, direto, zero jargão de tech. Ela não é dev; se não entendeu, o problema é da comunicação, não dela.

> O responsável/pai (persona mobile que paga) e a coordenadora aparecem em fluxos específicos (ex: matrícula via link), mas **estes handoffs focam na dona/orientadora** conforme decidido.

## Marca (tokens travados)

- **Cor primária:** Alfabeto azul `#0467DB` (não o verde IX — este produto usa o brand Alfabeto/Kumon).
- **Design System:** Alfabeto + shadcn/ui (composição). Reusar o que já existe no repo: onboarding wizard (`src/components/onboarding/`), `DataTable` (`src/components/patterns/`), átomos shadcn.
- **Breakpoints:** mobile 375 / tablet 768 / desktop 1440.
- **Idioma:** UI em pt-BR; valores sempre em reais na tela (centavos só no código). Datas DD/MM/AAAA.
- **PII sempre mascarada** na tela e nunca em log/URL (CPF `***.***.XXX-**`, etc.).

## Índice (ordem MVP)

| # | Handoff | Spec-fonte | Telas principais |
|---|---|---|---|
| 01 | [Onboarding da escola](mvp-01-onboarding.md) | `mvp-01-onboarding-escola.md` | wizard 4 passos |
| 02 | [Matrícula (assistida + aprovação)](mvp-02-matricula.md) | `mvp-02-matricula.md` | 4 passos + painel de aprovação |
| 03 | [Cobrança](mvp-03-cobranca.md) | `mvp-03-cobranca-automatica.md` | lista + detalhe da cobrança |
| 04 | [Nota fiscal + régua](mvp-04-nota-fiscal.md) | `mvp-04-nota-fiscal-regua.md` | config fiscal + status NFS-e |
| 05 | [Negativação (a cunha)](mvp-05-negativacao.md) | `mvp-05-negativacao.md` | painel 4 estados + modais |
| 06 | [Transferência de saldo](mvp-06-transferencia.md) | `mvp-06-transferencia-saldo.md` | `/financeiro` + modal saque |

## Como usar
Cada handoff é auto-suficiente: leve um arquivo ao Claude Design e peça as telas. O handoff diz **o quê** (fluxo, estados, regras); o Design decide **como** (layout, composição visual) dentro dos tokens Alfabeto.

> A spec técnica (`.specs/mvp-NN-*.md`) continua sendo a fonte de verdade dos **campos e regras**. O design ilustra, não redefine.

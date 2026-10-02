/* Education X — realistic PT-BR sample data */

const ESCOLAS = [
  { id: "camargos", nome: "Kumon Camargos", franquia: "Kumon", cnpj: "12.345.678/0001-90", status: "ativa", cobrancas: 84, inadimplencia: 3.1 },
  { id: "savassi", nome: "Kumon Savassi", franquia: "Kumon", cnpj: "09.871.234/0001-55", status: "ativa", cobrancas: 132, inadimplencia: 1.8 },
  { id: "pampulha", nome: "Cultura Inglesa Pampulha", franquia: "Cultura Inglesa", cnpj: "23.456.789/0001-10", status: "ativa", cobrancas: 67, inadimplencia: 5.4 },
  { id: "contagem", nome: "Wizard Contagem", franquia: "Wizard", cnpj: "34.567.890/0001-22", status: "suspensa", cobrancas: 0, inadimplencia: 0 },
  { id: "betim", nome: "Kumon Betim", franquia: "Kumon", cnpj: "45.678.901/0001-33", status: "ativa", cobrancas: 58, inadimplencia: 2.2 },
  { id: "lourdes", nome: "Cultura Inglesa Lourdes", franquia: "Cultura Inglesa", cnpj: "56.789.012/0001-44", status: "ativa", cobrancas: 95, inadimplencia: 4.7 },
  { id: "buritis", nome: "Wizard Buritis", franquia: "Wizard", cnpj: "67.890.123/0001-56", status: "ativa", cobrancas: 41, inadimplencia: 6.1 },
  { id: "centro", nome: "Kumon Centro", franquia: "Kumon", cnpj: "78.901.234/0001-67", status: "ativa", cobrancas: 110, inadimplencia: 1.2 },
  { id: "eldorado", nome: "Wizard Eldorado", franquia: "Wizard", cnpj: "89.012.345/0001-78", status: "suspensa", cobrancas: 0, inadimplencia: 0 },
  { id: "sion", nome: "Cultura Inglesa Sion", franquia: "Cultura Inglesa", cnpj: "90.123.456/0001-89", status: "ativa", cobrancas: 73, inadimplencia: 3.8 },
];

// Próximos vencimentos (dashboard)
const PROX_VENC = [
  { resp: "Carlos Andrade", aluno: "Beatriz Andrade", valor: 450, venc: "05/06", status: "avencer", forma: "Boleto" },
  { resp: "Patrícia Lopes", aluno: "Théo Lopes", valor: 380, venc: "05/06", status: "avencer", forma: "PIX" },
  { resp: "Maria Silva", aluno: "João Silva", valor: 450, venc: "07/06", status: "avencer", forma: "PIX" },
  { resp: "Rodrigo Nunes", aluno: "Helena Nunes", valor: 600, venc: "08/06", status: "avencer", forma: "Boleto" },
  { resp: "Fernanda Dias", aluno: "Miguel Dias", valor: 380, venc: "10/06", status: "avencer", forma: "PIX" },
];

// Matrículas — todos os pagantes (responsáveis) e alunos. Às vezes o aluno é o próprio pagante.
const MATRICULAS = [
  // ── Aguardando o responsável confirmar os dados (link enviado) ──
  { id: "w1", aluno: "Ana Júlia Castro", pagante: "Letícia Castro", selfPayer: false, cpf: "112.233.445-00", email: "leticia.castro@email.com", tel: "(31) 99111-2233",
    nascimento: "08/04/2016", materias: ["Matemática"], plano: "Mensal", valor: 450, status: "aguardando", recebido: "Hoje, 09:15", enviadoEm: "22/06/2026 09:15", expiraEm: "25/06/2026 09:15" },
  { id: "w2", aluno: "Lucas Ferraz", pagante: "Diego Ferraz", selfPayer: false, cpf: "556.677.889-00", email: "diego.ferraz@email.com", tel: "(31) 99777-8899",
    nascimento: "19/09/2015", materias: ["Matemática", "Inglês"], plano: "Trimestral", valor: 1281, status: "aguardando", recebido: "Ontem, 18:02", enviadoEm: "21/06/2026 18:02", expiraEm: "24/06/2026 18:02" },
  // ── Pendentes de aprovação (responsável confirmou — aguardando a escola) ──
  { id: "m1", aluno: "João Silva", pagante: "Maria Silva", selfPayer: false, cpf: "123.456.789-00", email: "maria.silva@email.com", tel: "(31) 98765-4321",
    nascimento: "14/03/2015", materias: ["Matemática", "Português"], plano: "Mensal", valor: 450, status: "pendente", recebido: "Hoje, 14:32", aceiteEm: "02/06/2026 14:32",
    origem: "manual", editado: ["E-mail", "Celular"] },
  { id: "m2", aluno: "Laura Campos", pagante: "Bruno Campos", selfPayer: false, cpf: "987.654.321-00", email: "bruno.campos@email.com", tel: "(31) 99812-3344",
    nascimento: "02/08/2014", materias: ["Inglês"], plano: "Trimestral", valor: 1140, status: "pendente", recebido: "Hoje, 11:08", aceiteEm: "02/06/2026 11:08", origem: "link" },
  { id: "m3", aluno: "Pedro Rocha", pagante: "Aline Rocha", selfPayer: false, cpf: "456.123.789-00", email: "aline.rocha@email.com", tel: "(31) 99440-1122",
    nascimento: "21/11/2016", materias: ["Matemática"], plano: "Mensal", valor: 380, status: "pendente", recebido: "Ontem, 17:45", aceiteEm: "01/06/2026 17:45" },
  // ── Ativas (matrícula aprovada, cobrança rodando) ──
  { id: "a1", aluno: "Beatriz Andrade", pagante: "Carlos Andrade", selfPayer: false, cpf: "222.333.444-00", email: "carlos.andrade@email.com", tel: "(31) 98800-1010",
    nascimento: "09/02/2014", materias: ["Matemática"], plano: "Mensal", valor: 450, status: "ativa", desde: "03/2025" },
  { id: "a2", aluno: "Théo Lopes", pagante: "Patrícia Lopes", selfPayer: false, cpf: "333.444.555-00", email: "patricia.lopes@email.com", tel: "(31) 99700-2020",
    nascimento: "17/06/2016", materias: ["Português"], plano: "Mensal", valor: 380, status: "ativa", desde: "08/2024" },
  { id: "a3", aluno: "Helena Nunes", pagante: "Rodrigo Nunes", selfPayer: false, cpf: "444.555.666-00", email: "rodrigo.nunes@email.com", tel: "(31) 98600-3030",
    nascimento: "30/11/2013", materias: ["Matemática", "Inglês"], plano: "Semestral", valor: 2430, status: "ativa", desde: "02/2025" },
  // ── Aluna adulta: ela mesma é a pagante ──
  { id: "a4", aluno: "Renata Alves", pagante: "Renata Alves", selfPayer: true, cpf: "555.666.777-00", email: "renata.alves@email.com", tel: "(31) 99500-4040",
    nascimento: "12/09/2001", materias: ["Inglês"], plano: "Trimestral", valor: 1281, status: "ativa", desde: "01/2026" },
  { id: "a5", aluno: "Miguel Dias", pagante: "Fernanda Dias", selfPayer: false, cpf: "666.777.888-00", email: "fernanda.dias@email.com", tel: "(31) 98400-5050",
    nascimento: "05/05/2015", materias: ["Matemática"], plano: "Mensal", valor: 380, status: "ativa", desde: "05/2025", semCadastro: true },
  // ── Canceladas (matrícula encerrada) ──
  { id: "x1", aluno: "Gabriel Moura", pagante: "Sílvia Moura", selfPayer: false, cpf: "777.888.999-00", email: "silvia.moura@email.com", tel: "(31) 98300-6060",
    nascimento: "19/07/2014", materias: ["Português"], plano: "Mensal", valor: 380, status: "cancelada", desde: "03/2024", canceladaEm: "04/2026", motivo: "Mudança de cidade" },
  { id: "x2", aluno: "Isabela Rocha", pagante: "Marcelo Rocha", selfPayer: false, cpf: "888.999.000-00", email: "marcelo.rocha@email.com", tel: "(31) 98200-7070",
    nascimento: "23/01/2016", materias: ["Matemática", "Inglês"], plano: "Trimestral", valor: 1140, status: "cancelada", desde: "08/2024", canceladaEm: "05/2026", motivo: "A pedido do responsável" },
];
const PENDENTES = MATRICULAS.filter((m) => m.status === "pendente");
const AGUARDANDO = MATRICULAS.filter((m) => m.status === "aguardando");

// ─── Contas a pagar (spec 10) ────────────────────────────────────────
// Categorias seed Kumon — criadas no onboarding da unidade (isSystem, DESPESA).
const FIN_CATEGORIAS = [
  { id: "cat_roy", nome: "Royalties da Franquia", kind: "DESPESA", isSystem: true, isActive: true },
  { id: "cat_alu", nome: "Aluguel",               kind: "DESPESA", isSystem: true, isActive: true },
  { id: "cat_mat", nome: "Material Didático",      kind: "DESPESA", isSystem: true, isActive: true },
  { id: "cat_sal", nome: "Salários",              kind: "DESPESA", isSystem: true, isActive: true },
  { id: "cat_mkt", nome: "Marketing",             kind: "DESPESA", isSystem: true, isActive: true },
  { id: "cat_asa", nome: "Taxas Asaas",           kind: "DESPESA", isSystem: true, isActive: true },
  { id: "cat_ene", nome: "Energia / Água / Internet", kind: "DESPESA", isSystem: true, isActive: true },
  { id: "cat_out", nome: "Outros",                kind: "DESPESA", isSystem: true, isActive: true },
];

const FORNECEDORES = [
  { id: "sup_imob", nome: "Imobiliária Tito Fulgêncio", doc: "04.112.998/0001-20" },
  { id: "sup_kumon", nome: "Instituto Kumon do Brasil", doc: "60.444.273/0001-09" },
  { id: "sup_cemig", nome: "CEMIG Distribuição", doc: "06.981.180/0001-16" },
  { id: "sup_vivo", nome: "Vivo Empresas", doc: "02.449.992/0001-64" },
  { id: "sup_supri", nome: "Suprilivros Material Didático", doc: "21.335.110/0001-77" },
  { id: "sup_meta", nome: "Meta Plataformas", doc: null },
];

// status: PENDING · PAID · OVERDUE (vencido + não pago) · CANCELLED. "hoje" = 22/06/2026.
const PAYABLES = [
  { id: "p_sal_jun", desc: "Salários · equipe Junho", categoria: "cat_sal", fornecedor: null, valor: 8500, venc: "2026-06-05", status: "PAID", pagoEm: "2026-06-05", pagoValor: 8500, comp: "2026-06", recorrente: true },
  { id: "p_alu_jun", desc: "Aluguel da unidade · Junho", categoria: "cat_alu", fornecedor: "sup_imob", valor: 2800, venc: "2026-06-10", status: "PAID", pagoEm: "2026-06-09", pagoValor: 2800, comp: "2026-06", recorrente: true },
  { id: "p_roy_jun", desc: "Royalties · maio (5,5% do faturamento)", categoria: "cat_roy", fornecedor: "sup_kumon", valor: 4180, venc: "2026-06-15", status: "PAID", pagoEm: "2026-06-15", pagoValor: 4180, comp: "2026-06", recorrente: true },
  { id: "p_mkt_jun", desc: "Campanha de matrículas · Meta Ads", categoria: "cat_mkt", fornecedor: "sup_meta", valor: 600, venc: "2026-06-16", status: "OVERDUE", comp: "2026-06", recorrente: false },
  { id: "p_mat_jun", desc: "Reposição de cadernos de exercícios", categoria: "cat_mat", fornecedor: "sup_supri", valor: 1350, venc: "2026-06-20", status: "PENDING", comp: "2026-06", recorrente: false },
  { id: "p_ene_jun", desc: "Energia (CEMIG) · Junho", categoria: "cat_ene", fornecedor: "sup_cemig", valor: 540, venc: "2026-06-25", status: "PENDING", comp: "2026-06", recorrente: true },
  { id: "p_net_jun", desc: "Internet + telefone (Vivo) · Junho", categoria: "cat_ene", fornecedor: "sup_vivo", valor: 320, venc: "2026-06-26", status: "PENDING", comp: "2026-06", recorrente: true },
  { id: "p_asa_jun", desc: "Taxas Asaas · boletos de Junho", categoria: "cat_asa", fornecedor: null, valor: 268, venc: "2026-06-28", status: "PENDING", comp: "2026-06", recorrente: true },
  { id: "p_sal_jul", desc: "Salários · equipe Julho", categoria: "cat_sal", fornecedor: null, valor: 8500, venc: "2026-07-05", status: "PENDING", comp: "2026-07", recorrente: true },
  { id: "p_alu_jul", desc: "Aluguel da unidade · Julho", categoria: "cat_alu", fornecedor: "sup_imob", valor: 2800, venc: "2026-07-10", status: "PENDING", comp: "2026-07", recorrente: true },
  { id: "p_roy_jul", desc: "Royalties · junho", categoria: "cat_roy", fornecedor: "sup_kumon", valor: 4350, venc: "2026-07-15", status: "PENDING", comp: "2026-07", recorrente: true },
  { id: "p_out_jun", desc: "Manutenção do ar-condicionado", categoria: "cat_out", fornecedor: null, valor: 380, venc: "2026-06-12", status: "CANCELLED", comp: "2026-06", recorrente: false },
];

// ─── Fluxo de caixa (spec 11) ─────────────────────────────────────
// Saldo âncora vem do Asaas (live). Entradas previstas = Invoices PENDING/OVERDUE
// (mensalidades a receber). Saídas previstas = PAYABLES PENDING/OVERDUE (acima).
// Regra crítica: itens PAID NÃO entram na projeção (já estão no saldo).
const CAIXA_SALDO_HOJE = 18450.0; // GET /finance/balance
const CAIXA_ENTRADAS = [
  { id: "in_1", desc: "Carlos Andrade · Mensalidade Junho", categoria: null, valor: 450, venc: "2026-06-23" },
  { id: "in_2", desc: "Maria Silva · Mensalidade Junho", categoria: null, valor: 450, venc: "2026-06-24" },
  { id: "in_3", desc: "Patrícia Lopes · Mensalidade Junho", categoria: null, valor: 380, venc: "2026-06-25" },
  { id: "in_4", desc: "Rodrigo Nunes · Mensalidade Junho", categoria: null, valor: 600, venc: "2026-06-28" },
  { id: "in_5", desc: "Fernanda Dias · Mensalidade Junho", categoria: null, valor: 380, venc: "2026-06-30" },
  { id: "in_6", desc: "Antônio Reis · Mensalidade Maio (em atraso)", categoria: null, valor: 600, venc: "2026-06-22" },
  { id: "in_7", desc: "Mensalidades · lote Julho (28 alunos)", categoria: null, valor: 12600, venc: "2026-07-10" },
  { id: "in_8", desc: "Mensalidades · lote Agosto (28 alunos)", categoria: null, valor: 12600, venc: "2026-08-10" },
];

// Cobranças — status: avencer (PENDING) · paga (PAID) · vencida (OVERDUE) · bloqueada (BLOCKED) · erro (ERROR) · cancelada (CANCELLED)
const COBRANCAS = [
  { id: "cob_8842", resp: "Maria Silva", aluno: "João Silva", materia: "Matemática", valor: 450, venc: "07/06/2026", status: "avencer", forma: "Boleto + PIX", desc: "Mensalidade Junho/2026", descontoTipo: "FIXED", descontoVal: 50 },
  { id: "cob_8831", resp: "Carlos Andrade", aluno: "Beatriz Andrade", materia: "Matemática", valor: 450, venc: "05/06/2026", status: "avencer", forma: "Boleto + PIX", desc: "Mensalidade Junho/2026" },
  { id: "cob_8790", resp: "Juliana Prado", aluno: "Heitor Prado", materia: "Português", valor: 380, venc: "28/05/2026", status: "vencida", forma: "Boleto + PIX", desc: "Mensalidade Maio/2026", atraso: 5 },
  { id: "cob_8765", resp: "Antônio Reis", aluno: "Sofia Reis", materia: "Inglês", valor: 600, venc: "20/05/2026", status: "vencida", forma: "Boleto + PIX", desc: "Mensalidade Maio/2026", atraso: 13 },
  { id: "cob_8744", resp: "Fernanda Dias", aluno: "Miguel Dias", materia: "Matemática", valor: 380, venc: "10/05/2026", status: "paga", forma: "Boleto + PIX", desc: "Mensalidade Maio/2026", pagoEm: "08/05/2026" },
  { id: "cob_8730", resp: "Rodrigo Nunes", aluno: "Helena Nunes", materia: "Matemática", valor: 600, venc: "10/05/2026", status: "paga", forma: "Boleto + PIX", desc: "Mensalidade Maio/2026", pagoEm: "09/05/2026" },
  { id: "cob_8722", resp: "Patrícia Lopes", aluno: "Théo Lopes", materia: "Português", valor: 380, venc: "10/05/2026", status: "paga", forma: "Boleto + PIX", desc: "Mensalidade Maio/2026", pagoEm: "10/05/2026" },
  { id: "cob_8701", resp: "Marcos Vieira", aluno: "Clara Vieira", materia: "Matemática", valor: 450, venc: "10/06/2026", status: "erro", forma: "Boleto + PIX", desc: "Mensalidade Junho/2026", erroMsg: "Asaas indisponível no momento da emissão" },
  { id: "cob_8698", resp: "Sílvia Moura", aluno: "Gabriel Moura", materia: "Português", valor: 380, venc: "10/06/2026", status: "bloqueada", forma: "—", desc: "Mensalidade Junho/2026" },
  { id: "cob_8681", resp: "Marcelo Rocha", aluno: "Isabela Rocha", materia: "Inglês", valor: 380, venc: "10/05/2026", status: "cancelada", forma: "Boleto + PIX", desc: "Mensalidade Maio/2026", canceladaEm: "05/05/2026" },
];

// Negativação / inadimplentes — a negativação é DECIDIDA pelo orientador, caso a caso.
// Status: emaviso (dentro do prazo legal) · elegivel (prazo cumprido, aguardando decisão) · negativado · regularizado
const INADIMPLENTES = [
  { id: "neg_1", resp: "Antônio Reis", aluno: "Sofia Reis", cpf: "321.654.987-00", valor: 600, valorAtualizado: 642.0, atraso: 13, status: "elegivel",
    venc: "20/05/2026", avisoEm: "27/05/2026", elegivelEm: "01/06/2026" },
  { id: "neg_5", resp: "Marcos Vieira", aluno: "Clara Vieira", cpf: "258.147.963-00", valor: 450, valorAtualizado: 472.5, atraso: 18, status: "elegivel",
    venc: "15/05/2026", avisoEm: "22/05/2026", elegivelEm: "01/06/2026" },
  { id: "neg_2", resp: "Juliana Prado", aluno: "Heitor Prado", cpf: "654.987.321-00", valor: 380, valorAtualizado: 391.4, atraso: 5, status: "emaviso",
    venc: "28/05/2026", avisoEm: "30/05/2026", prazoFim: "09/06/2026" },
  { id: "neg_3", resp: "Eduardo Matos", aluno: "Lívia Matos", cpf: "789.321.456-00", valor: 450, valorAtualizado: 489.0, atraso: 38, status: "negativado",
    venc: "25/04/2026", avisoEm: "02/05/2026", elegivelEm: "07/05/2026", negativadoEm: "09/05/2026" },
  { id: "neg_4", resp: "Sandra Melo", aluno: "Gabriel Melo", cpf: "147.258.369-00", valor: 350, valorAtualizado: 384.5, atraso: 45, status: "negativado",
    venc: "18/04/2026", avisoEm: "25/04/2026", elegivelEm: "30/04/2026", negativadoEm: "02/05/2026" },
];

const CHART_6M = [
  { label: "Jan", value: 31200 }, { label: "Fev", value: 33800 }, { label: "Mar", value: 35100 },
  { label: "Abr", value: 36900 }, { label: "Mai", value: 37600 }, { label: "Jun", value: 38400, highlight: true },
];

const PLANOS = [
  { id: "mensal", nome: "Mensal", parcela: 450, meses: 1, total: 450, desc: "Cobrança todo mês", badge: null },
  { id: "trimestral", nome: "Trimestral", parcela: 427, meses: 3, total: 1281, desc: "Assinatura trimestral · 5% off", badge: "5% off" },
  { id: "semestral", nome: "Semestral", parcela: 405, meses: 6, total: 2430, desc: "Assinatura semestral · 10% off", badge: "10% off" },
  { id: "anual", nome: "Anual", parcela: 360, meses: 12, total: 4320, desc: "Assinatura anual · 20% off", badge: "Melhor preço" },
];

// ─── Financeiro ──────────────────────────────────────────────────────────
// Saldo separado por origem: PIX/boleto cai na hora; cartão liquida em D+X.
const SALDO = {
  disponivel: 18450.0,        // já liberado, pronto para saque
  aLiberar: 9870.0,           // cartão em D+X, ainda preso
  pixRecebido: 18450.0,       // disponível agora (PIX + boleto compensado)
  cartaoPendente: 9870.0,     // cartão aguardando liquidação D+30/D+2
};

// Recebíveis de cartão a liberar (antecipáveis)
const RECEBIVEIS = [
  { id: "r1", origem: "Cartão", desc: "Mensalidades · lote 02/06", bruto: 3600.0, liberaEm: "02/07/2026", dias: 30 },
  { id: "r2", origem: "Cartão", desc: "Mensalidades · lote 28/05", bruto: 2940.0, liberaEm: "27/06/2026", dias: 25 },
  { id: "r3", origem: "Cartão", desc: "Mensalidades · lote 20/05", bruto: 2130.0, liberaEm: "19/06/2026", dias: 17 },
  { id: "r4", origem: "Cartão", desc: "Material didático · lote 15/05", bruto: 1200.0, liberaEm: "14/06/2026", dias: 12 },
];

// Extrato consolidado
const EXTRATO = [
  { id: "e1", tipo: "entrada", origem: "PIX", desc: "Patrícia Lopes · Mensalidade Maio", valor: 380, data: "Hoje, 09:12", status: "disponivel" },
  { id: "e2", tipo: "entrada", origem: "Boleto", desc: "Rodrigo Nunes · Mensalidade Maio", valor: 600, data: "Ontem, 16:40", status: "disponivel" },
  { id: "e3", tipo: "entrada", origem: "Cartão", desc: "Fernanda Dias · Mensalidade Maio", valor: 380, data: "Ontem, 11:05", status: "aliberar", liberaEm: "20/06" },
  { id: "e4", tipo: "saida", origem: "Saque", desc: "Transferência para conta ****-5521", valor: 12000, data: "01/06, 08:00", status: "concluido" },
  { id: "e5", tipo: "entrada", origem: "PIX", desc: "Maria Silva · Material didático", valor: 120, data: "31/05, 14:22", status: "disponivel" },
  { id: "e6", tipo: "entrada", origem: "Antecipação", desc: "Antecipação de recebíveis (líquido)", valor: 4180, data: "29/05, 10:15", status: "disponivel" },
];

// ─── Relatórios (dashboard) ──────────────────────────────────────────────
const REL_INADIMPLENCIA = [
  { label: "Jan", value: 4.2 }, { label: "Fev", value: 3.8 }, { label: "Mar", value: 3.5 },
  { label: "Abr", value: 3.6 }, { label: "Mai", value: 3.2 }, { label: "Jun", value: 3.1, highlight: true },
];
const REL_ALUNOS = [
  { label: "Jan", value: 71 }, { label: "Fev", value: 74 }, { label: "Mar", value: 77 },
  { label: "Abr", value: 79 }, { label: "Mai", value: 81 }, { label: "Jun", value: 84, highlight: true },
];
const REL_CHURN = [
  { label: "Jan", value: 2.8 }, { label: "Fev", value: 2.4 }, { label: "Mar", value: 3.1 },
  { label: "Abr", value: 2.0 }, { label: "Mai", value: 1.9 }, { label: "Jun", value: 1.6, highlight: true },
];
const RELATORIOS = [
  { id: "cobranca", nome: "Cobrança", icon: "receipt", desc: "Emitido, recebido e taxa de pagamento no prazo" },
  { id: "inadimplencia", nome: "Inadimplência", icon: "alert-circle", desc: "% em atraso e valores em aberto por período" },
  { id: "crescimento", nome: "Crescimento", icon: "trending-up", desc: "Novos alunos, receita recorrente e expansão" },
  { id: "churn", nome: "Churn", icon: "user-minus", desc: "Cancelamentos e retenção mês a mês" },
];

// Matérias & preços por escola — 4 planos opcionais (Mensal/Tri/Sem/Anual), valor sempre /mês, nunca multiplicado
const MATERIAS_POR_ESCOLA = {
  camargos: [
    { id: "mat_1", nome: "Matemática", codigo: "08.01", mensal: 450, trimestral: 405, semestral: 385, anual: 380 },
    { id: "mat_2", nome: "Português", codigo: "08.01", mensal: 380, trimestral: null, semestral: null, anual: 340 },
    { id: "mat_3", nome: "Inglês", codigo: "08.02", mensal: 600, trimestral: 540, semestral: null, anual: 510 },
  ],
  savassi: [
    { id: "mat_4", nome: "Matemática", codigo: "08.01", mensal: 420, trimestral: null, semestral: null, anual: 360 },
    { id: "mat_5", nome: "Português", codigo: "08.01", mensal: 350, trimestral: null, semestral: null, anual: null },
  ],
  pampulha: [
    { id: "mat_6", nome: "Inglês", codigo: "08.02", mensal: 690, trimestral: 630, semestral: 590, anual: 560 },
  ],
  betim: [
    { id: "mat_7", nome: "Matemática", codigo: "08.01", mensal: 400, trimestral: null, semestral: null, anual: 350 },
  ],
};

Object.assign(window, { ESCOLAS, PROX_VENC, MATRICULAS, PENDENTES, AGUARDANDO, COBRANCAS, INADIMPLENTES, CHART_6M, PLANOS, SALDO, RECEBIVEIS, EXTRATO, REL_INADIMPLENCIA, REL_ALUNOS, REL_CHURN, RELATORIOS, FIN_CATEGORIAS, FORNECEDORES, PAYABLES, CAIXA_SALDO_HOJE, CAIXA_ENTRADAS, MATERIAS_POR_ESCOLA });

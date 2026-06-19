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
  // ── Pendentes de aprovação ──
  { id: "m1", aluno: "João Silva", pagante: "Maria Silva", selfPayer: false, cpf: "123.456.789-00", email: "maria.silva@email.com", tel: "(31) 98765-4321",
    nascimento: "14/03/2015", materias: ["Matemática", "Português"], plano: "Mensal", valor: 450, status: "pendente", recebido: "Hoje, 14:32", aceiteEm: "02/06/2026 14:32" },
  { id: "m2", aluno: "Laura Campos", pagante: "Bruno Campos", selfPayer: false, cpf: "987.654.321-00", email: "bruno.campos@email.com", tel: "(31) 99812-3344",
    nascimento: "02/08/2014", materias: ["Inglês"], plano: "Trimestral", valor: 1140, status: "pendente", recebido: "Hoje, 11:08", aceiteEm: "02/06/2026 11:08" },
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
    nascimento: "05/05/2015", materias: ["Matemática"], plano: "Mensal", valor: 380, status: "ativa", desde: "05/2025" },
  // ── Canceladas (matrícula encerrada) ──
  { id: "x1", aluno: "Gabriel Moura", pagante: "Sílvia Moura", selfPayer: false, cpf: "777.888.999-00", email: "silvia.moura@email.com", tel: "(31) 98300-6060",
    nascimento: "19/07/2014", materias: ["Português"], plano: "Mensal", valor: 380, status: "cancelada", desde: "03/2024", canceladaEm: "04/2026", motivo: "Mudança de cidade" },
  { id: "x2", aluno: "Isabela Rocha", pagante: "Marcelo Rocha", selfPayer: false, cpf: "888.999.000-00", email: "marcelo.rocha@email.com", tel: "(31) 98200-7070",
    nascimento: "23/01/2016", materias: ["Matemática", "Inglês"], plano: "Trimestral", valor: 1140, status: "cancelada", desde: "08/2024", canceladaEm: "05/2026", motivo: "A pedido do responsável" },
];
const PENDENTES = MATRICULAS.filter((m) => m.status === "pendente");

// Cobranças
const COBRANCAS = [
  { id: "cob_8842", resp: "Maria Silva", aluno: "João Silva", valor: 450, venc: "07/06/2026", status: "avencer", forma: "PIX", desc: "Mensalidade Junho/2026" },
  { id: "cob_8831", resp: "Carlos Andrade", aluno: "Beatriz Andrade", valor: 450, venc: "05/06/2026", status: "avencer", forma: "Boleto", desc: "Mensalidade Junho/2026" },
  { id: "cob_8790", resp: "Juliana Prado", aluno: "Heitor Prado", valor: 380, venc: "28/05/2026", status: "vencida", forma: "Boleto", desc: "Mensalidade Maio/2026", atraso: 5 },
  { id: "cob_8765", resp: "Antônio Reis", aluno: "Sofia Reis", valor: 600, venc: "20/05/2026", status: "vencida", forma: "PIX", desc: "Mensalidade Maio/2026", atraso: 13 },
  { id: "cob_8744", resp: "Fernanda Dias", aluno: "Miguel Dias", valor: 380, venc: "10/05/2026", status: "paga", forma: "PIX", desc: "Mensalidade Maio/2026", pagoEm: "08/05/2026" },
  { id: "cob_8730", resp: "Rodrigo Nunes", aluno: "Helena Nunes", valor: 600, venc: "10/05/2026", status: "paga", forma: "Boleto", desc: "Mensalidade Maio/2026", pagoEm: "09/05/2026" },
  { id: "cob_8722", resp: "Patrícia Lopes", aluno: "Théo Lopes", valor: 380, venc: "10/05/2026", status: "paga", forma: "PIX", desc: "Mensalidade Maio/2026", pagoEm: "10/05/2026" },
  { id: "cob_8701", resp: "Marcos Vieira", aluno: "Clara Vieira", valor: 450, venc: "10/05/2026", status: "contestacao", forma: "Boleto", desc: "Mensalidade Maio/2026" },
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

Object.assign(window, { ESCOLAS, PROX_VENC, MATRICULAS, PENDENTES, COBRANCAS, INADIMPLENTES, CHART_6M, PLANOS, SALDO, RECEBIVEIS, EXTRATO, REL_INADIMPLENCIA, REL_ALUNOS, REL_CHURN, RELATORIOS });

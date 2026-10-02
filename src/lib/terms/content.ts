import type { TermsKind } from '@prisma/client'

export interface TermsDocument {
  kind: TermsKind
  version: string
  body: string
}

export const TERMS_DOCUMENTS: TermsDocument[] = [
  {
    kind: 'IX_ESCOLA',
    version: '1.0',
    body: `# Termos de Uso — Impact X e Escola

**Versão 1.0 — Junho de 2026**

## 1. Partes

**Impact X Tecnologia Ltda.** ("Impact X", CNPJ em constituição), operadora da plataforma Education X, doravante "Operadora".

**A escola franqueada cadastrada** ("Escola"), doravante "Controladora".

## 2. Objeto

A Impact X disponibiliza a plataforma Education X para gestão financeira escolar (matrícula, cobrança, nota fiscal, negativação). A Escola utiliza a plataforma para gerir os relacionamentos financeiros com seus responsáveis.

## 3. Responsabilidades e Isenção de Responsabilidade da Operadora

### 3.1 A Escola é a Controladora dos dados pessoais

Nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), **a Escola é a Controladora** dos dados pessoais de seus responsáveis e alunos. A Impact X atua exclusivamente como **Operadora**, processando os dados em nome e por instrução da Escola.

### 3.2 Isenção da Operadora

A Impact X **não se responsabiliza** por:

a) Dívidas, inadimplências ou relações jurídicas entre a Escola e seus responsáveis;
b) Emissão de notas fiscais com dados incorretos fornecidos pela Escola;
c) Cobranças realizadas com valores, vencimentos ou condições definidos pela Escola;
d) Negativações realizadas a pedido da Escola com base em informações por ela fornecidas;
e) Qualquer relação pedagógica, contratual ou financeira entre a Escola e seus alunos/responsáveis.

### 3.3 Responsabilidade da Escola

A Escola é responsável por:

a) Manter os dados de alunos e responsáveis atualizados e corretos;
b) Definir valores, vencimentos e condições de cobrança em conformidade com a legislação;
c) Obter o consentimento adequado dos responsáveis conforme a LGPD;
d) Garantir que negativações sejam realizadas apenas em casos de inadimplência comprovada e legal;
e) Responder a solicitações de titulares de dados (direitos LGPD art. 18) em até 15 dias.

## 4. Dados Pessoais e LGPD

A Impact X processa dados pessoais exclusivamente para viabilizar as funcionalidades contratadas, sem qualquer uso secundário (marketing, venda de dados, perfilamento externo). O processamento segue as instruções da Escola Controladora.

## 5. Plataforma de Pagamentos

Os pagamentos são processados pela **Asaas Gestão Financeira S.A.** (CNPJ 19.540.550/0001-21), sujeita à regulamentação do Banco Central do Brasil. A Impact X não guarda dados de cartão de crédito — apenas tokens fornecidos pela Asaas.

## 6. Vigência e Rescisão

Estes termos vigoram enquanto a Escola utilizar a plataforma. A Escola pode encerrar o uso a qualquer momento; os dados serão retidos pelo prazo legal de obrigação fiscal (5 anos) e após anonimizados.

## 7. Foro

Fica eleito o foro da Comarca de Belo Horizonte — MG para dirimir quaisquer conflitos.

---
*Impact X Tecnologia Ltda. — contato: suporte@impactxlab.com*`,
  },
  {
    kind: 'ESCOLA_RESPONSAVEL',
    version: '1.0',
    body: `# Termos de Uso — Escola e Responsável Financeiro

**Versão 1.0 — Junho de 2026**

## 1. Objeto

Este documento regula as condições financeiras entre a Escola e o Responsável Financeiro pelo aluno matriculado.

## 2. Mensalidades e Vencimentos

- O valor da mensalidade e o dia de vencimento são definidos no momento da matrícula.
- O vencimento pode ser alterado mediante solicitação com antecedência mínima de 5 dias úteis.

## 3. Inadimplência

Em caso de atraso no pagamento:

a) **Multa** de até 2% sobre o valor da mensalidade;
b) **Juros moratórios** de até 1% ao mês (pro rata die);
c) Após 30 dias de atraso, a Escola poderá acionar serviços de proteção ao crédito (SPC/Serasa), se assim configurado.

## 4. Negativação

A inclusão em órgãos de proteção ao crédito somente ocorrerá:

a) Após notificação prévia ao Responsável com prazo mínimo de 10 dias;
b) Em caso de inadimplência comprovada;
c) Respeitando os limites legais de cobrança.

O Responsável pode regularizar a situação a qualquer momento, e a exclusão do cadastro restritivo ocorrerá em até 5 dias úteis após a quitação.

## 5. Cancelamento

O cancelamento da matrícula deve ser solicitado com antecedência mínima de 30 dias. Valores já cobrados no ciclo vigente não são reembolsáveis.

## 6. Dados Pessoais

Os dados do Responsável e do Aluno são utilizados exclusivamente para fins de gestão financeira da matrícula, conforme a LGPD. Para exercer direitos (acesso, correção, exclusão), entre em contato com a Escola ou com suporte@impactxlab.com.

## 7. Aceite

Ao confirmar a matrícula e aceitar estes termos, o Responsável concorda com todas as condições acima.`,
  },
  {
    kind: 'PRIVACY',
    version: '1.0',
    body: `# Política de Privacidade — Education X

**Versão 1.0 — Junho de 2026**

## 1. Quem somos

**Impact X Tecnologia Ltda.** opera a plataforma Education X, utilizada por escolas para gestão financeira de matrículas. Atuamos como **Operadora de dados** em nome das escolas (Controladoras).

## 2. Quais dados coletamos

| Dado | De quem | Finalidade |
|------|---------|------------|
| Nome, CPF, e-mail, telefone | Responsável financeiro | Cobrança, emissão de nota fiscal |
| Nome, data de nascimento | Aluno (menor de idade) | Identificação na matrícula |
| Endereço | Responsável | Negativação, nota fiscal |
| Histórico de pagamento | Responsável | Gestão financeira da escola |

## 3. Base legal (LGPD)

- **Execução de contrato** (art. 7º, V): processamento necessário para cobrar mensalidades e emitir notas fiscais.
- **Obrigação legal** (art. 7º, II): retenção de dados fiscais pelo prazo legal (5 anos).
- **Legítimo interesse** (art. 7º, IX): comunicações relacionadas à matrícula.

## 4. Compartilhamento

Compartilhamos dados apenas com:

- **Asaas Gestão Financeira S.A.** — processamento de pagamentos (sub-operadora necessária)
- **Prefeitura municipal** — emissão de notas fiscais (NFS-e), quando aplicável

Não vendemos nem compartilhamos dados para fins de marketing ou perfilamento.

## 5. Dados de menores

Os dados de alunos menores de idade são coletados com o consentimento do Responsável no ato da matrícula, conforme exigido pelo art. 14 da LGPD.

## 6. Segurança

- Dados sensíveis (CPF, e-mail, telefone) são criptografados em repouso (AES-256-GCM).
- Dados de cartão de crédito nunca são armazenados — apenas tokens da Asaas.
- Acesso à plataforma é protegido por autenticação (Clerk).

## 7. Seus direitos (LGPD, art. 18)

Você tem direito a: acesso, correção, exclusão, portabilidade e informação sobre compartilhamento dos seus dados. Para exercer esses direitos, contate: **suporte@impactxlab.com** ou WhatsApp da escola.

Prazo de resposta: até **15 dias** (conforme art. 19 da LGPD).

## 8. Retenção e exclusão

Dados financeiros são retidos pelo prazo legal de 5 anos. Após esse período, são anonimizados. Dados não financeiros podem ser excluídos a pedido, salvo obrigação legal.

## 9. Contato

**DPO / Encarregado de Dados:** suporte@impactxlab.com

---
*Esta política pode ser atualizada. A versão vigente sempre estará disponível na plataforma.*`,
  },
]

export function getTermsByKind(kind: TermsKind): TermsDocument | undefined {
  return TERMS_DOCUMENTS.find((t) => t.kind === kind)
}

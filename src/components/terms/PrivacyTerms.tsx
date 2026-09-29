export function PrivacyTerms() {
  return (
    <>
      <p>
        <strong>Versão 1.0 — Junho de 2026</strong>
      </p>

      <h2>1. Quem somos</h2>
      <p>
        <strong>Impact X Tecnologia Ltda.</strong> opera a plataforma Education X, utilizada
        por escolas para gestão financeira de matrículas. Atuamos como{' '}
        <strong>Operadora de dados</strong> em nome das escolas (Controladoras).
      </p>

      <h2>2. Quais dados coletamos</h2>
      <table>
        <thead>
          <tr>
            <th>Dado</th>
            <th>De quem</th>
            <th>Finalidade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nome, CPF, e-mail, telefone</td>
            <td>Responsável financeiro</td>
            <td>Cobrança, emissão de nota fiscal</td>
          </tr>
          <tr>
            <td>Nome, data de nascimento</td>
            <td>Aluno (menor de idade)</td>
            <td>Identificação na matrícula</td>
          </tr>
          <tr>
            <td>Endereço</td>
            <td>Responsável</td>
            <td>Negativação, nota fiscal</td>
          </tr>
          <tr>
            <td>Histórico de pagamento</td>
            <td>Responsável</td>
            <td>Gestão financeira da escola</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Base legal (LGPD)</h2>
      <ul>
        <li>
          <strong>Execução de contrato</strong> (art. 7º, V): processamento necessário para
          cobrar mensalidades e emitir notas fiscais.
        </li>
        <li>
          <strong>Obrigação legal</strong> (art. 7º, II): retenção de dados fiscais pelo prazo
          legal (5 anos).
        </li>
        <li>
          <strong>Legítimo interesse</strong> (art. 7º, IX): comunicações relacionadas à
          matrícula.
        </li>
      </ul>

      <h2>4. Compartilhamento</h2>
      <p>Compartilhamos dados apenas com:</p>
      <ul>
        <li>
          <strong>Asaas Gestão Financeira S.A.</strong> — processamento de pagamentos
          (sub-operadora necessária)
        </li>
        <li>
          <strong>Prefeitura municipal</strong> — emissão de notas fiscais (NFS-e), quando
          aplicável
        </li>
      </ul>
      <p>Não vendemos nem compartilhamos dados para fins de marketing ou perfilamento.</p>

      <h2>5. Dados de menores</h2>
      <p>
        Os dados de alunos menores de idade são coletados com o consentimento do Responsável no
        ato da matrícula, conforme exigido pelo art. 14 da LGPD.
      </p>

      <h2>6. Segurança</h2>
      <ul>
        <li>Dados sensíveis (CPF, e-mail, telefone) são criptografados em repouso (AES-256-GCM).</li>
        <li>Dados de cartão de crédito nunca são armazenados — apenas tokens da Asaas.</li>
        <li>Acesso à plataforma é protegido por autenticação (Clerk).</li>
      </ul>

      <h2>7. Seus direitos (LGPD, art. 18)</h2>
      <p>
        Você tem direito a: acesso, correção, exclusão, portabilidade e informação sobre
        compartilhamento dos seus dados. Para exercer esses direitos, contate:{' '}
        <strong>suporte@impactxlab.com</strong> ou WhatsApp da escola.
      </p>
      <p>
        Prazo de resposta: até <strong>15 dias</strong> (conforme art. 19 da LGPD).
      </p>

      <h2>8. Retenção e exclusão</h2>
      <p>
        Dados financeiros são retidos pelo prazo legal de 5 anos. Após esse período, são
        anonimizados. Dados não financeiros podem ser excluídos a pedido, salvo obrigação legal.
      </p>

      <h2>9. Contato</h2>
      <p>
        <strong>DPO / Encarregado de Dados:</strong> suporte@impactxlab.com
      </p>

      <hr />
      <p>
        <em>
          Esta política pode ser atualizada. A versão vigente sempre estará disponível na
          plataforma.
        </em>
      </p>
    </>
  )
}

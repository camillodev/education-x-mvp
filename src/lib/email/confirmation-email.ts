import { Resend } from 'resend'

interface ConfirmationEmailParams {
  to: string
  responsibleName: string
  schoolName: string
  confirmUrl: string
}

const FROM = process.env.RESEND_FROM ?? 'Education X <onboarding@resend.dev>'

/**
 * Sends the terms-acceptance confirmation email to the school's responsible.
 * If RESEND_API_KEY is absent (dev/sandbox), logs the link instead of sending —
 * keeps the flow unblocked without requiring a real key.
 * Never throws on send failure: onboarding must not roll back because email failed.
 */
export async function sendConfirmationEmail(params: ConfirmationEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.info(
      `[email:dev] Sem RESEND_API_KEY — link de confirmação para ${params.to}: ${params.confirmUrl}`
    )
    return
  }

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Confirme o cadastro da ${params.schoolName} na Education X`,
      html: buildHtml(params),
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] Falha ao enviar e-mail de confirmação:', err)
  }
}

function buildHtml({ responsibleName, schoolName, confirmUrl }: ConfirmationEmailParams): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#0467DB;padding:24px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;">Education X</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Olá, ${responsibleName}</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
                  A <strong>${schoolName}</strong> foi cadastrada na plataforma Education X.
                  Para ativar a conta, confirme que você leu e aceita os termos de uso e a
                  política de privacidade da plataforma.
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#374151;">
                  Esta confirmação é necessária antes de qualquer cobrança ser emitida.
                </p>
                <a href="${confirmUrl}" style="display:inline-block;background:#0467DB;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
                  Revisar e confirmar
                </a>
                <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
                  Se o botão não funcionar, copie e cole este link no navegador:<br/>
                  <span style="color:#0467DB;word-break:break-all;">${confirmUrl}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">
                  Você recebeu este e-mail porque foi indicado como responsável pela ${schoolName}.
                  A Impact X atua como operadora dos dados; a escola é a controladora.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

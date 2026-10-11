// Asaas sends "YYYY-MM-DD HH:mm:ss" with no offset; treat it as UTC so the process timezone never matters.
export function parseAsaasDateTime(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z')
}

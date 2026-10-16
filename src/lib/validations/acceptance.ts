import { z } from "zod";

export const AcceptanceStepSchema = z.object({
  accepted: z.boolean().refine(
    (value) => value,
    "É preciso ler e aceitar o contrato para enviar a matrícula.",
  ),
});

export type AcceptanceStepInput = z.input<typeof AcceptanceStepSchema>;

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnrollmentForm } from "@/features/enrollment/enrollment-form";
import { createEmptyEnrollmentFormValues } from "@/features/enrollment/enrollment-form.schema";
import type { EnrollmentPlan } from "@/lib/mock/types";

const plans: EnrollmentPlan[] = [{
  id: "mensal",
  nome: "Mensal",
  parcela: 45000,
  meses: 1,
  total: 45000,
  desc: "Cobrança mensal",
}];

afterEach(() => vi.unstubAllGlobals());

describe("EnrollmentForm", () => {
  it("shows validation errors before allowing navigation to the plan step", async () => {
    const user = userEvent.setup();
    render(
      <EnrollmentForm
        mode="create"
        initialValues={createEmptyEnrollmentFormValues()}
        plans={plans}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Continuar para plano" }),
    );

    expect(await screen.findByText("Informe o nome completo."))
      .toBeInTheDocument();
    expect(screen.getByText("Informe um CPF ou CNPJ válido."))
      .toBeInTheDocument();
    expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(screen.getByText("Informe um celular válido com DDD."))
      .toBeInTheDocument();
    expect(screen.getByText("Informe o nome completo do aluno."))
      .toBeInTheDocument();
  });

  it("validates all required guardian and student fields and submits from the plan step", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <EnrollmentForm
        mode="create"
        initialValues={createEmptyEnrollmentFormValues()}
        plans={plans}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    await user.type(
      document.getElementById("guardian-name")!,
      "Maria da Silva",
    );
    await user.type(
      document.getElementById("guardian-document")!,
      "52998224725",
    );
    await user.type(
      document.getElementById("guardian-email")!,
      "maria@example.com",
    );
    await user.type(document.getElementById("guardian-mobile")!, "31999990000");
    await user.type(
      document.getElementById("student-0-name")!,
      "João da Silva",
    );
    await user.type(
      document.getElementById("student-0-birth-date")!,
      "15032015",
    );
    await user.type(
      document.getElementById("student-0-email")!,
      "joao@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "Continuar para plano" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Enviar para confirmação" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].guardian.cpfCnpj).toBe("529.982.247-25");
    expect(onSave.mock.calls[0][0].students[0].email).toBe("joao@example.com");
  });

  it("fills address data from CEP without overwriting a manually entered street", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            cep: "01001-000",
            logradouro: "Praça da Sé",
            complemento: "",
            bairro: "Sé",
            localidade: "São Paulo",
            uf: "SP",
            erro: false,
          }),
          { status: 200 },
        ),
      ),
    );
    render(
      <EnrollmentForm
        mode="create"
        initialValues={createEmptyEnrollmentFormValues()}
        plans={plans}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await user.type(
      document.getElementById("guardian-address")!,
      "Rua digitada manualmente",
    );
    await user.type(
      document.getElementById("guardian-postal-code")!,
      "01001000",
    );

    await waitFor(() =>
      expect(document.getElementById("guardian-city")).toHaveValue("São Paulo")
    );
    expect(document.getElementById("guardian-address")).toHaveValue(
      "Rua digitada manualmente",
    );
    expect(document.getElementById("guardian-province")).toHaveValue("Sé");
  });
});

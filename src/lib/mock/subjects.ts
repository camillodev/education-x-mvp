import type { Subject } from "./types";

export const SUBJECTS: Subject[] = [
  { id: "matematica", label: "Matemática", colorToken: "--color-subject-math" },
  { id: "portugues", label: "Português", colorToken: "--color-subject-portuguese" },
  { id: "ingles", label: "Inglês", colorToken: "--color-subject-english" },
  { id: "japones", label: "Japonês", colorToken: "--color-subject-japanese" },
];

const LABEL_TO_ID: Record<string, Subject["id"]> = {
  Matemática: "matematica",
  Português: "portugues",
  Inglês: "ingles",
  Japonês: "japones",
};

export function subjectIdFromLabel(label: string): Subject["id"] {
  const id = LABEL_TO_ID[label];
  if (!id) throw new Error(`Matéria desconhecida: ${label}`);
  return id;
}

export function subjectLabel(id: Subject["id"]): string {
  return SUBJECTS.find((s) => s.id === id)?.label ?? id;
}

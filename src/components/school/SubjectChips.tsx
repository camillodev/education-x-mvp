"use client";

import { SUBJECTS } from "@/lib/mock/subjects";
import type { SubjectId } from "@/lib/mock/types";

interface SubjectChipsProps {
  value: SubjectId[];
  onChange: (value: SubjectId[]) => void;
  label?: string;
}

/** Seleção múltipla de matérias, colorida pelos tokens de matéria. */
export function SubjectChips({ value, onChange, label = "Matérias" }: SubjectChipsProps) {
  const toggle = (id: SubjectId) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div>
      <label className="mb-2.5 block text-[13px] font-semibold text-(--color-text-muted-strong)">
        {label}
      </label>
      <div className="flex flex-wrap gap-2.5">
        {SUBJECTS.map((subject) => {
          const active = value.includes(subject.id);
          const color = `var(${subject.colorToken})`;
          return (
            <button
              key={subject.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(subject.id)}
              className="inline-flex h-10 cursor-pointer items-center gap-[7px] rounded-full border-[1.5px] px-4 text-[14.5px] font-semibold transition-all duration-150"
              style={
                active
                  ? { borderColor: color, background: color, color: "#fff" }
                  : {
                      borderColor: "var(--color-border-input)",
                      background: "var(--color-bg)",
                      color: "var(--color-text-muted)",
                    }
              }
            >
              <span
                className="h-[9px] w-[9px] shrink-0 rounded-full"
                style={{ background: active ? "#fff" : color }}
              />
              {subject.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

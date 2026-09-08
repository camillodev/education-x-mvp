import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

interface StoryBannerProps {
  /** Nome do ícone lucide em kebab-case. */
  icon: string;
  color: string;
  bg: string;
  children: ReactNode;
}

/** Faixa que dá a leitura do gráfico em uma frase — o "story" do dado. */
export function StoryBanner({ icon, color, bg, children }: StoryBannerProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-(--radius-md) px-4 py-3.5"
      style={{ background: bg }}
    >
      <span
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-(--color-bg)"
        style={{ color }}
      >
        <Icon name={icon} size={20} />
      </span>
      <p className="m-0 text-[14.5px] leading-snug font-semibold text-(--color-text)">
        {children}
      </p>
    </div>
  );
}

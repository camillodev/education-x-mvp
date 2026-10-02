import * as React from "react";
import * as LucideIcons from "lucide-react";

export interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function Icon({ name, size = 18, strokeWidth = 2, className }: IconProps) {
  const pascalName = toPascalCase(name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (LucideIcons as Record<string, any>)[pascalName] as React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> | undefined;

  if (!IconComponent) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Icon] ícone "${name}" (${pascalName}) não encontrado em lucide-react`);
    }
    return null;
  }

  return <IconComponent size={size} strokeWidth={strokeWidth} className={className} />;
}

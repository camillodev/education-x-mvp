'use client'

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-(--color-primary) text-(--color-text-on-primary) hover:bg-(--color-primary-hover)",
        secondary:
          "border-[1.5px] border-(--color-secondary-bd) bg-white text-(--color-secondary-fg) hover:bg-(--color-secondary-hover)",
        tertiary:
          "bg-transparent text-(--color-text) hover:bg-(--color-tertiary-hover)",
        danger:
          "bg-(--color-danger) text-(--color-text-on-primary) hover:bg-(--color-danger-hover)",
        "danger-outline":
          "border-[1.5px] border-(--color-danger) bg-transparent text-(--color-danger) hover:bg-(--color-danger-soft)",
      },
      size: {
        sm: "h-[34px] px-3 text-xs",
        md: "h-[42px] px-4",
        lg: "h-[50px] px-6 text-base",
        icon: "h-[42px] w-[42px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  iconLeft?: string;
  iconRight?: string;
  block?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, iconLeft, iconRight, block, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), block && "w-full", className)}
        ref={ref}
        {...props}
      >
        {iconLeft && <Icon name={iconLeft} size={16} />}
        {children}
        {iconRight && <Icon name={iconRight} size={16} />}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

// Novos componentes
export { Card } from "./Card";
export type { CardProps } from "./Card";
export { Icon } from "./Icon";
export type { IconProps } from "./Icon";
export { Chip } from "./Chip";
export type { ChipProps } from "./Chip";
export { Metric } from "./Metric";
export type { MetricProps } from "./Metric";
export { BarChart } from "./BarChart";
export type { BarChartProps, BarDatum } from "./BarChart";

// Substituídos / atualizados
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";
export { Badge, StatusBadge, STATUS } from "./badge";
export type { BadgeProps, StatusBadgeProps } from "./badge";
export { Segmented, SegmentedCard } from "./segmented";
export type { SegmentedProps, SegmentedOption, SegmentedCardProps, SegmentedCardOption } from "./segmented";

// Revisados (pequenas correções)
export { Avatar, initials } from "./avatar";
export type { AvatarProps } from "./avatar";
export { Input } from "./input";
export type { InputProps } from "./input";
export { Field } from "./field";
export { Toggle } from "./toggle";

// Mantidos sem mudança (shadcn primitivos)
export * from "./dialog";
export * from "./table";
export { ToastProvider, useToast } from "./toast";
export * from "./popover";
export * from "./command";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[0_1fr] has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] gap-x-3 items-start [&>svg]:size-4", { variants: { variant: { default: "bg-card text-card-foreground", destructive: "text-destructive bg-card [&>svg]:text-current" } }, defaultVariants: { variant: "default" } });
function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) { return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />; }
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="alert-title" className={cn("col-start-2 line-clamp-1 min-h-4 font-medium", className)} {...props} />; }
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="alert-description" className={cn("text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm", className)} {...props} />; }
export { Alert, AlertTitle, AlertDescription };

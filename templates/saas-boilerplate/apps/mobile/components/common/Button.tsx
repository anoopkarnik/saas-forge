import React from "react";
import {
    TouchableOpacity,
    TouchableOpacityProps,
    ActivityIndicator,
} from "react-native";
import { Label } from "./Typography";

type ButtonVariant = "primary" | "outline" | "ghost" | "link";

export type ButtonProps = TouchableOpacityProps & {
    variant?: ButtonVariant;
    label: string;
    loading?: boolean;
    className?: string;
};

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        "h-10 w-full items-center justify-center rounded-md bg-primary hover:opacity-80",
    outline:
        "h-10 w-full flex-row items-center justify-center rounded-md bg-sidebar/50 hover:opacity-80",
    ghost: "hover:opacity-80",
    link: ""
};

const labelStyles: Record<ButtonVariant, string> = {
    primary: "text-sm font-medium text-primary-foreground",
    outline: "text-sm font-medium text-foreground",
    ghost: "text-sm font-medium text-primary",
    link: "text-xs font-medium text-primary"
};

export const Button = ({
    variant = "primary",
    label,
    loading = false,
    className = "",
    ...props
}: ButtonProps) => {
    return (
        <TouchableOpacity
            className={`${variantStyles[variant]} ${className}`}
            activeOpacity={variant === "ghost" ? 0.6 : 0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color="hsl(0 0% 98%)" size="small" />
            ) : (
                <Label className={labelStyles[variant]}>{label}</Label>
            )}
        </TouchableOpacity>
    );
};

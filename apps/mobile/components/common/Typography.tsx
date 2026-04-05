import React from "react";
import { Text, TextProps } from "react-native";

export type TypographyProps = TextProps & {
    className?: string;
    children: React.ReactNode;
};

export const Heading = ({ className = "", children, ...props }: TypographyProps) => (
    <Text
        className={`text-3xl font-bold tracking-tight text-center text-foreground ${className}`}
        {...props}
    >
        {children}
    </Text>
);

export const Subtitle = ({ className = "", children, ...props }: TypographyProps) => (
    <Text
        className={`text-sm text-muted-foreground text-center mt-1 ${className}`}
        {...props}
    >
        {children}
    </Text>
);

export const Label = ({ className = "", children, ...props }: TypographyProps) => (
    <Text
        className={`text-sm font-medium text-foreground ${className}`}
        {...props}
    >
        {children}
    </Text>
);

export const ErrorText = ({ className = "", children, ...props }: TypographyProps) => (
    <Text
        className={`text-xs text-destructive mt-1 ${className}`}
        {...props}
    >
        {children}
    </Text>
);

export const MutedText = ({ className = "", children, ...props }: TypographyProps) => (
    <Text
        className={`text-sm text-muted-foreground ${className}`}
        {...props}
    >
        {children}
    </Text>
);

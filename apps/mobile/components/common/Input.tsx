import React from "react";
import { TextInput, TextInputProps } from "react-native";

export type InputProps = TextInputProps & {
    className?: string;
};

export const Input = ({ className = "", ...props }: InputProps) => {
    return (
        <TextInput
            className={`h-10 w-full rounded-md bg-sidebar/50 px-3 text-sm text-foreground ${className}`}
            placeholderTextColor="hsl(240 3.8% 46.1%)"
            {...props}
        />
    );
};

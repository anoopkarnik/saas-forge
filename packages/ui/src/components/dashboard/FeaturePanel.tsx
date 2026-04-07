import * as React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/shadcn/card";

export function FeaturePanel({
    title,
    question,
    description,
    children,
}: {
    title: string;
    question: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="space-y-1">
                    <span className="block font-medium text-foreground">{question}</span>
                    <span className="block">{description}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

"use client";

import React from "react";

interface SectionHeaderProps {
    icon: React.ElementType;
    title: string;
    description: string;
}

export function SectionHeader({ icon: Icon, title, description }: SectionHeaderProps) {
    return (
        <div className="flex items-start gap-3 mb-6">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

"use client";

import React from "react";
import { useFieldArray } from "react-hook-form";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent } from "@workspace/ui/components/shadcn/card";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { Plus, Trash2 } from "lucide-react";

interface ArrayEditorProps {
    form: any;
    name: string;
    title: string;
    addLabel: string;
    emptyMessage: string;
    defaultItem: Record<string, any>;
    showSeparator?: boolean;
    renderFields: (index: number) => React.ReactNode;
}

export function ArrayEditor({
    form,
    name,
    title,
    addLabel,
    emptyMessage,
    defaultItem,
    showSeparator = true,
    renderFields,
}: ArrayEditorProps) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name });

    return (
        <div className="space-y-4 mt-8">
            {showSeparator && <Separator />}
            <div className={`flex items-center justify-between ${showSeparator ? "pt-2" : ""}`}>
                <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{title}</h4>
                    <Badge variant="secondary">{fields.length}</Badge>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append(defaultItem)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> {addLabel}
                </Button>
            </div>
            <div className="space-y-3">
                {fields.map((field, index) => (
                    <Card key={field.id} className="py-4 bg-muted/30 border-dashed">
                        <CardContent className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-1 -right-1 h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                type="button"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                {renderFields(index)}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {fields.length === 0 && (
                    <div className="border border-dashed rounded-xl p-8 text-center text-muted-foreground text-sm">
                        {emptyMessage}
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import React, { useRef, useState } from "react";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadFieldProps {
    value: string;
    onChange: (url: string) => void;
}

export function ImageUploadField({ value, onChange }: ImageUploadFieldProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/cms/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            const { url } = await res.json();
            onChange(url);
            toast.success("Image uploaded successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to upload image");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste URL or upload an image"
                    className="flex-1"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload image"
                >
                    {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4" />
                    )}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
            {value && (
                <img
                    src={value}
                    alt="Preview"
                    className="h-16 w-auto rounded border object-contain"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                    onLoad={(e) => (e.currentTarget.style.display = "")}
                />
            )}
        </div>
    );
}

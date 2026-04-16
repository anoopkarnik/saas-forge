"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/shadcn/dialog";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Loader2, Mic, MicOff, WandSparkles } from "lucide-react";
import { toast } from "sonner";

export interface AIFillPromptDialogProps {
    onFill: (instruction: string) => void;
    isPending: boolean;
    buttonSize?: "default" | "sm" | "lg" | "icon";
    buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    disabled?: boolean;
    sttApi?: string;
}

export function AIFillPromptDialog({
    onFill,
    isPending,
    buttonSize = "default",
    buttonVariant = "outline",
    disabled = false,
    sttApi = "/api/ai/speech/stt",
}: AIFillPromptDialogProps) {
    const [open, setOpen] = useState(false);
    const [instruction, setInstruction] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);

    const handleFill = () => {
        onFill(instruction);
        setOpen(false);
        setInstruction("");
    };

    const transcribeAudio = useCallback(
        async (audioBlob: Blob, filename: string) => {
            if (!audioBlob.size) return;
            setIsTranscribing(true);
            try {
                const formData = new FormData();
                formData.append("file", audioBlob, filename);
                const response = await fetch(sttApi, { method: "POST", body: formData });
                const data = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(data?.error ?? "Speech to text is not available.");
                }
                const text = typeof data?.text === "string" ? data.text.trim() : "";
                if (!text) {
                    toast.error("No speech was detected.");
                    return;
                }
                setInstruction((prev) => (prev ? `${prev} ${text}` : text));
            } catch (error) {
                toast.error("Could not transcribe audio", {
                    description: error instanceof Error ? error.message : "Try again in a moment.",
                });
            } finally {
                setIsTranscribing(false);
            }
        },
        [sttApi],
    );

    const stopRecording = useCallback(() => {
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        }
    }, []);

    const startRecording = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            toast.error("Audio recording is not supported in this browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const mimeType = recorder.mimeType || "audio/webm";
            chunksRef.current = [];
            streamRef.current = stream;
            recorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
                setIsRecording(false);
                stream.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                recorderRef.current = null;
                const extension = mimeType.includes("mp4") ? "mp4" : "webm";
                const audioBlob = new Blob(chunksRef.current, { type: mimeType });
                chunksRef.current = [];
                void transcribeAudio(audioBlob, `voice-prompt.${extension}`);
            };

            recorder.start();
            setIsRecording(true);
        } catch (error) {
            setIsRecording(false);
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            toast.error("Could not start recording", {
                description: error instanceof Error ? error.message : "Check microphone access.",
            });
        }
    }, [transcribeAudio]);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            void startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen) {
                // Clean up recording when dialog closes
                const recorder = recorderRef.current;
                if (recorder && recorder.state !== "inactive") {
                    recorder.onstop = null;
                    recorder.stop();
                }
                streamRef.current?.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                recorderRef.current = null;
                setIsRecording(false);
            }
            setOpen(nextOpen);
        },
        [],
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant={buttonVariant}
                    size={buttonSize}
                    disabled={disabled || isPending}
                >
                    {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <WandSparkles className="mr-2 h-4 w-4" />
                    )}
                    {isPending ? "Filling..." : "Fill with AI"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Content Generation Context</DialogTitle>
                    <DialogDescription>
                        Optionally provide details on what you want the AI to generate. The AI will use this context along with the current form values.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="relative">
                        <Textarea
                            placeholder={isRecording ? "Listening..." : "e.g. Write a brief overview about our new analytics features..."}
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            rows={4}
                            disabled={isRecording || isTranscribing}
                        />
                        <Button
                            type="button"
                            variant={isRecording ? "destructive" : "ghost"}
                            size="icon"
                            className="absolute bottom-2 right-2 h-8 w-8"
                            disabled={isTranscribing}
                            onClick={toggleRecording}
                        >
                            {isTranscribing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isRecording ? (
                                <MicOff className="h-4 w-4" />
                            ) : (
                                <Mic className="h-4 w-4" />
                            )}
                            <span className="sr-only">{isRecording ? "Stop recording" : "Start recording"}</span>
                        </Button>
                    </div>
                    {isRecording && (
                        <p className="text-xs text-destructive font-medium">Recording... click the mic to stop.</p>
                    )}
                    {isTranscribing && (
                        <p className="text-xs text-muted-foreground">Transcribing audio...</p>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleFill} disabled={isPending || isRecording || isTranscribing}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Content
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

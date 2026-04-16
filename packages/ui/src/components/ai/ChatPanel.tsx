"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Bot,
  Loader2,
  Mic,
  MicOff,
  Send,
  Square,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { cn } from "@workspace/ui/lib/utils";

type ChatPanelProps = {
  api?: string;
  promptKey?: string;
  remainingCredits?: number | null;
  disabled?: boolean;
  disabledReason?: string | null;
  sttApi?: string;
  ttsApi?: string;
  onFinish?: () => void;
};

type ChatMessagePart = {
  type?: string;
  text?: unknown;
};

type ChatMessage = {
  id: string;
  role?: string;
  content?: unknown;
  parts?: ChatMessagePart[];
};

function renderText(text: string) {
  return text.split("\n").map((line, index) => (
    <React.Fragment key={`${line}-${index}`}>
      {line}
      {index < text.split("\n").length - 1 ? <br /> : null}
    </React.Fragment>
  ));
}

function getMessageText(message: ChatMessage) {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const textParts = parts.filter(
    (part) => part.type === "text" && typeof part.text === "string",
  );

  if (textParts.length) {
    return textParts.map((part) => part.text).join("\n");
  }

  if (typeof message.content === "string") {
    return message.content;
  }

  return "";
}

function MessageContent({ message }: { message: ChatMessage }) {
  const text = getMessageText(message);

  if (text) {
    return (
      <>
        {text.split("\n").map((part: string, index: number) => (
          <div key={index}>{renderText(part)}</div>
        ))}
      </>
    );
  }

  return <span className="text-muted-foreground">No text content.</span>;
}

export function ChatPanel({
  api = "/api/ai/chat",
  promptKey = "chat.assistant",
  remainingCredits,
  disabled,
  disabledReason,
  sttApi = "/api/ai/speech/stt",
  ttsApi = "/api/ai/speech/tts",
  onFinish,
}: ChatPanelProps) {
  const [input, setInput] = React.useState("");
  const [isRecording, setIsRecording] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [autoSpeak, setAutoSpeak] = React.useState(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = React.useRef<string | null>(null);
  const spokenMessageIdsRef = React.useRef<Set<string>>(new Set());
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api,
      body: { promptKey },
    }),
    onFinish,
  });

  const isBusy = status === "submitted" || status === "streaming";

  const stopAudio = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setIsSpeaking(false);
  }, []);

  const speakText = React.useCallback(
    async (text: string) => {
      const spokenText = text.trim();
      if (!spokenText || disabled) {
        return;
      }

      try {
        stopAudio();
        setIsSpeaking(true);

        const response = await fetch(ttsApi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: spokenText }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Text to speech is not available.");
        }

        const audioUrl = URL.createObjectURL(await response.blob());
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audioUrlRef.current = audioUrl;
        audio.onended = stopAudio;
        audio.onerror = () => {
          stopAudio();
          toast.error("Could not play the assistant response.");
        };
        await audio.play();
      } catch (error) {
        stopAudio();
        toast.error("Could not speak the response", {
          description: error instanceof Error ? error.message : "Try again in a moment.",
        });
      }
    },
    [disabled, stopAudio, ttsApi],
  );

  const sendText = React.useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText || isBusy || disabled) {
        return;
      }

      setInput("");
      await sendMessage({ text: trimmedText });
    },
    [disabled, isBusy, sendMessage],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendText(input);
  };

  const stopRecording = React.useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const transcribeAndSend = React.useCallback(
    async (audioBlob: Blob, filename: string) => {
      if (!audioBlob.size) {
        return;
      }

      setIsTranscribing(true);

      try {
        const formData = new FormData();
        formData.append("file", audioBlob, filename);

        const response = await fetch(sttApi, {
          method: "POST",
          body: formData,
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error ?? "Speech to text is not available.");
        }

        const text = typeof data?.text === "string" ? data.text.trim() : "";
        if (!text) {
          toast.error("No speech was detected.");
          return;
        }

        setInput(text);
        for (const message of messages) {
          if (message.role === "assistant") {
            spokenMessageIdsRef.current.add(message.id);
          }
        }
        setAutoSpeak(true);
        await sendText(text);
      } catch (error) {
        toast.error("Could not transcribe audio", {
          description: error instanceof Error ? error.message : "Try again in a moment.",
        });
      } finally {
        setIsTranscribing(false);
      }
    },
    [messages, sendText, sttApi],
  );

  const startRecording = React.useCallback(async () => {
    if (isBusy || disabled || isTranscribing) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Audio recording is not supported in this browser.");
      return;
    }

    try {
      stopAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const mimeType = recorder.mimeType || "audio/webm";

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;

        const extension = mimeType.includes("mp4") ? "mp4" : "webm";
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        void transcribeAndSend(audioBlob, `voice-message.${extension}`);
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
  }, [disabled, isBusy, isTranscribing, stopAudio, transcribeAndSend]);

  const toggleRecording = React.useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }

    void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  React.useEffect(() => {
    if (!autoSpeak || isBusy || disabled) {
      return;
    }

    const latestAssistantMessage = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (!latestAssistantMessage || spokenMessageIdsRef.current.has(latestAssistantMessage.id)) {
      return;
    }

    const text = getMessageText(latestAssistantMessage);
    if (!text.trim()) {
      return;
    }

    spokenMessageIdsRef.current.add(latestAssistantMessage.id);
    void speakText(text);
  }, [autoSpeak, disabled, isBusy, messages, speakText]);

  React.useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      stopAudio();
    };
  }, [stopAudio]);

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[520px] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Chat</h1>
            <p className="text-sm text-muted-foreground">
              Ask for drafts, summaries, plans, and product help.
            </p>
          </div>
        </div>
        <Badge variant="secondary">
          {remainingCredits == null
            ? "Credits loading"
            : `${remainingCredits.toLocaleString()} credits`}
        </Badge>
      </div>

      {disabled ? (
        <div className="m-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {disabledReason ?? "AI is not configured for this deployment."}
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 py-20 text-center">
            <Bot className="h-10 w-10 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Start with a question</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The first completed response uses at least one credit.
              </p>
            </div>
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                isUser ? "justify-end" : "justify-start",
              )}
            >
              {!isUser ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              ) : null}
              <div
                className={cn(
                  "max-w-[78%] rounded-md border px-4 py-3 text-sm leading-6",
                  isUser
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-muted/30",
                )}
              >
                <MessageContent message={message} />
                {!isUser ? (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => speakText(getMessageText(message))}
                      disabled={disabled || isSpeaking}
                    >
                      <Volume2 className="mr-1 h-3.5 w-3.5" />
                      Speak
                    </Button>
                  </div>
                ) : null}
              </div>
              {isUser ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <User className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          );
        })}

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error.message || "The assistant could not finish the response."}
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="border-t p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isRecording ? (
              <span className="font-medium text-destructive">Recording...</span>
            ) : isTranscribing ? (
              <span>Transcribing audio...</span>
            ) : (
              <span>Use the microphone to talk to the assistant.</span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setAutoSpeak((current) => !current)}
          >
            {autoSpeak ? <Volume2 className="mr-1 h-3.5 w-3.5" /> : <VolumeX className="mr-1 h-3.5 w-3.5" />}
            {autoSpeak ? "Voice replies on" : "Voice replies off"}
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={isRecording ? "Listening..." : "Ask the assistant..."}
            disabled={disabled || isBusy || isRecording || isTranscribing}
            className="min-h-12 resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            disabled={disabled || isBusy || isTranscribing}
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
          {isBusy ? (
            <Button type="button" variant="outline" size="icon" onClick={stop}>
              <Square className="h-4 w-4" />
              <span className="sr-only">Stop response</span>
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim() || disabled || isTranscribing}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

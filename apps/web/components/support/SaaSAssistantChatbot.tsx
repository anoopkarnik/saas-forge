"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { ChatBubbleIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { FaRobot } from "react-icons/fa";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

type Message = {
  role: "user" | "assistant";
  value: string;
};

const SaaSAssistantChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      value: "Hello! I'm your SaaS Assistant. What would you like to know?",
    },
  ]);
  const [userInput, setUserInput] = useState<string>("");
  const [waitingForReply, setWaitingForReply] = useState(false);

  const trpc = useTRPC();
  const updateChat = useMutation(
    trpc.support.chatWithSaaSAssistant.mutationOptions({})
  )
  const formatMessage = (message: string): string => {
    return message
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") // **bold**
      .replace(/_(.+?)_/g, "<i>$1</i>") // _italics_
      .replace(/`(.+?)`/g, "<code>$1</code>") // `code`
      .replace(/\n/g, "<br>"); // line breaks
  };

  const sendMessage = async () => {
    if (!userInput.trim() || waitingForReply) return;

    const input = userInput.trim();

    setWaitingForReply(true);
    setUserInput("");
    setMessages((prev) => [...prev, { role: "user", value: input }]);

    try {

      const data = await updateChat.mutateAsync({ message: input });
      const reply = data.reply ?? "Sorry, I didn't get a response.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", value: reply as string },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          value: "Sorry, something went wrong talking to the assistant.",
        },
      ]);
    } finally {
      setWaitingForReply(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] flex-1">
      {/* Header + description */}
      <div className="space-y-1.5 pb-4 border-b border-border/50">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <ChatBubbleIcon className="w-4 h-4 text-primary" />
          </div>
          SaaS Assistant
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ask anything about the platform, features, or how it works.
        </p>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent pr-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-end gap-2.5 max-w-[85%] ${message.role === "user" ? "self-end flex-row-reverse" : "self-start"
              }`}
          >
            {message.role === "user" ? (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-border/50 shadow-sm">
                <Image
                  src={"/anoop.jpg"}
                  alt="User"
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                <FaRobot className="w-4 h-4 text-primary" />
              </div>
            )}

            <div
              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted/50 text-foreground border border-border/50 rounded-bl-none"
                }`}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    message.role === "assistant"
                      ? formatMessage(message.value)
                      : message.value,
                }}
              />
            </div>
          </div>
        ))}

        {waitingForReply && (
          <div className="flex items-end gap-2.5 self-start max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
              <FaRobot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted/50 px-4 py-3 rounded-2xl rounded-bl-none border border-border/50 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input + buttons */}
      <div className="pt-2">
        <div
          className="flex items-end rounded-xl bg-muted/30 border border-border/50 shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-ring/50 transition-all duration-200 overflow-hidden"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
        >
          <Textarea
            className="flex-1 border-none bg-transparent px-4 py-3 resize-none min-h-[52px] max-h-[120px] 
                        focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your question..."
          />

          <Button
            onClick={sendMessage}
            size="icon"
            className="h-9 w-9 mb-2 mr-2 rounded-lg shrink-0"
            disabled={!userInput.trim() || waitingForReply}
          >
            <ChatBubbleIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SaaSAssistantChatbot;

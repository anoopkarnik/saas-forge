"use client"
import { useTRPC } from '@/trpc/client'
import { Button } from '@workspace/ui/components/shadcn/button'
import { Input } from '@workspace/ui/components/shadcn/input'
import { Textarea } from '@workspace/ui/components/shadcn/textarea'
import { useMutation } from '@tanstack/react-query'
import React, { useState } from 'react'
import { toast } from 'sonner'

const Message = ({ setActivePanel }: { setActivePanel: any }) => {
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");

    const trpc = useTRPC();
    const sendSupportMessage = useMutation(
        trpc.support.sendSupportMessage.mutationOptions({
            onSuccess: async () => { toast.success("Message sent successfully!") },
            onError: async () => { toast.error("Failed to send message. Please try again later.") },
        })
    )

    const handleSendMessage = async () => {
        await sendSupportMessage.mutateAsync({ subject, email, message });
        setSubject("");
        setMessage("");
        setEmail("");
        setActivePanel(null);
    };

    const isLoading = sendSupportMessage.isPending;
    return (
        <div className="flex flex-col gap-3 rounded-md bg-popover">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold">Send us a message</h3>
                <p className="text-xs text-muted-foreground">
                    Have questions or want to collaborate or hire us for work? Send us a message!
                </p>
            </div>
            <Input
                placeholder="Email"
                className="w-full bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                disabled={isLoading}
            />
            <Input
                placeholder="Subject"
                className="w-full bg-background"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                disabled={isLoading}
            />
            <Textarea
                placeholder="Message (Required)"
                className="w-full h-[160px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                disabled={isLoading}
            />
            <div className="flex justify-between items-center gap-2 pt-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePanel(null)}
                    disabled={isLoading}
                >
                    Back
                </Button>
                <Button
                    size="sm"
                    onClick={handleSendMessage}
                    onPointerDown={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={isLoading}
                >
                    {isLoading ? "Sending..." : "Send Message"}
                </Button>
            </div>
        </div>
    )
}

export default Message
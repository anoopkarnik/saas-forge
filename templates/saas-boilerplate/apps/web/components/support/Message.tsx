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
        <div className="flex flex-col gap-4">
            <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-lg font-semibold tracking-tight">Contact Us</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Have questions or want to collaborate? Send us a message and we'll get back to you shortly.
                </p>
            </div>
            <div className="space-y-3">
                <Input
                    placeholder="Email address"
                    className="h-10 bg-muted/50 border-border/50 focus-visible:bg-background transition-all duration-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    disabled={isLoading}
                />
                <Input
                    placeholder="Subject"
                    className="h-10 bg-muted/50 border-border/50 focus-visible:bg-background transition-all duration-200"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    disabled={isLoading}
                />
                <Textarea
                    placeholder="How can we help?"
                    className="min-h-[120px] bg-muted/50 border-border/50 focus-visible:bg-background transition-all duration-200 resize-none"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    disabled={isLoading}
                />
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePanel(null)}
                    disabled={isLoading}
                    className="text-muted-foreground hover:text-foreground"
                >
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={handleSendMessage}
                    onPointerDown={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={isLoading}
                    className="px-6 font-medium"
                >
                    {isLoading ? "Sending..." : "Send Message"}
                </Button>
            </div>
        </div>
    )
}

export default Message
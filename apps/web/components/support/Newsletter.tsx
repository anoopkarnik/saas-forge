"use client"
import { useTRPC } from '@/trpc/client'
import { Button } from '@workspace/ui/components/shadcn/button'
import { Input } from '@workspace/ui/components/shadcn/input'
import { useMutation } from '@tanstack/react-query'
import React, { useState } from 'react'
import { toast } from 'sonner'

const Newsletter = ({ setActivePanel }: { setActivePanel: any }) => {

    const [newsletterEmail, setNewsletterEmail] = useState("");

    const trpc = useTRPC();
    const subscribeNewsletter = useMutation(
        trpc.support.subscribeToNewsletter.mutationOptions({
            onSuccess: async () => { toast.success("Subscribed to newsletter successfully!") },
            onError: async () => { toast.error("Failed to subscribe to newsletter. Please try again later.") },
        })
    )


    const handleJoinNewsletter = () => {
        if (!newsletterEmail.trim()) {
            toast.error("Please enter a valid email address.");
            return;
        }
        try {
            subscribeNewsletter.mutate({ email: newsletterEmail });
        } catch {
            toast.error("Failed to subscribe to newsletter. Please try again later.");
        }
        subscribeNewsletter.mutate({ email: newsletterEmail });
    };
    return (
        <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
                <h3 className="text-lg font-semibold tracking-tight">Join our newsletter</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Get updates on new projects, tools, and behind-the-scenes breakdowns. No spam, just useful stuff.
                </p>
            </div>
            <div className="space-y-3">
                <Input
                    placeholder="Your email address"
                    className="h-10 bg-muted/50 border-border/50 focus-visible:bg-background transition-all duration-200"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePanel(null)}
                    className="text-muted-foreground hover:text-foreground"
                >
                    Back
                </Button>
                <Button
                    size="sm"
                    onClick={handleJoinNewsletter}
                    className="px-6 font-medium"
                >
                    Subscribe
                </Button>
            </div>
        </div>
    )
}

export default Newsletter
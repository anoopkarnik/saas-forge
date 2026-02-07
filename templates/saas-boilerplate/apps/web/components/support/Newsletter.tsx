"use client"
import { useTRPC } from '@/trpc/client'
import { Button } from '@workspace/ui/components/shadcn/button'
import { Input } from '@workspace/ui/components/shadcn/input'
import { useMutation } from '@tanstack/react-query'
import React, { useState } from 'react'
import { toast } from 'sonner'

const Newsletter = ({setActivePanel}:{setActivePanel: any}) => {

    const [newsletterEmail, setNewsletterEmail] = useState("");

    const trpc = useTRPC();
    const subscribeNewsletter = useMutation(
         trpc.support.subscribeToNewsletter.mutationOptions({
            onSuccess: async () => {toast.success("Subscribed to newsletter successfully!")},
            onError: async () => {toast.error("Failed to subscribe to newsletter. Please try again later.")},
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
        <div className="flex flex-col gap-3 rounded-md bg-popover ">
    <div className="space-y-1">
        <h3 className="text-sm font-semibold">Join our newsletter</h3>
        <p className="text-xs text-muted-foreground">
        Get updates on new projects, tools, and behind-the-scenes breakdowns. No spam, just useful stuff.
        </p>
    </div>
    <Input
        placeholder="Your email"
        className="w-full bg-background"
        value={newsletterEmail}
        onChange={(e) => setNewsletterEmail(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
    />
    <div className="flex justify-between items-center gap-2 pt-1">
        <Button
        variant="ghost"
        size="sm"
        onClick={() => setActivePanel(null)}
        >
        Back
        </Button>
        <Button size="sm" onClick={handleJoinNewsletter}>
        Subscribe
        </Button>
    </div>
    </div>
  )
}

export default Newsletter
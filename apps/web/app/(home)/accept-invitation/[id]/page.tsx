"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { signOut } from "@workspace/auth/better-auth/auth-client";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";

export default function AcceptInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: invitation, isLoading, error } = useQuery(
    trpc.organization.getInvitation.queryOptions({ id }, { retry: false }),
  );

  const done = async (message: string) => {
    toast.success(message);
    await queryClient.invalidateQueries();
    router.push("/");
  };
  const onError = (err: { message: string }) => toast.error(err.message);
  const accept = useMutation(
    trpc.organization.acceptInvitation.mutationOptions({
      onSuccess: () => done("You joined the workspace"),
      onError,
    }),
  );
  const reject = useMutation(
    trpc.organization.rejectInvitation.mutationOptions({
      onSuccess: () => done("Invitation declined"),
      onError,
    }),
  );

  const busy = accept.isPending || reject.isPending;
  const unavailable = invitation && (invitation.status !== "pending" || invitation.expired);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center p-6">
      <Card className="w-full">
        {isLoading ? (
          <CardHeader>
            <CardDescription>Loading invitation…</CardDescription>
          </CardHeader>
        ) : error || !invitation ? (
          <>
            <CardHeader>
              <CardTitle>Invitation not found</CardTitle>
              <CardDescription>
                This invitation doesn&apos;t exist or was sent to a different email address than the one
                you&apos;re signed in with.
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-2">
              <Button variant="outline" onClick={() => router.push("/")}>Go home</Button>
              <Button variant="ghost" onClick={() => signOut().then(() => router.push("/sign-in"))}>
                Sign in with another account
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Join {invitation.organizationName}</CardTitle>
              <CardDescription>
                {invitation.inviterName} invited you to join as {invitation.role}.
              </CardDescription>
            </CardHeader>
            {unavailable && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This invitation is {invitation.expired ? "expired" : invitation.status}. Ask for a new one.
                </p>
              </CardContent>
            )}
            <CardFooter className="gap-2">
              <Button
                disabled={busy || !!unavailable}
                onClick={() => accept.mutate({ invitationId: invitation.id })}
              >
                Accept invitation
              </Button>
              <Button
                variant="ghost"
                disabled={busy || !!unavailable}
                onClick={() => reject.mutate({ invitationId: invitation.id })}
              >
                Decline
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

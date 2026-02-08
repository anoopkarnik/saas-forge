"use client"
import React, { useEffect, useState } from 'react'
import { authClient, useSession } from '@workspace/auth/better-auth/auth-client'
import SettingsHeader from '@/components/home/SettingsHeader'
import dayjs from 'dayjs';
import { Button } from '@workspace/ui/components/shadcn/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/shadcn/table';
import { useRouter } from 'next/navigation';

const SessionSettings = () => {
    const [sessions, setSessions] = useState<any[]>([])
    const title = 'Sessions'
    const description = 'Manage your active sessions'
    const router = useRouter();

    const fetchSessions = async () => {
        const { error, data: sessions } = await authClient.listSessions()
        const modifiedSessions = sessions
            ?.slice()
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((session: any) => {
                const formattedCreatedDate = dayjs(session.createdAt).format('DD MMM YYYY, hh:mm A');
                const formattedUpdatedDate = dayjs(session.updatedAt).format('DD MMM YYYY, hh:mm A');
                return {
                    ...session,
                    createdAt: formattedCreatedDate,
                    updatedAt: formattedUpdatedDate
                }
            })
        setSessions(modifiedSessions || []);
    }

    useEffect(() => {
        fetchSessions();
    }, [])

    const handleSignoutAll = async () => {
        await authClient.revokeOtherSessions();
        await fetchSessions();
    }

    return (
        <SettingsHeader title={title} description={description}>
            <Button variant="destructive" className="mb-4" onClick={handleSignoutAll}>Sign out from all other devices</Button>
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/40">
                            <TableHead className="w-[300px] pl-6 font-medium">Device Info</TableHead>
                            <TableHead className="font-medium">Date Joined</TableHead>
                            <TableHead className="font-medium">Last Active</TableHead>
                            <TableHead className="text-right pr-6 font-medium">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sessions.map((session) => (
                            <TableRow key={session.id} className="hover:bg-muted/20">
                                <TableCell className="pl-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-2.5 w-2.5 rounded-full ${session.isCurrent ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-muted-foreground/30'}`} />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{session.userAgent?.split(' ')[0] || 'Unknown'}</span>
                                                {session.isCurrent && <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-medium">Current</span>}
                                            </div>
                                            <div className="flex gap-1 text-xs text-muted-foreground">
                                                <span>{session.userAgent?.split(' ')[2] || 'Browser'}</span>
                                                <span>•</span>
                                                <span>{session.ipAddress || 'IP Hidden'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{session.createdAt}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{session.updatedAt}</TableCell>
                                <TableCell className="text-right pr-6">
                                    {session.isCurrent ? (
                                        <span className="text-xs text-muted-foreground italic">Active Now</span>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
                                            onClick={async () => {
                                                await authClient.revokeSession({ token: session.token });
                                                setSessions((prev) => prev.filter((s) => s.id !== session.id));
                                            }}
                                        >
                                            Revoke
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </SettingsHeader>
    )
}

export default SessionSettings
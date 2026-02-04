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
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">Device</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-left">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sessions.map((session) => (
                        <TableRow key={session.id} className={session.isCurrent ? "bg-muted" : ""}>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{session.userAgent?.split(' ')[0] || ''}</span>
                                    <span className="font-medium">{session.userAgent?.split(' ')[2] || 'Unknown'}</span>
                                    <span className="text-xs text-muted-foreground">{session.ipAddress ?? 'IP unknown'}</span>
                                </div>
                            </TableCell>
                            <TableCell>{session.updatedAt}</TableCell>
                            <TableCell>{session.createdAt}</TableCell>
                            <TableCell>
                                {!session.isCurrent && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
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
            <div className='mb-20'>
            </div>
        </SettingsHeader>
    )
}

export default SessionSettings
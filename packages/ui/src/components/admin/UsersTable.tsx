"use client";

import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/shadcn/table";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { UserActionsDropdown } from "./UserActionsDropdown";

interface UsersTableProps {
    users: any[];
    isLoading: boolean;
    currentUserId: string;
    onSetRole: (userId: string, newRole: "admin" | "user") => void;
    onBanToggle: (userId: string, isBanned: boolean) => void;
    onRemove: (userId: string) => void;
}

export function UsersTable({ users, isLoading, currentUserId, onSetRole, onBanToggle, onRemove }: UsersTableProps) {
    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                {isLoading ? "Loading users..." : "No users found."}
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                    {user.name || "N/A"}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={user.role === "admin" ? "default" : "secondary"}
                                        className="capitalize tracking-wider"
                                    >
                                        {user.role || 'user'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.banned ? (
                                        <Badge variant="destructive">Banned</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Active</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <UserActionsDropdown
                                        user={user}
                                        currentUserId={currentUserId}
                                        onSetRole={onSetRole}
                                        onBanToggle={onBanToggle}
                                        onRemove={onRemove}
                                    />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

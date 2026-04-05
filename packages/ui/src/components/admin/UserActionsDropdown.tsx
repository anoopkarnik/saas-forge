"use client";

import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { Button } from "@workspace/ui/components/shadcn/button";
import { MoreHorizontal, ShieldAlert, ShieldCheck, Trash2, Ban } from "lucide-react";

interface UserActionsDropdownProps {
    user: any;
    currentUserId: string;
    onSetRole: (userId: string, newRole: "admin" | "user") => void;
    onBanToggle: (userId: string, isBanned: boolean) => void;
    onRemove: (userId: string) => void;
}

export function UserActionsDropdown({ user, currentUserId, onSetRole, onBanToggle, onRemove }: UserActionsDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {user.role === "admin" ? (
                    <DropdownMenuItem onClick={() => onSetRole(user.id, "user")}>
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Demote to User
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onSetRole(user.id, "admin")}>
                        <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
                        Promote to Admin
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => onBanToggle(user.id, user.banned)}>
                    <Ban className={`mr-2 h-4 w-4 ${user.banned ? 'text-emerald-500' : 'text-amber-500'}`} />
                    {user.banned ? 'Unban User' : 'Ban User'}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="text-red-500 focus:text-red-600 focus:bg-red-50"
                    onClick={() => onRemove(user.id)}
                    disabled={user.id === currentUserId}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

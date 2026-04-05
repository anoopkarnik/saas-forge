import React, { Suspense } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/shadcn/sidebar";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import DocSidebar from "./DocSidebar";
import DocPostPage from "./DocPostPage";

export default function DocRoute() {
    const navigate = useNavigate();
    const { slug } = useParams();

    return (
        <SidebarProvider>
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
                <DocSidebar />
            </Suspense>
            <div className="flex flex-col flex-1 max-h-screen">
                <div className="flex items-center gap-4 py-2 px-4">
                    <SidebarTrigger />
                    <div className="flex items-center gap-2 text-sm">
                        <span
                            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            onClick={() => navigate('/')}
                        >
                            Dashboard
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-semibold tracking-tight">Documentation</span>
                    </div>
                </div>
                <Separator />
                <div className="flex-1 overflow-y-auto">
                    {slug ? (
                        <Suspense fallback={<div className="flex h-64 items-center justify-center">Loading document...</div>}>
                            <DocPostPage slug={slug} />
                        </Suspense>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p className="text-lg">Select a document from the sidebar to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </SidebarProvider>
    )
}

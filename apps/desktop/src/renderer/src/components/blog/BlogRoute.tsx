import React, { Suspense } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Separator } from "@workspace/ui/components/shadcn/separator";
import BlogIndex from "./BlogIndex";
import BlogPostPage from "./BlogPostPage";

export default function BlogRoute() {
    const navigate = useNavigate();
    const { slug } = useParams();

    return (
        <div className="flex flex-col flex-1 max-h-screen">
            <div className="flex items-center gap-4 py-2 px-4">
                <div className="flex items-center gap-2 text-sm">
                    <span
                        className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        onClick={() => navigate('/')}
                    >
                        Dashboard
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span
                        className={slug ? "text-muted-foreground hover:text-foreground cursor-pointer transition-colors" : "font-semibold tracking-tight"}
                        onClick={() => navigate('/blog')}
                    >
                        Blog
                    </span>
                </div>
            </div>
            <Separator />
            <div className="flex-1 overflow-y-auto">
                <Suspense fallback={<div className="flex h-64 items-center justify-center">Loading...</div>}>
                    {slug ? <BlogPostPage slug={slug} /> : <BlogIndex />}
                </Suspense>
            </div>
        </div>
    )
}

"use client";

import React, { useEffect, useState } from "react";
import NavbarSection from "./NavbarSection";
import FooterSection from "./FooterSection";
import { FooterSectionProps, NavbarSectionProps } from "@/lib/ts-types/landing";
import { motion, useScroll, useSpring } from "framer-motion";
import { cn } from "@workspace/ui/lib/utils";

interface TableOfContentsItem {
    id: string;
    label: string;
}

interface LegalPageLayoutProps {
    children: React.ReactNode;
    title: string;
    lastUpdated?: string;
    navbarSection: NavbarSectionProps;
    footerSection: FooterSectionProps;
    tableOfContents?: TableOfContentsItem[];
}

const LegalPageLayout = ({
    children,
    title,
    lastUpdated,
    navbarSection,
    footerSection,
    tableOfContents,
}: LegalPageLayoutProps) => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const [activeId, setActiveId] = useState<string>("");

    useEffect(() => {
        if (!tableOfContents || tableOfContents.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: "-100px 0px -60% 0px" }
        );

        tableOfContents.forEach(({ id }) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [tableOfContents]);


    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            <NavbarSection navbarSection={navbarSection} />

            {/* Scroll Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
                style={{ scaleX }}
            />

            <main className="relative pt-24 pb-16 lg:pt-32 lg:pb-24">
                {/* Header Section */}
                <div className="container mx-auto px-4 mb-16 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-6">
                            {title}
                        </h1>
                        {lastUpdated && (
                            <p className="text-muted-foreground text-lg">
                                Last updated: <span className="text-foreground font-medium">{lastUpdated}</span>
                            </p>
                        )}
                    </motion.div>
                </div>

                <div className="container mx-auto px-4 flex flex-col lg:flex-row gap-12 relative">
                    {/* Sidebar Navigation */}
                    {tableOfContents && tableOfContents.length > 0 && (
                        <aside className="hidden lg:block w-64 flex-shrink-0">
                            <div className="sticky top-32">
                                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                                    On this page
                                </h4>
                                <nav className="flex flex-col space-y-1 border-l border-border/50">
                                    {tableOfContents.map((item) => (
                                        <a
                                            key={item.id}
                                            href={`#${item.id}`}
                                            className={cn(
                                                "pl-4 py-2 text-sm transition-colors border-l-2 -ml-[2px]",
                                                activeId === item.id
                                                    ? "border-primary text-primary font-medium bg-primary/5"
                                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                                            )}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const element = document.getElementById(item.id);
                                                if (element) {
                                                    // Adjust for sticky header offset
                                                    const y = element.getBoundingClientRect().top + window.scrollY - 100;
                                                    window.scrollTo({ top: y, behavior: 'smooth' });
                                                    setActiveId(item.id);
                                                }
                                            }}
                                        >
                                            {item.label}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </aside>
                    )}

                    {/* Main Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex-1 min-w-0"
                    >
                        <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-28 prose-a:text-primary hover:prose-a:underline prose-headings:font-bold prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl">
                            {children}
                        </div>
                    </motion.div>
                </div>
            </main>

            <FooterSection footerSection={footerSection} />
        </div>
    );
};

export default LegalPageLayout;

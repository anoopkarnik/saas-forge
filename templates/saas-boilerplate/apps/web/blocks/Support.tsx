"use client";

import React, { useState, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { MessageCircleQuestion } from "lucide-react";
import { TiMessage } from "react-icons/ti";
import { FaRobot, FaCalendarAlt } from "react-icons/fa";
import { IoNewspaper } from "react-icons/io5";

// 🔹 import your separate chatbot component
import SaaSAssistantChatbot from "@/components/support/SaaSAssistantChatbot";
import Message from "@/components/support/Message";
import Newsletter from "@/components/support/Newsletter";
import { useRouter } from "next/navigation";

type ActivePanel = "message" | "newsletter" | "assistant" | null;

const Support = () => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setActivePanel(null);
    }
  };

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };


  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <div
            ref={triggerRef}
            className="fixed bottom-4 right-4 flex items-center justify-center gap-2 p-4 rounded-full 
              bg-sidebar cursor-pointer opacity-80 hover:opacity-100"
          >
            <MessageCircleQuestion className="w-6 h-6 text-primary" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="min-w-[280px] p-4 mr-10 bg-popover border border-border"
        >
          {/* Tiles – hidden when a panel is active */}
          {!activePanel && (
            <div className="grid grid-cols-2 gap-2">
              <div
                className="flex flex-col items-center gap-1 w-[80px] rounded-md p-2 cursor-pointer hover:opacity-80 hover:shadow-lg hover:scale-105"
                onClick={() => togglePanel("message")}
              >
                <div className="bg-orange-900 rounded-md p-2 w-[60px] flex items-center justify-center">
                  <TiMessage size={40} />
                </div>
                <div className="text-center text-xs">Send us a message</div>
              </div>

              {/* <div
                className="flex flex-col items-center gap-1 w-[80px] rounded-md p-2 cursor-pointer hover:opacity-80 hover:shadow-lg hover:scale-105"
                onClick={() => togglePanel("newsletter")}
              >
                <div className="bg-violet-900 rounded-md p-2 w-[60px] flex items-center justify-center">
                  <IoNewspaper size={40} />
                </div>
                <div className="text-center text-xs">Join our newsletter</div>
              </div> */}

              <div
                className="flex flex-col items-center gap-1 w-[80px] rounded-md p-2 cursor-pointer hover:opacity-80 hover:shadow-lg hover:scale-105"
                onClick={() => router.push("/landing/doc")}
              >
                <div className="bg-violet-900 rounded-md p-2 w-[60px] flex items-center justify-center">
                  <IoNewspaper size={40} />
                </div>
                <div className="text-center text-xs">Documentation</div>
              </div>

              <a
                href={process.env.NEXT_PUBLIC_CALENDLY_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 w-[80px] rounded-md p-2 cursor-pointer hover:opacity-80 hover:shadow-lg hover:scale-105"
              >
                <div className="bg-cyan-900 rounded-md p-2 w-[60px] flex items-center justify-center">
                  <FaCalendarAlt size={40} />
                </div>
                <div className="text-center text-xs">Book a meeting</div>
              </a>

              {/* <div
                className="flex flex-col items-center gap-1 w-[80px] rounded-md p-2 cursor-pointer hover:opacity-80 hover:shadow-lg hover:scale-105"
                onClick={() => togglePanel("assistant")}
              >
                <div className="bg-rose-900 rounded-md p-2 w-[60px] flex items-center justify-center">
                  <FaRobot size={40} />
                </div>
                <div className="text-center text-xs">SaaS Assistant</div>
              </div> */}
            </div>
          )}

          {/* Animated panel – full width inside dropdown */}
          <div
            className={`
              mt-2 overflow-hidden transition-all duration-300 ease-out
              ${activePanel ? "max-h-[500px] opacity-100 translate-y-0" : "max-h-0 opacity-0 translate-y-2"}
            `}
          >
            {activePanel === "message" && (
              <Message setActivePanel={setActivePanel} />
            )}

            {activePanel === "newsletter" && (
              <Newsletter setActivePanel={setActivePanel} />
            )}

            {activePanel === "assistant" && (
              <SaaSAssistantChatbot />
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

    </>
  );
};

export default Support;

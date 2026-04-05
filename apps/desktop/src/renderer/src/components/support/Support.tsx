import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { MessageCircleQuestion } from "lucide-react";
import { TiMessage } from "react-icons/ti";
import { FaCalendarAlt } from "react-icons/fa";
import { IoNewspaper } from "react-icons/io5";

import Message from "./Message";
import Newsletter from "./Newsletter";

type ActivePanel = "message" | "newsletter" | null;

const Support = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

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

  const openExternal = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <div
            ref={triggerRef}
            className="fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 rounded-full
              bg-primary text-primary-foreground cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105
              transition-all duration-300 z-50 hover:ring-2 hover:ring-primary/50"
          >
            <MessageCircleQuestion className="w-7 h-7" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-[320px] p-6 mr-6 mb-2 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-xl"
          sideOffset={10}
        >
          {/* Tiles – hidden when a panel is active */}
          {!activePanel && (
            <div className="grid grid-cols-2 gap-3">
              {import.meta.env.VITE_SUPPORT_MAIL && (
                <div
                  className="group flex flex-col items-center gap-3 p-4 rounded-xl cursor-pointer
                    bg-muted/50 hover:bg-muted transition-all duration-200 border border-transparent hover:border-border/50"
                  onClick={() => togglePanel("message")}
                >
                  <div className="bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20 group-hover:scale-110 transition-all duration-300 rounded-full p-3 flex items-center justify-center">
                    <TiMessage size={24} />
                  </div>
                  <div className="text-center text-xs font-medium">
                    Send Message
                  </div>
                </div>
              )}

              <div
                className="group flex flex-col items-center gap-3 p-4 rounded-xl cursor-pointer
                  bg-muted/50 hover:bg-muted transition-all duration-200 border border-transparent hover:border-border/50"
                onClick={() => {
                  setOpen(false);
                  navigate('/doc');
                }}
              >
                <div className="bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300 rounded-full p-3 flex items-center justify-center">
                  <IoNewspaper size={24} />
                </div>
                <div className="text-center text-xs font-medium">Documentation</div>
              </div>

              {/* <div
                className="group flex flex-col items-center gap-3 p-4 rounded-xl cursor-pointer
                  bg-muted/50 hover:bg-muted transition-all duration-200 border border-transparent hover:border-border/50"
                onClick={() => togglePanel("newsletter")}
              >
                <div className="bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20 group-hover:scale-110 transition-all duration-300 rounded-full p-3 flex items-center justify-center">
                  <IoNewspaper size={24} />
                </div>
                <div className="text-center text-xs font-medium">Newsletter</div>
              </div> */}

              {import.meta.env.VITE_CALENDLY_BOOKING_URL && (
                <div
                  onClick={() =>
                    openExternal(import.meta.env.VITE_CALENDLY_BOOKING_URL!)
                  }
                  className="group flex flex-col items-center gap-3 p-4 rounded-xl cursor-pointer
                    bg-muted/50 hover:bg-muted transition-all duration-200 border border-transparent hover:border-border/50"
                >
                  <div className="bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300 rounded-full p-3 flex items-center justify-center">
                    <FaCalendarAlt size={24} />
                  </div>
                  <div className="text-center text-xs font-medium">
                    Book Meeting
                  </div>
                </div>
              )}

              {/* <div
                className="group flex flex-col items-center gap-3 p-4 rounded-xl cursor-pointer
                  bg-muted/50 hover:bg-muted transition-all duration-200 border border-transparent hover:border-border/50"
                onClick={() => togglePanel("assistant")}
              >
                <div className="bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20 group-hover:scale-110 transition-all duration-300 rounded-full p-3 flex items-center justify-center">
                  <FaRobot size={24} />
                </div>
                <div className="text-center text-xs font-medium">SaaS Assistant</div>
              </div> */}
            </div>
          )}

          {/* Animated panel – full width inside dropdown */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${activePanel
                ? "opacity-100 translate-y-0"
                : "max-h-0 opacity-0 translate-y-4"
              }
            `}
          >
            {activePanel === "message" && (
              <Message setActivePanel={setActivePanel} />
            )}

            {activePanel === "newsletter" && (
              <Newsletter setActivePanel={setActivePanel} />
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default Support;

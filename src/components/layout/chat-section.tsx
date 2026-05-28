"use client";

import { useState, useCallback, useId } from "react";
import { SquarePen, MoreHorizontal } from "lucide-react";
import { nanoid } from "nanoid";
import { ChatContainer } from "@/components/chat/chat-container";
import { SidebarHeader, SidebarContent } from "@/components/ui/sidebar";
import { useChatStore } from "@/hooks/use-chat-store";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function KlarLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M28.0074 41.4285C33.7413 41.4285 38.4229 46.0204 38.5678 51.72L38.5711 51.9922V68.8908C38.5711 75.0166 33.5881 79.9999 27.4624 80C21.3365 80 16.3533 75.0167 16.3532 68.8908C16.3532 62.765 21.3365 57.7817 27.4624 57.7817C29.0823 57.7818 30.3945 59.0944 30.3945 60.7142C30.3944 62.3341 29.0822 63.6463 27.4624 63.6464C24.6162 63.6464 22.292 65.9265 22.22 68.7556L22.2179 68.8908C22.218 71.7822 24.571 74.1353 27.4624 74.1353C30.3084 74.1352 32.6327 71.8551 32.7048 69.0261L32.7068 68.8908V51.9922C32.7067 49.4827 30.7276 47.4252 28.2489 47.2989L28.0074 47.2928H11.1088C8.21749 47.2929 5.8644 49.646 5.8643 52.5372C5.86431 55.4286 8.21742 57.7816 11.1088 57.7817C13.9549 57.7817 16.2791 55.5016 16.3512 52.6725L16.3532 52.5372C16.3533 50.9174 17.6655 49.6052 19.2853 49.6051L19.4361 49.6088C20.936 49.6847 22.1382 50.8866 22.2142 52.3865L22.2179 52.5372C22.2179 58.5673 17.3892 63.4907 11.3952 63.6431L11.1088 63.6464C5.0787 63.6463 0.155708 58.8176 0.00326884 52.8237L0 52.5372C0.000101004 46.4115 4.98301 41.4286 11.1088 41.4285H28.0074Z"
        fill="currentColor"
      />
      <path
        d="M68.8908 41.4285C74.9208 41.4285 79.8438 46.2569 79.9963 52.2508L80 52.5372C80 58.6631 75.0167 63.6463 68.8908 63.6464C62.8608 63.6464 57.9374 58.8177 57.785 52.8237L57.7817 52.5372C57.7818 50.9173 59.0944 49.6051 60.7142 49.6051C62.2835 49.6052 63.5642 50.8368 63.6427 52.3865L63.6464 52.5372C63.6464 55.4286 65.9995 57.7817 68.8908 57.7817C71.7822 57.7816 74.1353 55.4286 74.1353 52.5372C74.1352 49.6912 71.8551 47.3669 69.0261 47.2948L68.8908 47.2928H51.9922C49.4018 47.2929 47.2929 49.4018 47.2928 51.9922V68.8908C47.2928 71.7821 49.646 74.1352 52.5372 74.1353C55.3834 74.1353 57.7076 71.8552 57.7796 69.0261L57.7817 68.8908C57.7817 66.0447 55.5016 63.7204 52.6725 63.6484L52.5372 63.6464C50.9174 63.6463 49.6052 62.3341 49.6051 60.7142C49.6051 59.0944 50.9173 57.7818 52.5372 57.7817L52.8237 57.785C58.8177 57.9374 63.6464 62.8608 63.6464 68.8908C63.6463 74.9209 58.8177 79.8443 52.8237 79.9967L52.5372 80C46.4115 79.9999 41.4285 75.0166 41.4285 68.8908V51.9922C41.4286 46.1673 46.1673 41.4286 51.9922 41.4285H68.8908Z"
        fill="currentColor"
      />
      <path
        d="M27.4624 0C33.4923 8.27561e-05 38.4149 4.82842 38.5674 10.8223L38.5711 11.1088V28.0074C38.571 33.8323 33.8323 38.571 28.0074 38.5711H11.1088C4.983 38.571 8.40953e-05 33.5881 0 27.4624C6.33467e-06 21.3366 4.98294 16.3533 11.1088 16.3532L11.3952 16.3569C17.3892 16.5094 22.2179 21.4323 22.2179 27.4624C22.2178 29.0317 20.9859 30.3124 19.4361 30.3908L19.2853 30.3945C17.6655 30.3944 16.3533 29.0822 16.3532 27.4624C16.3532 24.6162 14.0731 22.292 11.244 22.22L11.1088 22.2179C8.26264 22.218 5.93836 24.498 5.86635 27.3271L5.8643 27.4624C5.86438 30.3536 8.21748 32.7067 11.1088 32.7068H28.0074C30.5169 32.7067 32.5744 30.7276 32.7007 28.2489L32.7068 28.0074V11.1088C32.7067 8.26269 30.4266 5.93843 27.5976 5.86635L27.4624 5.8643C24.6162 5.86431 22.292 8.1444 22.22 10.9735L22.2179 11.1088C22.2179 14.0001 24.571 16.3532 27.4624 16.3532C29.0316 16.3533 30.3123 17.5849 30.3908 19.1346L30.3945 19.2853C30.3945 20.9052 29.0823 22.2178 27.4624 22.2179C21.4323 22.2179 16.5094 17.3892 16.3569 11.3952L16.3532 11.1088C16.3533 4.98294 21.3366 6.33467e-06 27.4624 0Z"
        fill="currentColor"
      />
      <path
        d="M52.8237 0.00326884C58.7224 0.153287 63.493 4.92355 63.6431 10.8223L63.6464 11.1088C63.6464 17.1388 58.8177 22.0622 52.8237 22.2146L52.5372 22.2179C50.9679 22.2178 49.6872 20.9859 49.6088 19.4361L49.6051 19.2853C49.6052 17.6655 50.9174 16.3533 52.5372 16.3532L52.6725 16.3512C55.4567 16.2803 57.7088 14.0282 57.7796 11.244L57.7817 11.1088C57.7816 8.21742 55.4286 5.86431 52.5372 5.8643C49.646 5.8644 47.2929 8.21749 47.2928 11.1088V28.0074C47.2928 30.5978 49.4018 32.7067 51.9922 32.7068H68.8908C71.7369 32.7068 74.0612 30.4267 74.1332 27.5976L74.1353 27.4624C74.1353 24.6162 71.8552 22.292 69.0261 22.22L68.8908 22.2179C65.9995 22.2179 63.6464 24.571 63.6464 27.4624C63.6463 29.0822 62.3341 30.3944 60.7142 30.3945C59.0944 30.3945 57.7818 29.0823 57.7817 27.4624C57.7817 21.3365 62.765 16.3532 68.8908 16.3532C75.0167 16.3533 80 21.3365 80 27.4624C79.9999 33.5881 75.0166 38.5711 68.8908 38.5711H51.9922C46.1673 38.571 41.4285 33.8323 41.4285 28.0074V11.1088C41.4286 4.98301 46.4115 0.000101004 52.5372 0L52.8237 0.00326884Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChatSection() {
  // Use React's useId for initial value to avoid hydration mismatch
  const initialId = useId();
  const [chatId, setChatId] = useState(initialId);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const resetMortgageData = useMortgageStore((state) => state.resetAll);
  const adress = useMortgageStore((state) => state.adress);

  const hasAddress = adress.trim().length > 0;

  const handleNewChat = useCallback(() => {
    clearMessages();
    resetMortgageData();
    setChatId(nanoid());
  }, [clearMessages, resetMortgageData]);

  return (
    <div className="flex h-full flex-1 flex-col bg-sidebar">
      {/* Header */}
      <SidebarHeader className="flex-row items-center justify-between px-5 py-3.5 gap-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-foreground">
            <KlarLogo className="h-5 w-5" />
          </div>
          {hasAddress ? (
            <span className="text-[13px] font-medium text-foreground/90 truncate max-w-[160px]">
              {adress.trim()}
            </span>
          ) : (
            <span className="text-[13px] font-medium text-foreground/90">
              Bolåneplaner
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              onClick={handleNewChat}
              className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-muted-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Ny chatt"
            >
              <SquarePen className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Ny</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Starta ny chatt</p>
            </TooltipContent>
          </Tooltip>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fler alternativ"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </SidebarHeader>

      {/* Chat with AI */}
      <SidebarContent className="p-0">
        <ChatContainer chatId={chatId} />
      </SidebarContent>
    </div>
  );
}

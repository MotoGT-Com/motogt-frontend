import { useEffect } from "react";

// Extend the Window interface to include Tidio
declare global {
  interface Window {
    tidioChatApi?: {
      open: () => void;
      close: () => void;
      show: () => void;
      hide: () => void;
      messageFromOperator: (message: string) => void;
      messageFromVisitor: (message: string) => void;
      setOperatorStatus: (status: "online" | "offline") => void;
      setVisitorData: (data: Record<string, any>) => void;
      on: (event: string, callback: (data: any) => void) => void;
      off: (event: string, callback: (data: any) => void) => void;
    };
  }
}

interface TidioChatProps {
  onChatOpen?: () => void;
  onChatClose?: () => void;
  onMessageReceived?: (message: string) => void;
  onMessageSent?: (message: string) => void;
}

export function TidioChat({
  onChatOpen,
  onChatClose,
  onMessageReceived,
  onMessageSent,
}: TidioChatProps) {
  useEffect(() => {
    // Wait for Tidio to load
    const checkTidio = () => {
      if (window.tidioChatApi) {
        // Hide the chat widget by default and ensure it stays hidden
        window.tidioChatApi.hide();

        // Set up event listeners
        if (onChatOpen) {
          window.tidioChatApi.on("chat:opened", onChatOpen);
        }

        if (onChatClose) {
          window.tidioChatApi.on("chat:closed", onChatClose);
        }

        if (onMessageReceived) {
          window.tidioChatApi.on("message:received", onMessageReceived);
        }

        if (onMessageSent) {
          window.tidioChatApi.on("message:sent", onMessageSent);
        }
      } else {
        // Retry after 100ms if Tidio hasn't loaded yet
        setTimeout(checkTidio, 100);
      }
    };

    checkTidio();

    // Cleanup event listeners on unmount
    return () => {
      if (window.tidioChatApi) {
        if (onChatOpen) {
          window.tidioChatApi.off("chat:opened", onChatOpen);
        }
        if (onChatClose) {
          window.tidioChatApi.off("chat:closed", onChatClose);
        }
        if (onMessageReceived) {
          window.tidioChatApi.off("message:received", onMessageReceived);
        }
        if (onMessageSent) {
          window.tidioChatApi.off("message:sent", onMessageSent);
        }
      }
    };
  }, [onChatOpen, onChatClose, onMessageReceived, onMessageSent]);

  return null; // This component doesn't render anything
}

// Utility functions for programmatic control
export const TidioChatUtils = {
  open: () => {
    if (window.tidioChatApi) {
      window.tidioChatApi.open();
    }
  },

  close: () => {
    if (window.tidioChatApi) {
      window.tidioChatApi.close();
    }
  },

  show: () => {
    if (window.tidioChatApi) {
      window.tidioChatApi.show();
    }
  },

  hide: () => {
    if (window.tidioChatApi) {
      window.tidioChatApi.hide();
    }
  },

  sendMessage: (message: string) => {
    if (window.tidioChatApi) {
      window.tidioChatApi.messageFromVisitor(message);
    }
  },

  setVisitorData: (data: Record<string, any>) => {
    if (window.tidioChatApi) {
      window.tidioChatApi.setVisitorData(data);
    }
  },

  isLoaded: () => {
    return !!window.tidioChatApi;
  },
};

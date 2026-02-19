import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRevalidator } from "react-router";

import { useAuthModal } from "~/context/AuthModalContext";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

import { ForgotPasswordView } from "./views/ForgotPasswordView";
import { LoginView } from "./views/LoginView";
import { OTPView } from "./views/OTPView";
import { RegisterView } from "./views/RegisterView";

export function AuthModal() {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const {
    isOpen,
    view,
    otpContext,
    pendingCredentials,
    closeAuthModal,
    completeAuthAndContinue,
    setAuthView,
    setOtpContext,
    setPendingCredentials,
  } = useAuthModal();

  const handleAuthSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cart"] }),
      queryClient.invalidateQueries({ queryKey: ["garageCars"] }),
      queryClient.invalidateQueries({ queryKey: ["favorites"] }),
      queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    ]);

    revalidator.revalidate();
    completeAuthAndContinue();
  };

  const renderView = () => {
    if (view === "register") {
      return (
        <RegisterView
          onRegistered={(email) => {
            setOtpContext({ email, source: "register" });
            setAuthView("verifyOTP");
          }}
          onSwitchToLogin={() => setAuthView("login")}
        />
      );
    }

    if (view === "login") {
      return (
        <LoginView
          onSwitchToRegister={() => setAuthView("register")}
          onForgotPassword={() => setAuthView("forgotPassword")}
          onRequireOtp={(email, password) => {
            setPendingCredentials({ email, password });
            setOtpContext({ email, source: "login" });
            setAuthView("verifyOTP");
          }}
          onAuthSuccess={handleAuthSuccess}
        />
      );
    }

    if (view === "forgotPassword") {
      return <ForgotPasswordView onBackToLogin={() => setAuthView("login")} />;
    }

    return (
      <OTPView
        email={otpContext?.email ?? ""}
        source={otpContext?.source ?? "register"}
        pendingCredentials={pendingCredentials}
        onBack={() => setAuthView(otpContext?.source === "login" ? "login" : "register")}
        onSwitchToLogin={() => {
          setPendingCredentials(undefined);
          setOtpContext(undefined);
          setAuthView("login");
        }}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && closeAuthModal()}>
      <DialogContent
        showCloseButton={false}
        className="!top-auto bottom-0 !translate-y-0 w-[calc(100%-1rem)] max-w-[38rem] rounded-t-2xl border border-black/10 bg-white p-0 shadow-2xl sm:!top-[50%] sm:bottom-auto sm:!translate-y-[-50%] sm:rounded-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("authModal.title")}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[92dvh] overflow-y-auto px-5 pb-6 pt-5 text-start sm:max-h-[85dvh] sm:px-6 sm:pb-8 sm:pt-4" dir="auto">
          <div className="mb-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={closeAuthModal}
              aria-label={t("buttons.close")}
            >
              <X className="size-4" />
            </Button>
          </div>
          {renderView()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

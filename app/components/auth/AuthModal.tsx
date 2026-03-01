import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { href, useNavigate, useRevalidator } from "react-router";

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
  const navigate = useNavigate();
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
    const isGuestOtp = otpContext?.source === "guestCheckout";

    if (view === "checkoutSelection") {
      return (
        <CheckoutSelectionView
          onClose={closeAuthModal}
          onContinueAsGuest={() => {
            closeAuthModal();
            navigate(href("/checkout"));
          }}
          onLoginOrRegister={() => setAuthView("login")}
        />
      );
    }

    if (view === "register") {
      return (
        <RegisterView
          onClose={closeAuthModal}
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
          onClose={closeAuthModal}
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
        otpContext={otpContext}
        pendingCredentials={pendingCredentials}
        onBack={() => {
          if (isGuestOtp) {
            closeAuthModal();
            return;
          }
          setAuthView(otpContext?.source === "login" ? "login" : "register");
        }}
        onSwitchToLogin={() => {
          setPendingCredentials(undefined);
          setOtpContext(undefined);
          setAuthView("login");
        }}
        onAuthSuccess={async () => {
          if (isGuestOtp) {
            await otpContext?.onVerified?.();
            closeAuthModal();
            return;
          }
          await handleAuthSuccess();
        }}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && closeAuthModal()}>
      <DialogContent
        showCloseButton={false}
        className="!top-auto bottom-2 !translate-y-0 h-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto rounded-2xl border border-black/10 bg-white p-0 shadow-[0_18px_45px_rgba(0,0,0,0.16)] sm:!top-[50%] sm:bottom-auto sm:!translate-y-[-50%] sm:max-h-[calc(100dvh-2rem)] sm:w-[min(92vw,28rem)] sm:max-w-md sm:rounded-xl lg:w-[min(92vw,28rem)] lg:max-w-md"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("authModal.title")}</DialogTitle>
        </DialogHeader>

        <div
          className="px-4 py-5 text-start sm:px-6 sm:py-6"
          dir="auto"
        >
          {view !== "checkoutSelection" && view !== "register" && view !== "login" && view !== "verifyOTP" ? (
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
          ) : null}
          <div key={view} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            {renderView()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutSelectionView({
  onClose,
  onContinueAsGuest,
  onLoginOrRegister,
}: {
  onClose: () => void;
  onContinueAsGuest: () => void;
  onLoginOrRegister: () => void;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-5 text-start">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-black sm:text-3xl">
          {t("authModal.checkoutSelection.title")}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={onClose}
          aria-label={t("buttons.close")}
        >
          <X className="size-5 text-[#CF172F]" />
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("authModal.checkoutSelection.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 border-2 font-bold"
          onClick={onContinueAsGuest}
        >
          {t("authModal.checkoutSelection.continueAsGuest")}
        </Button>
        <Button
          type="button"
          className="h-11 bg-[#CF172F] font-bold text-white hover:bg-[#b51429]"
          onClick={onLoginOrRegister}
        >
          {t("authModal.checkoutSelection.loginOrCreate")}
        </Button>
      </div>
    </div>
  );
}

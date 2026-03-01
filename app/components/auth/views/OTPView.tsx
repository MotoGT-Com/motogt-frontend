import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/components/ui/input-otp";
import { postApiAuthLogin, postApiAuthOtpSend, postApiAuthOtpVerify } from "~/lib/client";
import type { OtpContext } from "~/context/AuthModalContext";

import {
  extractApiError,
  persistAuthSession,
} from "./auth-session-client";

type OTPViewProps = {
  otpContext?: OtpContext;
  pendingCredentials?: {
    email: string;
    password: string;
  };
  onBack: () => void;
  onSwitchToLogin: () => void;
  onAuthSuccess: () => Promise<void>;
};

export function OTPView({
  otpContext,
  pendingCredentials,
  onBack,
  onSwitchToLogin,
  onAuthSuccess,
}: OTPViewProps) {
  const { t, i18n } = useTranslation("common");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isResendingSms, setIsResendingSms] = useState(false);
  const isRtl = i18n.dir() === "rtl";
  const isGuestOtp = otpContext?.source === "guestCheckout";
  const targetEmail = otpContext && "email" in otpContext ? otpContext.email : "";
  const targetPhone = otpContext && "phone" in otpContext ? otpContext.phone : "";
  const otpLength = isGuestOtp ? 4 : 6;

  const schema = useMemo(
    () =>
      z.object({
        otp: z
          .string()
          .trim()
          .regex(
            isGuestOtp ? /^\d{4}$/ : /^\d{6}$/,
            isGuestOtp
              ? t("authModal.validation.guestOtpLength")
              : t("authModal.validation.otpLength")
          ),
      }),
    [isGuestOtp, t]
  );

  type OtpFormValues = z.infer<typeof schema>;

  const form = useForm<OtpFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      otp: "",
    },
  });

  const onSubmit = async ({ otp }: OtpFormValues) => {
    setApiError(null);

    if (isGuestOtp) {
      if (otp !== "1234") {
        setApiError(t("authModal.errors.demoOtpInvalid"));
        return;
      }

      await onAuthSuccess();
      return;
    }

    const verifyResponse = await postApiAuthOtpVerify({
      body: {
        email: targetEmail,
        otp,
      },
    });

    if (verifyResponse.error) {
      setApiError(extractApiError(verifyResponse.error, t("authModal.errors.otpFailed")));
      return;
    }

    if (otpContext?.source === "register") {
      onSwitchToLogin();
      return;
    }

    if (!pendingCredentials) {
      setApiError(t("authModal.errors.loginFailed"));
      return;
    }

    const loginResponse = await postApiAuthLogin({
      body: {
        email: pendingCredentials.email,
        password: pendingCredentials.password,
      },
    });

    if (loginResponse.error) {
      setApiError(extractApiError(loginResponse.error, t("authModal.errors.loginFailed")));
      return;
    }

    if (loginResponse.data.data.auth.requiresEmailVerification) {
      setApiError(t("authModal.errors.otpStillRequired"));
      return;
    }

    const accessToken = loginResponse.data.data.auth.accessToken;
    const refreshToken = loginResponse.data.data.auth.refreshToken;

    if (!accessToken || !refreshToken) {
      setApiError(t("authModal.errors.sessionFailed"));
      return;
    }

    try {
      await persistAuthSession(accessToken, refreshToken);
      await onAuthSuccess();
    } catch (error) {
      setApiError(extractApiError(error, t("authModal.errors.sessionFailed")));
    }
  };

  const resendOtp = async () => {
    setApiError(null);
    setIsResending(true);

    if (isGuestOtp) {
      setIsResending(false);
      return;
    }

    const response = await postApiAuthOtpSend({
      body: {
        email: targetEmail,
      },
    });
    setIsResending(false);

    if (response.error) {
      setApiError(extractApiError(response.error, t("authModal.errors.resendFailed")));
      return;
    }
  };

  const resendOtpViaSms = async () => {
    setApiError(null);
    setIsResendingSms(true);
    setIsResendingSms(false);
  };

  return (
    <div className="space-y-6 text-start" dir={isRtl ? "rtl" : "ltr"}>
      {isGuestOtp ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={onBack}
              aria-label={t("authModal.buttons.back")}
            >
              <ArrowLeft className={`size-4 text-[#CF172F] ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <h2 className={`text-xl font-extrabold tracking-tight text-black sm:text-2xl ${isRtl ? "" : "uppercase"}`}>
              {t("authModal.verifyOTP.phoneTitle")}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">
            {t("authModal.verifyOTP.whatsappNotice")}
            <br />
            <span className="font-bold text-black/60" dir="ltr">{targetPhone}</span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className={`size-4 ${isRtl ? "rotate-180" : ""}`} /> {t("authModal.buttons.back")}
          </button>
          <h2 className="text-2xl font-extrabold text-black">{t("authModal.verifyOTP.title")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("authModal.verifyOTP.subtitle")}{" "}
            <span className="font-semibold" dir="ltr">{targetEmail}</span>
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP maxLength={otpLength} {...field} dir="ltr">
                    <InputOTPGroup className="mx-auto w-fit justify-center gap-2.5 sm:gap-3">
                      {Array.from({ length: otpLength }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          aria-label={t("authModal.verifyOTP.ariaOtpSlot", { index: index + 1 })}
                          index={index}
                          placeholderChar={isGuestOtp ? "0" : undefined}
                          hideFakeCaret={isGuestOtp}
                          className={
                            isGuestOtp
                              ? "h-16 w-14 rounded-md border-[#CF172F] text-3xl font-bold shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:h-[64px] sm:w-[56px]"
                              : "h-11 w-11 border-primary text-lg"
                          }
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {apiError ? (
            <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          ) : null}

          <Button type="submit" className="h-12 w-full bg-[#CF172F] font-koulen text-white hover:bg-[#b51429]" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? t("authModal.buttons.pleaseWait")
              : t("authModal.buttons.continue")}
          </Button>

          <p className="text-sm text-gray-500">
            {t("authModal.verifyOTP.didNotReceive")}{" "}
            <button
              type="button"
              onClick={resendOtp}
              className="text-sm font-semibold text-[#CF172F]"
              disabled={isResending}
            >
              {isResending ? t("authModal.buttons.pleaseWait") : t("authModal.verifyOTP.resend")}
            </button>
          </p>
          {isGuestOtp ? (
            <p className="text-sm text-gray-500">
              {t("authModal.verifyOTP.didNotReceiveSms")}{" "}
              <button
                type="button"
                onClick={resendOtpViaSms}
                className="text-sm font-semibold text-[#CF172F]"
                disabled={isResendingSms}
              >
                {isResendingSms
                  ? t("authModal.buttons.pleaseWait")
                  : t("authModal.verifyOTP.sendViaSms")}
              </button>
            </p>
          ) : null}
        </form>
      </Form>
    </div>
  );
}

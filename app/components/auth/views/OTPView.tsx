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

import {
  extractApiError,
  persistAuthSession,
} from "./auth-session-client";

type OTPViewProps = {
  email: string;
  source: "register" | "login";
  pendingCredentials?: {
    email: string;
    password: string;
  };
  onBack: () => void;
  onSwitchToLogin: () => void;
  onAuthSuccess: () => Promise<void>;
};

export function OTPView({
  email,
  source,
  pendingCredentials,
  onBack,
  onSwitchToLogin,
  onAuthSuccess,
}: OTPViewProps) {
  const { t } = useTranslation("common");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        otp: z
          .string()
          .trim()
          .regex(/^\d{6}$/, t("authModal.validation.otpLength")),
      }),
    [t]
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

    const verifyResponse = await postApiAuthOtpVerify({
      body: {
        email,
        otp,
      },
    });

    if (verifyResponse.error) {
      setApiError(extractApiError(verifyResponse.error, t("authModal.errors.otpFailed")));
      return;
    }

    if (source === "register") {
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
    const response = await postApiAuthOtpSend({
      body: {
        email,
      },
    });
    setIsResending(false);

    if (response.error) {
      setApiError(extractApiError(response.error, t("authModal.errors.resendFailed")));
      return;
    }
  };

  return (
    <div className="space-y-2 text-start">
      <div className="space-y-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" /> {t("authModal.buttons.back")}
        </button>
        <h2 className="text-2xl font-extrabold text-black">{t("authModal.verifyOTP.title")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("authModal.verifyOTP.subtitle")} <span className="font-semibold">{email}</span>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP maxLength={6} {...field} dir="ltr">
                    <InputOTPGroup className="w-full justify-between gap-2">
                      <InputOTPSlot aria-label={t("authModal.verifyOTP.ariaOtpSlot", { index: 1 })} index={0} className="h-11 w-11 border-primary text-lg" />
                      <InputOTPSlot aria-label={t("authModal.verifyOTP.ariaOtpSlot", { index: 2 })} index={1} className="h-11 w-11 border-primary text-lg" />
                      <InputOTPSlot aria-label={t("authModal.verifyOTP.ariaOtpSlot", { index: 3 })} index={2} className="h-11 w-11 border-primary text-lg" />
                      <InputOTPSlot aria-label={t("authModal.verifyOTP.ariaOtpSlot", { index: 4 })} index={3} className="h-11 w-11 border-primary text-lg" />
                      <InputOTPSlot aria-label={t("authModal.verifyOTP.ariaOtpSlot", { index: 5 })} index={4} className="h-11 w-11 border-primary text-lg" />
                      <InputOTPSlot aria-label={t("authModal.verifyOTP.ariaOtpSlot", { index: 6 })} index={5} className="h-11 w-11 border-primary text-lg" />
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

          <Button type="submit" className="w-full font-koulen" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? t("authModal.buttons.pleaseWait")
              : t("authModal.buttons.continue")}
          </Button>

          <p className="text-sm text-muted-foreground">
            {t("authModal.verifyOTP.didNotReceive")} <button type="button" onClick={resendOtp} className="font-semibold text-primary" disabled={isResending}>{isResending ? t("authModal.buttons.pleaseWait") : t("authModal.verifyOTP.resend")}</button>
          </p>
        </form>
      </Form>
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, X } from "lucide-react";
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
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { postApiAuthLogin } from "~/lib/client";

import { extractApiError, persistAuthSession } from "./auth-session-client";

type LoginViewProps = {
  onClose: () => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  onRequireOtp: (email: string, password: string) => void;
  onAuthSuccess: () => Promise<void>;
};

export function LoginView({
  onClose,
  onSwitchToRegister,
  onForgotPassword,
  onRequireOtp,
  onAuthSuccess,
}: LoginViewProps) {
  const { t } = useTranslation("common");
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .email(t("authModal.validation.invalidEmail")),
        password: z.string().min(1, t("authModal.validation.passwordRequired")),
      }),
    [t]
  );

  type LoginFormValues = z.infer<typeof schema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);

    const response = await postApiAuthLogin({
      body: {
        email: values.email,
        password: values.password,
      },
    });

    if (response.error) {
      setApiError(extractApiError(response.error, t("authModal.errors.loginFailed")));
      return;
    }

    if (response.data.data.auth.requiresEmailVerification) {
      onRequireOtp(values.email, values.password);
      return;
    }

    const accessToken = response.data.data.auth.accessToken;
    const refreshToken = response.data.data.auth.refreshToken;

    if (!accessToken || !refreshToken) {
      setApiError(t("authModal.errors.loginFailed"));
      return;
    }

    try {
      await persistAuthSession(accessToken, refreshToken);
      await onAuthSuccess();
    } catch (error) {
      setApiError(extractApiError(error, t("authModal.errors.sessionFailed")));
    }
  };

  return (
    <div className="space-y-2 text-start">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-extrabold text-black sm:text-3xl">{t("authModal.login.title")}</h2>
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
        <p className="text-sm text-muted-foreground leading-relaxed">{t("authModal.login.subtitle")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("authModal.fields.emailLabel")}</FormLabel>
                <FormControl>
                  <Input
                    autoFocus
                    type="email"
                    placeholder={t("authModal.fields.emailPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("authModal.fields.passwordLabel")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("authModal.fields.passwordPlaceholder")}
                      className="pe-12"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute end-2 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                    >
                      {showPassword ? <EyeOff className="size-5 text-black/45" /> : <Eye className="size-5 text-black/45" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-muted-foreground underline hover:text-primary"
          >
            {t("authModal.login.forgotPassword")}
          </button>

          {apiError ? (
            <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          ) : null}

          <Button type="submit" className="w-full font-koulen" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? t("authModal.buttons.pleaseWait")
              : t("authModal.buttons.signIn")}
          </Button>

          <p className="text-sm">
            <span className="text-muted-foreground">{t("authModal.login.noAccount")}</span>{" "}
            <button type="button" className="font-bold text-primary" onClick={onSwitchToRegister}>{t("authModal.buttons.createAccount")}</button>
          </p>
        </form>
      </Form>
    </div>
  );
}

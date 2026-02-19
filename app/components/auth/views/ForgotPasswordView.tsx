import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";
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
import { postApiAuthForgotPassword } from "~/lib/client";

import { extractApiError } from "./auth-session-client";

type ForgotPasswordViewProps = {
  onBackToLogin: () => void;
};

export function ForgotPasswordView({ onBackToLogin }: ForgotPasswordViewProps) {
  const { t } = useTranslation("common");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .email(t("authModal.validation.invalidEmail")),
      }),
    [t]
  );

  type ForgotFormValues = z.infer<typeof schema>;

  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotFormValues) => {
    setApiError(null);
    const response = await postApiAuthForgotPassword({
      body: { email: values.email },
    });

    if (response.error) {
      setApiError(
        extractApiError(response.error, t("authModal.errors.forgotFailed"))
      );
      return;
    }

    setIsSuccess(true);
  };

  return (
    <div className="space-y-2 text-start">
      <div className="space-y-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          onClick={onBackToLogin}
        >
          <ArrowLeft className="size-4" /> {t("authModal.buttons.backToLogin")}
        </button>
        <h2 className="text-2xl font-extrabold text-black">
          {t("authModal.forgotPassword.title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("authModal.forgotPassword.subtitle")}</p>
      </div>

      {isSuccess ? (
        <div className="rounded-sm border border-primary/35 bg-primary/5 p-4 text-sm text-primary">
          <div className="flex items-center gap-2 font-medium">
            <MailCheck className="size-5" />
            {t("authModal.forgotPassword.success")}
          </div>
          <div className="mt-3">
            <Button type="button" className="w-full font-koulen" size="lg" onClick={onBackToLogin}>
              {t("authModal.buttons.signIn")}
            </Button>
          </div>
        </div>
      ) : (
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

            {apiError ? (
              <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {apiError}
              </div>
            ) : null}

            <Button type="submit" className="w-full font-koulen" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? t("authModal.buttons.pleaseWait")
                : t("authModal.buttons.sendResetLink")}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}

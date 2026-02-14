import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot, } from "~/components/ui/input-otp";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "~/components/ui/form";
import { ArrowLeft, ChevronLeft, MailCheckIcon } from "lucide-react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { forgotPasswordMutationOptions } from "~/lib/queries";
import { useTranslation } from "react-i18next";

const emailSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }).min(1, {
    message: "Email address is required",
  }),
});

export default function ForgotPassword() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const forgotPasswordMutation = useMutation(forgotPasswordMutationOptions);
  const { t } = useTranslation("auth");

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  if (step === "email") {
    return (
      <>
        <title>{t("forgotPassword.pageTitle")}</title>
        {/* Header with Back Button */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link to="/login">
                <ChevronLeft />
              </Link>
            </Button>
            <h1 className="text-2xl font-extrabold">
              {t("forgotPassword.title")}
            </h1>
          </div>
          {!forgotPasswordMutation.isSuccess ? (
            <div className="text-sm text-muted-foreground">
              {t("forgotPassword.description")}
            </div>
          ) : (
            <div className="font-medium border-2 border-primary p-4 flex items-center gap-4 mt-5">
              <MailCheckIcon className="size-10 text-primary" />
              {t("forgotPassword.emailSent")}
            </div>
          )}
        </div>

        {/* Email Form */}
        {!forgotPasswordMutation.isSuccess && (
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit((values) =>
                forgotPasswordMutation.mutate(values)
              )}
              className="space-y-6"
            >
              {/* Email Field */}
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("forgotPassword.emailLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("forgotPassword.emailPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {forgotPasswordMutation.error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {forgotPasswordMutation.error.message}
                </div>
              )}

              {/* Submit Button and Sign In Link */}
              <div className="space-y-4">
                <Button
                  type="submit"
                  className="w-full font-koulen"
                  size="lg"
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending
                    ? t("forgotPassword.sending")
                    : t("forgotPassword.continue")}
                </Button>

                {/* Sign In Link */}
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {t("forgotPassword.rememberPassword")}
                  </span>{" "}
                  <Link
                    className="font-bold text-primary hover:underline"
                    to="/login"
                  >
                    {t("forgotPassword.signIn")}
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        )}
      </>
    );
  }
}

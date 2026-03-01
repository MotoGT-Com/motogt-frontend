import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { postApiAuthRegister } from "~/lib/client";

import { extractApiError } from "./auth-session-client";

type RegisterViewProps = {
  onClose: () => void;
  onRegistered: (email: string) => void;
  onSwitchToLogin: () => void;
};

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export function RegisterView({ onClose, onRegistered, onSwitchToLogin }: RegisterViewProps) {
  const { t } = useTranslation("common");
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        firstName: z
          .string()
          .trim()
          .min(2, t("authModal.validation.firstNameRequired")),
        lastName: z
          .string()
          .trim()
          .min(2, t("authModal.validation.lastNameRequired")),
        email: z
          .string()
          .trim()
          .email(t("authModal.validation.invalidEmail")),
        phoneNumber: z
          .string()
          .trim()
          .min(8, t("authModal.validation.invalidPhone")),
        password: z
          .string()
          .min(8, t("authModal.validation.passwordMin"))
          .regex(passwordPattern, t("authModal.validation.passwordComplexity")),
        agreeToTerms: z
          .boolean()
          .refine((value) => value === true, {
            message: t("authModal.validation.termsRequired"),
          }),
      }),
    [t]
  );

  type RegisterFormValues = z.infer<typeof schema>;

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      agreeToTerms: false,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);

    const response = await postApiAuthRegister({
      body: {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
      },
    });

    if (response.error) {
      setApiError(
        extractApiError(response.error, t("authModal.errors.registerFailed"))
      );
      return;
    }

    onRegistered(values.email);
  };

  return (
    <div className="space-y-2 text-start">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-extrabold text-black sm:text-3xl">{t("authModal.register.title")}</h2>
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
        <p className="text-sm text-muted-foreground leading-relaxed">{t("authModal.register.subtitle")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold italic">{t("authModal.fields.firstNameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder={t("authModal.fields.firstNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold italic">{t("authModal.fields.lastNameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("authModal.fields.lastNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold italic">{t("authModal.fields.emailLabel")}</FormLabel>
                <FormControl>
                  <Input
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
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("authModal.fields.phoneLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder={t("authModal.fields.phonePlaceholder")}
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
                <FormLabel className="font-bold italic">{t("authModal.fields.passwordLabel")}</FormLabel>
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
                <p className="text-sm text-muted-foreground">{t("authModal.register.passwordHint")}</p>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agreeToTerms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="h-5 w-5 rounded-[4px] border-[#d7d7d7] data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                  <p className="text-sm font-normal leading-relaxed text-[#7c7c7c]">
                    {t("authModal.register.termsPrefix")}{" "}
                    <Link to="/terms" className="font-medium text-primary hover:underline">
                      {t("authModal.register.termsLink")}
                    </Link>{" "}
                    {t("authModal.register.termsAnd")}{" "}
                    <Link to="/privacy" className="font-medium text-primary hover:underline">
                      {t("authModal.register.privacyLink")}
                    </Link>
                    .
                  </p>
                </div>
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
              : t("authModal.buttons.signUp")}
          </Button>

          <p className="text-sm">
            <span className="text-muted-foreground">{t("authModal.register.haveAccount")}</span>{" "}
            <button type="button" className="font-bold text-primary" onClick={onSwitchToLogin}>{t("authModal.buttons.signIn")}</button>
          </p>
        </form>
      </Form>
    </div>
  );
}

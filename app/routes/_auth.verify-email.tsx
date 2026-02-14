import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { redirect, useSearchParams, useSubmit } from "react-router";
import { Button } from "~/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, } from "~/components/ui/input-otp";
import { Form, FormControl, FormField, FormItem, FormMessage, } from "~/components/ui/form";
import { ChevronLeft } from "lucide-react";
import type { Route } from "./+types/_auth.verify-email";
import { postApiAuthOtpVerify } from "~/lib/client";
import { useTranslation } from "react-i18next";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  try {
    const otpResponse = await postApiAuthOtpVerify({
      body: {
        email: formData.get("email") as string,
        otp: formData.get("otp") as string,
      },
    });

    if (otpResponse.error) {
      return {
        // @ts-ignore
        error: otpResponse.error.error.message,
      };
    }
    // Redirect to login page with success message after verification
    return redirect("/login?otpVerified=true");
  } catch (error) {
    return {
      error: "OTP verification failed. Please try again.",
    };
  }
}

const otpSchema = z.object({
  otp: z
    .string()
    .min(6, { message: "Please enter the 6-digit verification code" }),
});

export default function VerifyEmail({ actionData }: Route.ComponentProps) {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });
  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    const formData = new FormData();
    formData.append("step", "otp");
    formData.append("otp", values.otp);
    formData.append("email", searchParams.get("email") as string);
    await submit(formData, {
      method: "POST",
    });
  };
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft />
          </Button>
          <h1 className="text-2xl font-extrabold">{t("verifyEmail.title")}</h1>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {t("verifyEmail.enterCode")}{" "}
          <span className="font-bold">{searchParams.get("email")}</span>
        </div>
        <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
          {t("verifyEmail.checkSpam")}
        </p>
      </div>
      <Form {...otpForm}>
        <form
          onSubmit={otpForm.handleSubmit(onOtpSubmit)}
          className="space-y-6"
        >
          {/* General Error */}
          {actionData?.error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {actionData.error}
            </div>
          )}

          {/* OTP Field */}
          <FormField
            control={otpForm.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP maxLength={6} {...field} dir="ltr">
                    <InputOTPGroup className="w-full gap-3" dir="ltr">
                      <InputOTPSlot
                        index={0}
                        className="flex-1 aspect-square text-xl font-black border-red-600 shadow-md"
                      />
                      <InputOTPSlot
                        index={1}
                        className="flex-1 aspect-square text-xl font-black border-red-600 shadow-md"
                      />
                      <InputOTPSlot
                        index={2}
                        className="flex-1 aspect-square text-xl font-black border-red-600 shadow-md"
                      />
                      <InputOTPSlot
                        index={3}
                        className="flex-1 aspect-square text-xl font-black border-red-600 shadow-md"
                      />
                      <InputOTPSlot
                        index={4}
                        className="flex-1 aspect-square text-xl font-black border-red-600 shadow-md"
                      />
                      <InputOTPSlot
                        index={5}
                        className="flex-1 aspect-square text-xl font-black border-red-600 shadow-md"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage className="text-xs text-center" />
              </FormItem>
            )}
          />

          {/* Submit Button and Sign In Link */}
          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full font-koulen"
              size="lg"
              disabled={otpForm.formState.isSubmitting}
            >
              {otpForm.formState.isSubmitting ? t("verifyEmail.verifying") : t("verifyEmail.continue")}
            </Button>

            {/* Sign In Link */}
            {/* <div className="text-sm">
                <span className="text-muted-foreground">
                  Didn't receive the code?
                </span>{" "}
                <button className="font-bold text-primary cursor-pointer">
                  Resend
                </button>
              </div> */}
          </div>
        </form>
      </Form>
    </>
  );
}

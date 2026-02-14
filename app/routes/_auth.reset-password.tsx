import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "~/components/ui/form";
import { Eye, EyeOff } from "lucide-react";
import { href, Link, redirect, useNavigate, useSearchParams, } from "react-router";
import { postApiAuthResetPassword } from "~/lib/client";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "./+types/_auth.reset-password";
import { resetPasswordMutationOptions } from "~/lib/queries";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return redirect(href("/forgot-password"));
  }
  return { token };
};
const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}|\\/\-+_.:;=,~`])[^\s<>]{8,}$/,
        {
          message: "Password must contain letters, numbers, and symbols",
        }
      ),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function ResetPassword({ loaderData }: Route.ComponentProps) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const resetPasswordMutation = useMutation(
    resetPasswordMutationOptions(loaderData.token)
  );

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  return (
    <>
      <title>Reset Password - MotoGT</title>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-black">RESET PASSWORD</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Please enter a new password.
        </p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            resetPasswordMutation.mutate(values, {
              onSuccess: () => {
                navigate(href("/login") + "?reset-password=true");
              },
            })
          )}
          className="space-y-4"
        >
          {/* General Error */}
          {resetPasswordMutation.error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {resetPasswordMutation.error.message}
            </div>
          )}

          {/* New Password Field */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      className="pr-12"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
                <p className="text-xs text-muted-foreground">
                  It must be a combination of minimum 8 letters, numbers, and
                  symbols.
                </p>
              </FormItem>
            )}
          />

          {/* Confirm Password Field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">
                  Confirm New Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      className="pr-12"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full font-koulen"
              size="lg"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? "RESETTING PASSWORD..."
                : "RESET PASSWORD"}
            </Button>

            {/* Sign In Link */}
            <p className="text-sm">
              <span className="text-muted-foreground">
                Remember your password?
              </span>{" "}
              <Link
                className="font-bold text-primary hover:underline"
                to="/login"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </>
  );
}

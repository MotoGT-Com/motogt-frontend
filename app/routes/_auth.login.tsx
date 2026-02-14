import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "~/components/ui/form";
import { Eye, EyeOff } from "lucide-react";
import { Link, redirect, useSearchParams, useSubmit } from "react-router";
import type { Route } from "./+types/_auth.login";
import { postApiAuthLogin, postApiStoresByStoreIdCartInit } from "~/lib/client";
import { commitAuth } from "~/lib/auth-middleware";
import { getCartManager } from "~/lib/cart-manager";
import { getFavoritesManager } from "~/lib/favorites-manager";
import { defaultParams } from "~/lib/api-client";
import { useTranslation } from "react-i18next";

const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }).min(1, {
    message: "Please enter your email address",
  }),
  password: z.string().min(1, { message: "Please enter your password" }),
});

// Action function to handle login form submission
export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const cart = JSON.parse(formData.get("cart") as string);
  const favorites = JSON.parse(formData.get("favorites") as string);

  try {
    const loginResponse = await postApiAuthLogin({
      body: { email, password },
    });

    if (loginResponse.error) {
      return {
        error: loginResponse.error.error.message,
        email,
      };
    }
    if (loginResponse.data.data.auth.requiresEmailVerification) {
      return redirect("/verify-email?email=" + email);
    }
    if (cart.length > 0) {
      await postApiStoresByStoreIdCartInit({
        path: { storeId: defaultParams.storeId },
        body: {
          items: cart,
        },
        headers: {
          Authorization: `Bearer ${loginResponse.data.data.auth.accessToken}`,
        },
      });
    }

    // TODO: Uncomment this when backend implements favorites sync endpoint
    // Similar to cart sync, this will sync client-side favorites to server after login
    /*
    if (favorites.length > 0) {
      await postApiStoresByStoreIdFavoritesInit({
        path: { storeId: defaultParams.storeId },
        body: {
          items: favorites.map(f => ({ productId: f.productId })),
        },
        headers: {
          Authorization: `Bearer ${loginResponse.data.data.auth.accessToken}`,
        },
      });
    }
    */
    // Get return URL from query params
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("returnTo") || "/";

    // Create redirect response with auth headers
    const response = redirect(returnTo);
    return await commitAuth({
      response,
      context,
      refreshToken: loginResponse.data.data.auth.refreshToken!,
      accessToken: loginResponse.data.data.auth.accessToken!,
      user: loginResponse.data.data.user,
    });
  } catch (error) {
    return {
      error: "Login failed. Please try again.",
      email,
    };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    // Create form data for submission to action
    const cartManager = getCartManager(false);
    const cart = await cartManager.getCartItems();

    const favoritesManager = getFavoritesManager(false);
    const favorites = await favoritesManager.getFavorites();

    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    formData.append("cart", JSON.stringify(cart));
    formData.append("favorites", JSON.stringify(favorites));
    await submit(formData, {
      method: "POST",
    });
  };

  const handleGoogleSignIn = () => {
    // Implement Google OAuth here
  };
  return (
    <>
      <title>{t('login.pageTitle')}</title>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-black">{t('login.title')}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('login.description')}
        </p>
      </div>

      {searchParams.get("otpVerified") === "true" && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
          {t('login.accountVerified')}
        </div>
      )}
      {searchParams.get("reset-password") === "true" && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
          {t('login.passwordResetSuccess')}
        </div>
      )}

      {/* Google Sign In Button */}
      {/* <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        className="w-full h-12 bg-gray-50 border-gray-200 hover:bg-gray-100"
      >
        <svg viewBox="0 0 48 48" className="size-5">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          ></path>
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          ></path>
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          ></path>
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          ></path>
          <path fill="none" d="M0 0h48v48H0z"></path>
        </svg>
        <span className="font-bold text-black">Sign-in with google</span>
      </Button> */}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('login.emailAddress')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('login.password')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t('login.passwordPlaceholder')}
                      className="pr-12"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
                {actionData?.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {actionData.error}
                  </div>
                )}

                {/* Forgot Password Link */}
                <div>
                  <Link
                    className="text-sm text-muted-foreground underline hover:text-primary"
                    to="/forgot-password"
                  >
                    {t('login.forgotPassword')}
                  </Link>
                </div>
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full font-koulen"
              size="lg"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {form.formState.isSubmitting ? t('login.signingIn') : t('login.loginButton')}
            </Button>

            {/* Create Account Link */}
            <p className="text-sm">
              <span className="text-muted-foreground">{t('login.noAccount')}</span>{" "}
              <Link
                className="font-bold text-primary hover:underline"
                to="/register"
              >
                {t('login.createAccount')}
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </>
  );
}

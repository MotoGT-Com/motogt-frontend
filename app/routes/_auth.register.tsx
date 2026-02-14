import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "~/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "~/components/ui/form";
import { Eye, EyeOff, Loader2, ChevronLeft } from "lucide-react";
import { href, Link, Navigate, useActionData, useSubmit } from "react-router";
import { CountrySelect, PhoneInput } from "~/components/phone-number-input";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import type { Route } from "./+types/_auth.register";
import { postApiAuthOtpVerify, postApiAuthRegister } from "~/lib/client";
import { InputOTP, InputOTPGroup, InputOTPSlot, } from "~/components/ui/input-otp";
import { useTranslation } from "react-i18next";

// Action function to handle register form submission
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const step = formData.get("step") as "register" | "otp";

  try {
    if (step === "register") {
      const registerResponse = await postApiAuthRegister({
        body: {
          email: formData.get("email") as string,
          password: formData.get("password") as string,
          firstName: formData.get("firstName") as string,
          lastName: formData.get("lastName") as string,
          phoneNumber: formData.get("phoneNumber") as string,
          dateOfBirth: formData.get("dateOfBirth") as string,
          gender: formData.get("gender") as "male" | "female",
        },
      });

      if (registerResponse.error) {
        return {
          error: registerResponse.error.error.message,
        };
      }

      // Create redirect response with auth headers
      return {
        from: "register",
        success: true,
        email: formData.get("email") as string,
      };
    }
    if (step === "otp") {
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
      return {
        from: "otp",
        success: true,
        email: formData.get("email") as string,
      };
    }
  } catch (error) {
    return {
      error: "Registration failed. Please try again.",
    };
  }
}

export default function Register({ actionData }: Route.ComponentProps) {
  const { t } = useTranslation('auth');
  return (
    <>
      <title>{t('register.pageTitle')}</title>
      {!actionData ? (
        <RegisterForm />
      ) : actionData.from === "register" && actionData.success ? (
        <OtpForm />
      ) : (
        <Navigate to={href("/login") + "?otpVerified=true"} />
      )}
    </>
  );
}

const ALLOWED_COUNTRIES: RPNInput.Country[] = ["JO", "AE", "SA", "QA"];

const cities = {
  AE: [
    "Dubai",
    "Abu Dhabi",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
    "Umm Al Quwain",
    "Al Ain",
    "Dibba Al Fujairah",
    "Dibba Al Hisn",
    "Kalba",
    "Khor Fakkan",
    "Madinat Zayed",
    "Ruwais",
    "Ghayathi",
    "Liwa",
    "Hatta",
    "Dhaid",
  ],

  SA: ["Riyadh", "Jeddah", "Dammam", "Khobar"],

  JO: [
    "Amman",
    "Zarqa",
    "Irbid",
    "Salt",
    "Madaba",
    "Jerash",
    "Ajloun",
    "Ruseifa",
    "Fuheis",
    "Mahis",
  ],

  QA: [
    "Doha",
    "Al Wakrah",
    "Al Khor",
    "Al Rayyan",
    "Umm Salal",
    "Al Daayen",
    "Al Shamal",
    "Al Shahaniya",
    "Mesaieed",
    "Lusail",
    "Dukhan",
    "Ras Laffan",
    "Al Gharrafa",
    "Al Thumama",
    "Al Wukair",
    "Abu Hamour",
    "Al Mamoura",
    "Madinat Khalifa",
    "Al Hilal",
    "Ain Khaled",
  ],
};

const registerSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: "First name must be at least 2 characters" }),
  lastName: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters" }),
  gender: z.enum(["male", "female"], {
    message: "Please select your gender",
  }),
  dateOfBirth: z.iso
    .date()
    .min(1, { message: "Please enter your date of birth" }),
  email: z.email({ message: "Please enter a valid email address" }).min(1, {
    message: "Email address is required",
  }),
  phoneNumber: z
    .string()
    .min(10, { message: "Please enter a valid phone number" }),
  country: z.string().min(1, { message: "Please select your country" }),
  city: z.string().min(1, { message: "Please select your city" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message: "Password must contain letters, numbers, and symbols",
    }),
  agreeToTerms: z.boolean().refine((value) => value === true, {
    message: "You must agree to the Terms and Conditions",
  }),
});

function RegisterForm() {
  const { t } = useTranslation('auth');
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "male",
      dateOfBirth: "",
      email: "",
      phoneNumber: "",
      country: "JO",
      city: "",
      password: "",
      agreeToTerms: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    const formData = new FormData();
    formData.append("step", "register");
    formData.append("email", values.email);
    formData.append("password", values.password);
    formData.append("firstName", values.firstName);
    formData.append("lastName", values.lastName);
    formData.append("gender", values.gender);
    formData.append("dateOfBirth", values.dateOfBirth);
    formData.append("phoneNumber", values.phoneNumber);
    formData.append("country", values.country);
    formData.append("city", values.city);
    formData.append("agreeToTerms", values.agreeToTerms.toString());
    await submit(formData, {
      method: "POST",
    });
  };

  const handleGoogleSignUp = () => {
    // Implement Google OAuth here
  };
  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">{t('register.title')}</h1>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {t('register.description')}
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* General Error */}
          {actionData?.error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {actionData?.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold italic">{t('register.firstName')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t('register.firstNamePlaceholder')}
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
                  <FormLabel className="font-bold italic">{t('register.lastName')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t('register.lastNamePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          {/* Gender and Age Fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold italic">{t('register.gender')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('register.genderPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t('register.male')}</SelectItem>
                      <SelectItem value="female">{t('register.female')}</SelectItem>
                      <SelectItem value="other">{t('register.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold italic">
                    {t('register.dateOfBirth')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      placeholder={t('register.dateOfBirthPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold italic">
                  {t('register.emailAddress')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t('register.emailPlaceholder')}
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
                <FormLabel>{t('register.phoneNumber')}</FormLabel>
                <FormControl>
                  <RPNInput.default
                    className="flex"
                    countrySelectComponent={CountrySelect}
                    inputComponent={PhoneInput}
                    placeholder={t('register.phonePlaceholder')}
                    defaultCountry="JO"
                    countries={ALLOWED_COUNTRIES}
                    countryCallingCodeEditable={false}
                    {...field}
                    onCountryChange={(country) => {
                      country && form.setValue("country", country);
                    }}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Country and City Fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="font-bold italic">{t('register.country')}</FormLabel>
                  <FormControl>
                    <Select {...field} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('register.countryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px] max-w-[250px]">
                        {Object.entries(flags)
                          .filter(([country]) =>
                            ALLOWED_COUNTRIES.includes(
                              country as RPNInput.Country
                            )
                          )
                          .map(([country, Flag]) => {
                            const regionNames = new Intl.DisplayNames(["en"], {
                              type: "region",
                            });
                            return (
                              <SelectItem key={country} value={country}>
                                {Flag && <Flag title={country} />}{" "}
                                <span>{regionNames.of(country)}</span>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold italic">{t('register.city')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('register.cityPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cities[form.watch("country") as keyof typeof cities].map(
                        (city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">{t('register.newPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t('register.passwordPlaceholder')}
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
                <p className="text-xs text-muted-foreground">
                  {t('register.passwordRequirements')}
                </p>
              </FormItem>
            )}
          />

          {/* Terms and Conditions Checkbox */}
          <FormField
            control={form.control}
            name="agreeToTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="size-5"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-medium text-muted-foreground not-italic">
                    <div>
                      {t('register.agreeToTerms')}{" "}
                      <Link
                        target="_blank"
                        to="/terms"
                        className="text-primary hover:underline"
                      >
                        {t('register.termsAndConditions')}
                      </Link>{" "}
                      {t('register.and')}{" "}
                      <Link
                        target="_blank"
                        to="/privacy"
                        className="text-primary hover:underline"
                      >
                        {t('register.privacyPolicy')}
                      </Link>
                      .
                    </div>
                  </FormLabel>
                  <FormMessage className="text-xs" />
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
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('register.signingUp')}
                </>
              ) : (
                t('register.registerButton')
              )}
            </Button>

            {/* Sign In Link */}
            <p className="text-sm">
              <span className="text-muted-foreground">
                {t('register.haveAccount')}
              </span>{" "}
              <Link
                className="font-bold text-primary hover:underline"
                to="/login"
              >
                {t('register.signIn')}
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </>
  );
}

const otpSchema = z.object({
  otp: z
    .string()
    .min(6, { message: "Please enter the 6-digit verification code" }),
});
function OtpForm() {
  const { t } = useTranslation('auth');
  const actionData = useActionData<typeof action>();
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
    formData.append("email", actionData?.email as string);
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
          <h1 className="text-2xl font-extrabold">{t('verifyEmail.title')}</h1>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {t('verifyEmail.enterCode')}{" "}
          <span className="font-bold">{actionData?.email}</span>
        </div>
        <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
          {t('verifyEmail.checkSpam')}
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
              {actionData?.error}
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
              {otpForm.formState.isSubmitting ? t('verifyEmail.verifying') : t('verifyEmail.continue')}
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

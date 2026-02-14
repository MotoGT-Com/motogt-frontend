import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "~/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "~/components/ui/form";
import { CountrySelect, PhoneInput } from "~/components/phone-number-input";
import * as RPNInput from "react-phone-number-input";
import type { Route } from "./+types/_main.profile.account";
import { authContext } from "~/context";
import { useMutation } from "@tanstack/react-query";
import { updateUserMutationOptions } from "~/lib/queries";
import { Label } from "~/components/ui/label";
import { ALLOWED_COUNTRIES, DEFAULT_COUNTRY } from "~/lib/constants";
import { useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";

const accountSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: "First name must be at least 1 character" }),
  lastName: z
    .string()
    .min(1, { message: "Last name must be at least 1 character" }),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z.iso
    .date()
    .min(1, { message: "Please enter your date of birth" }),
  phoneNumber: z
    .string({
      error: "Please enter a valid phone number",
    })
    .min(10, { message: "Please enter a valid phone number" }),
});

// Loader function to get user from context (auth already checked by parent middleware)
export async function loader({ context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  return { user: auth.user! };
}

export default function ProfileAccount({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation('profile');
  const { user } = loaderData;
  const revalidator = useRevalidator();
  const updateUser = useMutation({
    ...updateUserMutationOptions,
    onSuccess: async () => {
      await revalidator.revalidate();
    },
  });

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    values: {
      firstName: user.firstName,
      lastName: user.lastName,
      gender: (user.gender as "male" | "female") || "",
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split("T")[0] : "", // Not available in UserProfile type
      phoneNumber: user.phone || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    updateUser.mutate(values);
  };

  const handleDiscard = () => {
    form.reset();
  };

  return (
    <>
      <title>{t('account.pageTitle')}</title>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-black italic text-black tracking-[-0.198px]">
          {t('account.title')}
        </h1>
      </div>

      {/* Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex-1 space-y-6 flex flex-col"
        >
          {/* General Error */}
          {updateUser.error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {updateUser.error.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.firstName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('account.firstNamePlaceholder')}
                      type="text"
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
                  <FormLabel>{t('account.lastName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('account.lastNamePlaceholder')}
                      type="text"
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
                  <FormLabel>{t('account.gender')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('account.genderPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t('account.male')}</SelectItem>
                      <SelectItem value="female">{t('account.female')}</SelectItem>
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
                  <FormLabel>{t('account.dateOfBirth')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('account.dateOfBirthPlaceholder')}
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('account.emailAddress')}</Label>
            <Input
              type="email"
              value={user.email}
              readOnly
              className="read-only:opacity-60 read-only:cursor-not-allowed"
            />
          </div>

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('account.phoneNumber')}</FormLabel>
                <FormControl>
                  <RPNInput.default
                    className="flex"
                    countrySelectComponent={CountrySelect}
                    inputComponent={PhoneInput}
                    placeholder={t('account.phonePlaceholder')}
                    defaultCountry={DEFAULT_COUNTRY}
                    countries={ALLOWED_COUNTRIES}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          {form.formState.isDirty && (
            <div className="flex flex-col-reverse md:flex-row justify-end gap-2 pt-6 mt-auto">
              <Button
                type="button"
                variant="outline"
                className="font-koulen min-w-[150px]"
                onClick={handleDiscard}
                disabled={updateUser.isPending}
              >
                {t('account.discard')}
              </Button>
              <Button
                type="submit"
                className="font-koulen min-w-[150px]"
                disabled={updateUser.isPending}
              >
                {updateUser.isPending ? t('account.saving') : t('account.saveChanges')}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </>
  );
}

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { redirect, useNavigate, useSubmit } from "react-router";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "~/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { addressByIdQueryOptions, updateAddressMutationOptions, } from "~/lib/queries";
import type { Route } from "./+types/_main.profile.address.edit.$id";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

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

const addressSchema = z.object({
  title: z.string().min(1, { message: "Address title is required" }),
  country: z.string().min(1, { message: "Country is required" }),
  city: z.string().min(1, { message: "City is required" }),
  addressLine1: z.string().min(1, { message: "Address line 1 is required" }),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
  makeDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddNewAddress({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const addressesQuery = useQuery(addressByIdQueryOptions(params.id));
  const updateAddressMutation = useMutation(
    updateAddressMutationOptions(params.id)
  );
  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    values: {
      addressLine1: addressesQuery.data?.addressLine1 || "",
      addressLine2: addressesQuery.data?.addressLine2 || "",
      city: addressesQuery.data?.city || "",
      country: addressesQuery.data?.country || "",
      postalCode: addressesQuery.data?.postalCode || "",
      title: addressesQuery.data?.title || "",
      makeDefault: addressesQuery.data?.isDefault || false,
    },
  });
  return (
    <>
      <title>Edit Address - MotoGT</title>
      <div className="flex flex-col gap-6">
        {/* Header with Navigation */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/profile/address")}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm">
            Address Information
            <ChevronRight className="size-5 text-primary" />
            <span className="font-black italic text-black text-lg">
              {addressesQuery.data?.title}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) =>
              updateAddressMutation.mutate(data, {
                onSuccess: () => {
                  navigate("/profile/address");
                },
              })
            )}
            className="space-y-6"
          >
            {/* Address Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Address Title"
                      className="h-12 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country and City */}
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-bold italic">Country</FormLabel>
                    <FormControl>
                      <Select {...field} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select Country" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => {
                  const selectedCountry = form.watch("country") as keyof typeof cities;
                  const availableCities = selectedCountry ? cities[selectedCountry] || [] : [];
                  
                  return (
                    <FormItem>
                      <FormLabel className="font-bold italic">City</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedCountry}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select City" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Address Line 1 */}
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Address Line"
                      className="h-12 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Line 2 */}
            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Address Line (Optional)"
                      className="h-12 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Postal Code */}
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Postal Code (Optional)"
                      className="h-12 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateAddressMutation.isPending}
                className="font-koulen"
              >
                {updateAddressMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Adding Address...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}

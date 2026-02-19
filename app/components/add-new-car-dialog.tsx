import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { href, useRouteLoaderData } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "~/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "~/components/ui/select";
import { Loader2 } from "lucide-react";
import { getApiCars } from "~/lib/client";
import { carBrandsQueryOptions, addCarMutationOptions } from "~/lib/queries";
import { useTranslation } from "react-i18next";
import { useAuthModal } from "~/context/AuthModalContext";
import type { Route } from "../routes/+types/_main";

const carFormSchema = z.object({
  make: z.string().min(1, { message: "Car make is required" }),
  model: z.string().min(1, { message: "Car model is required" }),
  year: z
    .number()
    .min(1990, { message: "Year must be 1990 or later" })
    .max(2025, { message: "Year cannot be in the future" }),
});

type AddCarFormData = z.infer<typeof carFormSchema>;

type PrefilledCar = {
  make: string;
  model: string;
};

export function AddNewCarDialog({ 
  onSuccess, 
  onOpen,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  prefilledCar,
  lockPrefilledFields = false,
}: { 
  onSuccess?: () => void; 
  onOpen?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefilledCar?: PrefilledCar;
  lockPrefilledFields?: boolean;
} = {}) {
  const { t } = useTranslation('garage');
  const mainLoaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!mainLoaderData?.isAuthenticated;
  const { openAuthModal } = useAuthModal();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const form = useForm<AddCarFormData>({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
    },
  });

  const brandsQuery = useQuery(carBrandsQueryOptions);

  const modelsQuery = useQuery({
    queryKey: ["models", form.watch("make")],
    queryFn: async () => {
      const response = await getApiCars({
        query: {
          brand: form.watch("make"),
        },
      });

      if (response.error) {
        throw new Error("Failed to load cars");
      }

      return response.data.data;
    },
    enabled: !!form.watch("make"), // Only fetch when dialog is open
  });

  const addCarMutation = useMutation(addCarMutationOptions);

  useEffect(() => {
    if (!open || !prefilledCar) return;

    form.setValue("make", prefilledCar.make, { shouldValidate: true });
    form.setValue("model", prefilledCar.model, { shouldValidate: true });
  }, [form, open, prefilledCar]);

  const handleSubmit = (data: AddCarFormData) => {
    const selectedCar = modelsQuery.data!.find(
      (car) => car.model === data.model
    )!;
    addCarMutation.mutate(
      {
        ...data,
        carId: selectedCar.id,
      },
      {
        onSuccess: () => {
          form.reset();
          setOpen(false);
          onSuccess?.();
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      openAuthModal("register", {
        intent: { type: "garage", returnTo: href("/my-garage") },
      });
      return;
    }

    setOpen(newOpen);
    if (newOpen) {
      onOpen?.();
    }
    if (!newOpen) {
      form.reset();
    }
  };

  const dialogContent = (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-black italic font-sans">
          {t('addCarDialog.title')}
        </DialogTitle>
        <DialogDescription>
          {t('addCarDialog.description')}
        </DialogDescription>
      </DialogHeader>

      {brandsQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">{t('addCarDialog.loadingCars')}</span>
        </div>
      ) : brandsQuery.error ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{t('addCarDialog.failedToLoad')}</p>
          <Button onClick={() => brandsQuery.refetch()}>{t('addCarDialog.tryAgain')}</Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Car Make */}
            <FormField
              control={form.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">
                    {t('addCarDialog.carMake')}
                  </FormLabel>
                  <FormControl>
                    {lockPrefilledFields && prefilledCar ? (
                      <Input
                        className="h-12 text-sm"
                        value={field.value}
                        readOnly
                        disabled
                      />
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset model when make changes
                          form.setValue("model", "");
                        }}
                      >
                        <SelectTrigger className="h-12 text-sm">
                          <SelectValue placeholder={t('addCarDialog.carMakePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {brandsQuery.data?.map((make) => (
                            <SelectItem key={make} value={make}>
                              {make}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Car Model */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">
                    {t('addCarDialog.carModel')}
                  </FormLabel>
                  <FormControl>
                    {lockPrefilledFields && prefilledCar ? (
                      <Input
                        className="h-12 text-sm"
                        value={field.value}
                        readOnly
                        disabled
                      />
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!form.watch("make")}
                      >
                        <SelectTrigger className="h-12 text-sm">
                          <SelectValue placeholder={t('addCarDialog.carModelPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            new Set(
                              modelsQuery.data?.map((model) => model.model)
                            )
                          ).map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Production Year */}
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">
                    {t('addCarDialog.productionYear')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('addCarDialog.productionYearPlaceholder')}
                      className="h-12 text-sm"
                      type="number"
                      min="1990"
                      max="2025"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                className="w-full font-koulen"
                disabled={addCarMutation.isPending}
              >
                {addCarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('addCarDialog.addingCar')}
                  </>
                ) : (
                  t('addCarDialog.addCar')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      )}
    </>
  );
  
  return (
    <>
      {/* Only show trigger button if not controlled */}
      {controlledOpen === undefined && (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-[#cf172f] h-9 md:h-[37px] px-3 md:px-[16px] py-2 md:py-[8px] rounded-[2px] w-auto min-w-[120px] md:w-[197px] font-koulen text-sm md:text-[16px] text-white leading-[1.5] not-italic tracking-[-0.176px] hover:bg-[#cf172f]/90 shrink-0 whitespace-nowrap">
              {t('addCarDialog.addNewCar')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            {dialogContent}
          </DialogContent>
        </Dialog>
      )}
      
      {/* Controlled dialog (no trigger button) */}
      {controlledOpen !== undefined && (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-md">
            {dialogContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

import { Loader2 } from "lucide-react";
import { Link } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SimpleCard } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  carTrimsQueryOptions,
  removeFromGarageMutationOptions,
} from "~/lib/queries";
import { serializeShopURL } from "~/lib/shop-search-params";
import { cn } from "~/lib/utils";

type AvailableCar = {
  id: string;
  brand: string;
  model: string;
  trim?: string | null;
  year_from?: number | null;
  year_to?: number | null;
  car_image: string | null;
  product_count: number | string;
};

function CarTrimChips({
  brand,
  model,
  carId,
}: {
  brand: string;
  model: string;
  carId: string;
}) {
  const { t } = useTranslation("common");
  const trimsQuery = useQuery({
    ...carTrimsQueryOptions({ brand, model }),
    staleTime: 5 * 60_000,
  });

  if (trimsQuery.isPending) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        <span>{t("availableCarsPage.loadingTrims")}</span>
      </div>
    );
  }

  const trims = trimsQuery.data ?? [];
  if (trims.length === 0) {
    return null;
  }

  const visible = trims.slice(0, 6);
  const remaining = trims.length - visible.length;

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        {t("availableCarsPage.trims")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((trim) => (
          <Link
            key={trim}
            to={serializeShopURL({
              carId,
              carBrand: brand,
              carModel: model,
              carTrim: trim,
            })}
            className="inline-flex max-w-full items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-primary/40 hover:bg-white hover:text-primary"
            title={t("availableCarsPage.viewTrimProducts", { trim })}
          >
            <span className="truncate">{trim}</span>
          </Link>
        ))}
        {remaining > 0 ? (
          <Link
            to={serializeShopURL({
              carId,
              carBrand: brand,
              carModel: model,
            })}
            className="inline-flex items-center rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:border-primary/40 hover:text-primary"
          >
            {t("availableCarsPage.moreTrims", { count: remaining })}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function AvailableCarCard({
  car,
  userCarId,
  onAddToGarage,
}: {
  car: AvailableCar;
  userCarId?: string;
  onAddToGarage: () => void;
}) {
  const { t } = useTranslation("common");
  const removeFromGarageMutation = useMutation(removeFromGarageMutationOptions);
  const productCount = Number(car.product_count) || 0;
  const yearLabel =
    car.year_from != null
      ? car.year_to != null && car.year_to !== car.year_from
        ? `${car.year_from}–${car.year_to}`
        : String(car.year_from)
      : null;

  const shopHref = serializeShopURL({
    carId: car.id,
    carBrand: car.brand,
    carModel: car.model,
    ...(car.year_from != null ? { carYear: car.year_from } : {}),
  });

  return (
    <SimpleCard className="group flex h-full flex-col overflow-hidden border-neutral-200/90 bg-white p-0 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <Link to={shopHref} className="relative block overflow-hidden bg-[#f4f4f5]">
        <div className="aspect-[16/10] w-full px-4 pt-4 sm:aspect-[5/3]">
          <img
            src={car.car_image || "/car-placeholder.png"}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-contain object-center transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
        <div className="absolute start-3 top-3">
          <span className="inline-flex rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-700 shadow-sm ring-1 ring-black/5">
            {car.brand}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold leading-tight tracking-tight text-neutral-900">
            {car.model}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-neutral-500">
            <span>
              {t("availableCarsPage.productCount", { count: productCount })}
            </span>
            {yearLabel ? (
              <>
                <span className="text-neutral-300" aria-hidden>
                  ·
                </span>
                <span>{yearLabel}</span>
              </>
            ) : null}
            {car.trim ? (
              <>
                <span className="text-neutral-300" aria-hidden>
                  ·
                </span>
                <span className="font-medium text-neutral-700">{car.trim}</span>
              </>
            ) : null}
          </div>
        </div>

        <CarTrimChips brand={car.brand} model={car.model} carId={car.id} />

        <div className="mt-auto grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
          <Button
            size="lg"
            className="h-11 w-full rounded-lg font-koulen text-base tracking-wide"
            asChild
          >
            <Link to={shopHref}>{t("availableCarsPage.viewProducts")}</Link>
          </Button>

          {userCarId ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="inverted"
                  size="lg"
                  className="h-11 w-full rounded-lg border-[#F8C9CF] bg-[#FDECEE] font-koulen text-base tracking-wide text-primary hover:bg-[#FADDE1]"
                  disabled={removeFromGarageMutation.isPending}
                >
                  {t("availableCarsPage.removeFromGarage")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("availableCarsPage.removeFromGarage")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("availableCarsPage.removeFromGarageConfirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={removeFromGarageMutation.isPending}>
                    <Button
                      variant="outline"
                      disabled={removeFromGarageMutation.isPending}
                    >
                      {t("buttons.cancel")}
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      onClick={async () => {
                        await removeFromGarageMutation.mutateAsync(userCarId);
                      }}
                      disabled={removeFromGarageMutation.isPending}
                    >
                      {removeFromGarageMutation.isPending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        t("availableCarsPage.removeFromGarage")
                      )}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              variant="inverted"
              size="lg"
              className={cn(
                "h-11 w-full rounded-lg bg-[#F2F2F2] font-koulen text-base tracking-wide text-primary hover:bg-[#E8E8E8]"
              )}
              onClick={onAddToGarage}
            >
              {t("availableCarsPage.addToGarage")}
            </Button>
          )}
        </div>
      </div>
    </SimpleCard>
  );
}

import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, HelpCircle } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { GarageCarousel } from "~/components/garage-carousel";
import { GarageFeaturedBanner } from "~/components/garage-featured-banner";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { ConfirmDialog } from "~/components/confirm-dialog";
import type { Route } from "./+types/_main.my-garage";
import { useRevalidator } from "react-router";
import { authContext } from "~/context";
import { garageCarsQueryOptions, removeFromGarageMutationOptions, } from "~/lib/queries";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "~/components/ui/alert-dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GuestBanner } from "~/components/guest-banner";
import { getGuestGarage, removeFromGuestGarage, type GuestCar } from "~/lib/guest-garage-manager";
import type { UserCarResponse } from "~/lib/client/types.gen";

export async function loader({ context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  return { isAuthenticated: auth.isAuthenticated };
}

export default function MyGarage({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("garage");
  const isRtl = i18n.dir(i18n.language) === "rtl";
  const revalidate = useRevalidator();
  const { isAuthenticated } = loaderData;

  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });
  const removeFromGarageMutation = useMutation(removeFromGarageMutationOptions);

  const [guestCars, setGuestCars] = useState<GuestCar[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setGuestCars(getGuestGarage());
    }
  }, [isAuthenticated]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    containScroll: false,
    direction: isRtl ? "rtl" : "ltr",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  // Derive the active car list based on auth state
  const userCars: UserCarResponse["data"][] = isAuthenticated
    ? (garageCarsQuery.data?.userCars ?? [])
    : (guestCars as unknown as UserCarResponse["data"][]);

  // Show error state for authenticated users
  if (isAuthenticated && garageCarsQuery.error) {
    return (
      <>
        <title>{t("pageTitle")}</title>
        <div className="py-5 flex-1 flex flex-col bg-red-200">
          {/* Header */}
          <div className="max-w-7xl mx-auto px-6 mb-12 flex items-center justify-between">
            <h1 className="text-[18px] font-black italic leading-[150%] tracking-[-0.198px] text-[#000]">
              {t("title")}
            </h1>
            <AddNewCarDialog />
          </div>

          {/* Error State */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("error.title")}
                </h2>
                <p className="text-gray-600 mb-8">
                  {t("error.message")}
                </p>
              </div>

              <Button onClick={() => window.location.reload()} className="mb-4">
                {t("error.refreshPage")}
              </Button>

              <div className="text-sm text-gray-500">
                <p>{t("error.details", { message: garageCarsQuery.error.message })}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isAuthenticated && garageCarsQuery.isPending) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <Loader2 className="size-12 text-primary animate-spin" />
      </div>
    );
  }

  // Show empty state
  if (userCars.length === 0) {
    return (
      <>
        <title>{t("pageTitle")}</title>
        {!isAuthenticated && <GuestBanner type="garage" />}
        {/* Header */}
        <div className="max-w-7xl mx-auto px-6 my-8">
          <h1 className="text-[18px] font-black italic leading-[150%] tracking-[-0.198px] text-[#000]">
            {t("title")}
          </h1>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="flex flex-col items-center justify-center">
            <img
            loading="lazy"
              src="/car-placeholder.png"
              className="w-auto h-[100px] mb-10"
              alt={t("empty.imageAlt")}
            />
            <div className="text-muted-foreground space-y-2 mb-6">
              <div className="font-bold">
                {t("empty.noCarsTitle")}
              </div>
              <div>
                {t("empty.noCarsDescription")}
              </div>
            </div>
            <AddNewCarDialog onSuccess={() => setGuestCars(getGuestGarage())} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <title>{t("pageTitle")}</title>
      {!isAuthenticated && <GuestBanner type="garage" />}
      <div className="py-4 md:py-5 flex-1 flex flex-col bg-background">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-6 flex items-center justify-between gap-3 mb-4 md:mb-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <HoverCard openDelay={300}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="cursor-pointer text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.7)] transition-colors shrink-0"
                  aria-label={t("help.ariaLabel")}
                >
                  <HelpCircle className="size-4" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-[280px] z-[60] p-0" side="right" align="start">
                <div className="bg-[#F2F2F2] rounded-[2px] border border-[#E6E6E6] overflow-hidden" style={{ boxShadow: '0 4px 10px 0 rgba(0, 0, 0, 0.10)' }}>
                  <div className="px-4 pt-4 pb-3">
                    <h4 className="text-sm font-semibold text-black leading-[1.5] mb-2">
                      {t("help.title")}
                    </h4>
                    <p className="text-xs font-medium text-[rgba(0,0,0,0.7)] leading-[1.5]">
                      {t("help.description")}
                    </p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
            <h1 className="text-[16px] md:text-[18px] font-black italic leading-[150%] tracking-[-0.198px] text-[#000] truncate">
              {t("title")}{" "}
              {userCars.length > 0 && (
                <span className="text-[12px] md:text-[14px] font-normal not-italic leading-[150%] tracking-[-0.154px] text-[rgba(0,0,0,0.50)]">
                  ({t("carCount", { count: userCars.length })})
                </span>
              )}
            </h1>
          </div>
          <div className="shrink-0">
            <AddNewCarDialog onSuccess={() => {
              if (!isAuthenticated) setGuestCars(getGuestGarage());
            }} />
          </div>
        </div>

        <div
          className="w-full flex-1 flex items-center min-h-0 py-4 md:py-0"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <GarageCarousel
            ref={emblaRef}
            selectedIndex={selectedIndex}
            userCars={userCars}
          />
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 md:px-6 mt-4 md:mt-0">
          {userCars.length > 1 && (
            <div className="flex justify-between gap-3 md:gap-5 items-center max-w-md mx-auto mb-4">
              {/* Navigation Arrows */}
              <Button
                variant="outline"
                size="icon"
                onClick={scrollPrev}
                className="h-8 w-8 md:h-10 md:w-10 shrink-0"
              >
                {isRtl ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
              <div className="flex-1 flex justify-center gap-2 min-w-0">
                {userCars.map((_, index) => (
                  <button
                    key={index}
                    className={`max-w-14 flex-1 h-1 transition-colors ${
                      index === selectedIndex ? "bg-[#CF172F]" : "bg-[#E6E6E6]"
                    }`}
                    onClick={() => scrollTo(index)}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={scrollNext}
                className="h-8 w-8 md:h-10 md:w-10 shrink-0"
              >
                {isRtl ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 max-w-md mx-auto">
            {/* Remove Button */}
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="inverted"
                    size="lg"
                    disabled={removeFromGarageMutation.isPending}
                    className="font-koulen w-full h-12 md:text-lg bg-[#F2F2F2] hover:bg-[#F2F2F2]/80"
                  >
                    {!removeFromGarageMutation.isPending ? (
                      <>
                        <span>{t("remove.buttonShort")}</span>
                        <span className="hidden md:inline">{t("remove.buttonLong")}</span>
                      </>
                    ) : (
                      <Loader2 className="animate-spin" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("remove.dialogTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("remove.dialogDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={removeFromGarageMutation.isPending}
                    >
                      <Button
                        variant="outline"
                        disabled={removeFromGarageMutation.isPending}
                      >
                        {t("remove.cancel")}
                      </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        onClick={async () => {
                          if (!isAuthenticated) {
                            removeFromGuestGarage(userCars[selectedIndex].id);
                            const updated = getGuestGarage();
                            setGuestCars(updated);
                            if (selectedIndex >= updated.length) {
                              setSelectedIndex(Math.max(0, updated.length - 1));
                            }
                            return;
                          }
                          await removeFromGarageMutation.mutateAsync(
                            userCars[selectedIndex].id
                          );
                          revalidate.revalidate();
                        }}
                        disabled={removeFromGarageMutation.isPending}
                      >
                        {removeFromGarageMutation.isPending ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          t("remove.confirm")
                        )}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

      </div>

      {/* Featured Parts Banner — sibling to the garage section so it's always visible below */}
      <GarageFeaturedBanner
        currentCar={userCars[selectedIndex]}
      />
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { href, useRouteLoaderData } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { HelpCircle } from "lucide-react";
import { useAuthModal } from "~/context/AuthModalContext";
import type { Route } from "../routes/+types/_main";

/**
 * EmptyGarageDialog Component
 * 
 * Displays a modal dialog when user tries to access garage but has no cars.
 * Shows an empty state with illustration and call-to-action to add a car.
 * Matches the Figma design system.
 */
export function EmptyGarageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mainLoaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!mainLoaderData?.isAuthenticated;
  const { openAuthModal } = useAuthModal();
  const [addCarDialogOpen, setAddCarDialogOpen] = useState(false);
  const shouldOpenAddCarDialog = useRef(false);

  const handleAddCarSuccess = () => {
    setAddCarDialogOpen(false);
    onOpenChange(false);
  };

  const handleAddCarButtonClick = () => {
    // Mark that we should open the add car dialog
    shouldOpenAddCarDialog.current = true;
    // Close the empty garage dialog
    onOpenChange(false);
  };

  // Open the add car dialog when the empty garage dialog closes
  useEffect(() => {
    if (!open && shouldOpenAddCarDialog.current) {
      shouldOpenAddCarDialog.current = false;
      setAddCarDialogOpen(true);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.7)] transition-colors"
                    aria-label="Learn more about My Garage"
                  >
                    <HelpCircle className="size-4" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-[280px] z-[60] p-0" side="right" align="start">
                  <div className="bg-[#F2F2F2] rounded-[2px] border border-[#E6E6E6] overflow-hidden" style={{ boxShadow: '0 4px 10px 0 rgba(0, 0, 0, 0.10)' }}>
                    <div className="px-4 pt-4 pb-3">
                      <h4 className="text-sm font-semibold text-black leading-[1.5] mb-2">
                        My Garage
                      </h4>
                      <p className="text-xs font-medium text-[rgba(0,0,0,0.7)] leading-[1.5]">
                        Add your cars to your garage to instantly see which products fit your vehicles. This helps us personalize your shopping experience and show you compatible parts.
                      </p>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <DialogTitle className="text-xl font-black italic font-sans">
                My Garage
              </DialogTitle>
            </div>
            
          </DialogHeader>

          {/* Main Content */}
          <div className="flex flex-col gap-4 items-center">
            {/* Car Illustration with Gradient Overlays */}
            <div className="relative w-full flex items-center justify-center overflow-hidden h-[204px]">
              {/* Left Gradient Overlay */}
              <div className="absolute left-0 top-0 h-full w-[49px] bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              
              {/* Car Image Container */}
              <div className="flex items-center justify-center relative">
                <img
                  loading="lazy"
                  src="/garage/garage-empty.svg"
                  className="w-[800px] h-[102px] object-contain opacity-[0.68]"
                  alt="Empty Garage"
                />
              </div>

              {/* Right Gradient Overlay */}
              <div className="absolute right-0 top-0 h-full w-[49px] bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            </div>
            <DialogDescription>
              It looks like you haven't added any cars to your garage yet! Adding your car will help us make your shopping experience even better.
            </DialogDescription>

            {/* Add New Car Button */}
            <div className="h-[37px] w-full flex justify-center">
              <Button 
                onClick={handleAddCarButtonClick}
                className="bg-[#cf172f] h-[37px] px-[16px] py-[8px] rounded-[2px] w-[197px] font-koulen text-[16px] text-white leading-[1.5] not-italic tracking-[-0.176px] hover:bg-[#cf172f]/90"
              >
                Add New car
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add New Car Dialog - Controlled (rendered as sibling, not nested) */}
      <AddNewCarDialog 
        open={addCarDialogOpen}
        onOpenChange={setAddCarDialogOpen}
        onSuccess={handleAddCarSuccess}
      />
    </>
  );
}

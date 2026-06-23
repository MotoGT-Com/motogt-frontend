import { Slot } from "@radix-ui/react-slot";
import { useGaragePopup } from "~/context/GaragePopupContext";
import { cn } from "~/lib/utils";

type GaragePopupTriggerProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  onBeforeOpen?: () => void;
};

export function GaragePopupTrigger({
  asChild = false,
  className,
  onBeforeOpen,
  onClick,
  children,
  type,
  ...props
}: GaragePopupTriggerProps) {
  const { openGaragePopup } = useGaragePopup();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : type ?? "button"}
      className={cn(className)}
      onClick={(event) => {
        event.preventDefault();
        onBeforeOpen?.();
        openGaragePopup();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </Comp>
  );
}

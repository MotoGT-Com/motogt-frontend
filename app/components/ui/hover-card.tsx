import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "~/lib/utils"

/**
 * Radix HoverCard ignores touch pointers and preventDefault()s touchstart on the trigger,
 * so help popovers do not open on phones. When the primary UI is touch / no-hover, we render
 * Radix Popover instead (tap to open, dismiss on outside click) with the same styling.
 */
const HoverCardBranchContext = React.createContext<"hover" | "popover">("hover")

function useTouchPrimaryBranch() {
  return React.useContext(HoverCardBranchContext)
}

function HoverCard({
  openDelay,
  closeDelay,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  const [branch, setBranch] = React.useState<"hover" | "popover">("hover")

  React.useEffect(() => {
    const prefersPopoverBranch = () =>
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(pointer: coarse)").matches

    setBranch(prefersPopoverBranch() ? "popover" : "hover")

    const mqHover = window.matchMedia("(hover: none)")
    const mqPointer = window.matchMedia("(pointer: coarse)")
    const onChange = () => setBranch(prefersPopoverBranch() ? "popover" : "hover")
    mqHover.addEventListener("change", onChange)
    mqPointer.addEventListener("change", onChange)
    return () => {
      mqHover.removeEventListener("change", onChange)
      mqPointer.removeEventListener("change", onChange)
    }
  }, [])

  const root =
    branch === "popover" ? (
      <PopoverPrimitive.Root data-slot="hover-card" modal={false} {...props} />
    ) : (
      <HoverCardPrimitive.Root
        data-slot="hover-card"
        openDelay={openDelay}
        closeDelay={closeDelay}
        {...props}
      />
    )

  return (
    <HoverCardBranchContext.Provider value={branch}>{root}</HoverCardBranchContext.Provider>
  )
}

type HoverCardTriggerProps = React.ComponentProps<typeof HoverCardPrimitive.Trigger>

function HoverCardTrigger({ ...props }: HoverCardTriggerProps) {
  const branch = useTouchPrimaryBranch()
  if (branch === "popover") {
    return (
      <PopoverPrimitive.Trigger
        data-slot="hover-card-trigger"
        {...(props as React.ComponentProps<typeof PopoverPrimitive.Trigger>)}
      />
    )
  }
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
}

const hoverCardContentShared =
  "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 rounded-md border p-4 shadow-md outline-hidden"

type HoverCardContentProps = React.ComponentProps<typeof HoverCardPrimitive.Content> &
  Pick<React.ComponentProps<typeof PopoverPrimitive.Content>, "onOpenAutoFocus">

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  onOpenAutoFocus,
  ...props
}: HoverCardContentProps) {
  const branch = useTouchPrimaryBranch()

  if (branch === "popover") {
    return (
      <PopoverPrimitive.Portal data-slot="hover-card-portal">
        <PopoverPrimitive.Content
          data-slot="hover-card-content"
          align={align}
          sideOffset={sideOffset}
          className={cn(
            hoverCardContentShared,
            "origin-(--radix-popover-content-transform-origin)",
            className
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            onOpenAutoFocus?.(e)
          }}
          {...props}
        />
      </PopoverPrimitive.Portal>
    )
  }

  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          hoverCardContentShared,
          "origin-(--radix-hover-card-content-transform-origin)",
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }

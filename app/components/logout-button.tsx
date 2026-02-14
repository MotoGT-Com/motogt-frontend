import { useSubmit } from "react-router";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./confirm-dialog";
import { LogoutNavIcon } from "./nav-icons";
import { cn } from "~/lib/utils";
import type { ComponentProps } from "react";

interface LogoutButtonProps extends Omit<ComponentProps<typeof Button>, "type" | "onClick"> {
  /**
   * Custom className for the button
   */
  className?: string;
  /**
   * Icon size className (default: "size-5")
   */
  iconClassName?: string;
  /**
   * Whether to show the icon (default: true)
   */
  showIcon?: boolean;
  /**
   * Custom text for the logout button (default: "Logout")
   */
  children?: React.ReactNode;
  /**
   * Custom className for the dialog content
   */
  dialogClassName?: string;
}

/**
 * LogoutButton Component
 * 
 * A reusable logout button with confirmation dialog.
 * Handles logout action with a warning popup before proceeding.
 * 
 * Features:
 * - Confirmation dialog with warning message
 * - Primary red logout button with white text
 * - Customizable styling and icon
 * - Consistent behavior across web and mobile
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <LogoutButton />
 * 
 * // With custom styling
 * <LogoutButton className="w-full justify-start" size="lg">
 *   Logout
 * </LogoutButton>
 * 
 * // Without icon
 * <LogoutButton showIcon={false}>Sign Out</LogoutButton>
 * ```
 */
export function LogoutButton({
  className,
  iconClassName = "size-5",
  showIcon = true,
  children = "Logout",
  dialogClassName,
  ...buttonProps
}: LogoutButtonProps) {
  const submit = useSubmit();

  const handleLogout = () => {
    const formData = new FormData();
    submit(formData, { method: "post", action: "/logout" });
  };

  return (
    <ConfirmDialog
      title="Logout"
      description="Are you sure you want to logout? You will need to sign in again to access your account."
      confirmText="Logout"
      cancelText="Cancel"
      variant="destructive"
      onConfirm={handleLogout}
      contentClassName={cn(
        "rounded-[12px] bg-white shadow-[0_0_10px_0_rgba(0,0,0,0.50)]",
        dialogClassName
      )}
    >
      <Button
        type="button"
        variant="ghost"
        className={cn(className)}
        {...buttonProps}
      >
        {showIcon && (
          <LogoutNavIcon 
            isActive={false} 
            className={cn("text-primary shrink-0", iconClassName)} 
          />
        )}
        {children}
      </Button>
    </ConfirmDialog>
  );
}


import { Link, Outlet, type MiddlewareFunction } from "react-router";
import { Button } from "~/components/ui/button";
import { Logo } from "~/components/logo";
import { X } from "lucide-react";
import { requireNoAuthMiddleware } from "~/lib/auth-middleware";

// Middleware to load user and redirect if already authenticated
export const middleware: MiddlewareFunction[] = [requireNoAuthMiddleware];

export default function Auth() {
  return (
    <div className="h-[100dvh] bg-background flex overflow-hidden">
      {/* Left Side - Image */}
      <div className="hidden flex-1 lg:flex relative">
        <img
        loading="lazy"
          src="/auth.webp"
          alt="MOTOGT Workshop"
          className="w-full h-full object-cover"
        />
        {/* Optional overlay */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-8 pb-5">
          <Logo variant="primary" className="w-44" />

          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <X />
            </Link>
          </Button>
        </header>

        {/* Form Container */}
        <div className="my-auto md:px-8 overflow-scroll">
          <div className="max-w-8xl px-6 pb-10 md:pb-0 mx-auto md:max-w-lg space-y-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

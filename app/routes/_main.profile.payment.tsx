import { useState } from "react";
import { Plus, MoreHorizontal, Info, Loader2, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/_main.profile.payment";
import { useQuery } from "@tanstack/react-query";

// Mock payment method interface for future API integration
interface PaymentMethod {
  id: string;
  type: "visa" | "mastercard" | "amex";
  lastFour: string;
  holderName: string;
  expiryDate: string;
  isDefault: boolean;
}

export default function ProfilePayment({ loaderData }: Route.ComponentProps) {
  const paymentMethodsQuery = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: async () => {
      return [
        {
          id: "backup-1",
          type: "visa" as const,
          lastFour: "4256",
          holderName: "JEHAD AQEL",
          expiryDate: "07/33",
          isDefault: true,
        },
        {
          id: "backup-2",
          type: "mastercard" as const,
          lastFour: "4256",
          holderName: "JEHAD AQEL",
          expiryDate: "07/33",
          isDefault: false,
        },
      ];
    },
  });

  const getCardGradient = (type: PaymentMethod["type"]) => {
    switch (type) {
      case "visa":
        return "from-blue-800 to-purple-900";
      case "mastercard":
        return "from-orange-600 to-red-600";
      case "amex":
        return "from-green-600 to-emerald-700";
      default:
        return "from-gray-600 to-gray-800";
    }
  };

  const getCardLogo = (type: PaymentMethod["type"]) => {
    switch (type) {
      case "visa":
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <rect width="32" height="32" fill="white" rx="4" />
            <text
              x="16"
              y="20"
              textAnchor="middle"
              className="text-xs font-bold fill-blue-600"
            >
              VISA
            </text>
          </svg>
        );
      case "mastercard":
        return (
          <svg viewBox="0 0 32 20" className="w-full h-full">
            <circle cx="12" cy="10" r="10" fill="#eb001b" />
            <circle cx="20" cy="10" r="10" fill="#f79e1b" />
            <path
              d="M16,6.5c-1.5,1.4-2.5,3.4-2.5,5.5s1,4.1,2.5,5.5c1.5-1.4,2.5-3.4,2.5-5.5S17.5,7.9,16,6.5z"
              fill="#ff5f00"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (paymentMethodsQuery.error) {
    return <div>Error loading payment methods</div>;
  }

  return (
    <>
      <title>Payment Methods - MotoGT</title>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-black italic text-black tracking-[-0.198px]">
          Payment Information
        </h1>
      </div>

      {/* Payment Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 lg:pe-[9vw]">
        {paymentMethodsQuery.data?.map((paymentMethod) => {
          return (
            <div key={paymentMethod.id} className="relative">
              <div
                className={`aspect-video rounded bg-gradient-to-br ${getCardGradient(paymentMethod.type)} p-6 flex flex-col justify-between border border-[#e6e6e6]`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8">
                    {getCardLogo(paymentMethod.type)}
                  </div>
                  <div className="flex gap-2">
                    {!paymentMethod.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/80 hover:text-white hover:bg-white/10 h-8 px-2"
                        // onClick={() => handleSetDefault(paymentMethod.id)}
                        // disabled={isLoading}
                      >
                        {false ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Set Default"
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                      // onClick={() => handleDelete(paymentMethod.id)}
                      // disabled={isLoading}
                    >
                      {false ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                    <button className="text-white/80 hover:text-white">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="text-white font-medium">
                      <span className="text-[8px] tracking-[1.6px]">
                        ●●●● ●●●● ●●●●
                      </span>
                      <span className="text-xs ml-1">
                        {paymentMethod.lastFour}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-white text-xs font-medium">
                      {paymentMethod.holderName}
                    </div>
                    <div className="text-white text-xs font-medium">
                      {paymentMethod.expiryDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Card Indicator */}
              {paymentMethod.isDefault && (
                <div className="flex items-center gap-1 mt-2">
                  <Info className="w-4 h-4 text-[#7a95a8]" />
                  <span className="text-xs text-[#7a95a8] font-normal tracking-[-0.132px]">
                    This is your Default Card
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Add New Card */}
        <button className="aspect-video bg-[#f2f2f2] border border-[#e6e6e6] rounded-sm flex flex-col items-center justify-center gap-2 p-4 hover:bg-gray-200 transition-colors">
          <div className="w-8 h-8 bg-[#7a95a8] rounded-sm flex items-center justify-center border-[0.5px] border-[#f2f2f2]">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="text-xs font-bold text-[#7a95a8] text-center tracking-[-0.132px]">
            Add New Card
          </div>
        </button>
      </div>

      {/* Empty State */}
      {paymentMethodsQuery.data?.length === 0 && (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-gray-600 mb-4">
            No payment methods found
          </h3>
          <p className="text-gray-500 mb-8">
            Add a payment method to make checkout faster and easier.
          </p>
          <Button>Add Payment Method</Button>
        </div>
      )}
    </>
  );
}

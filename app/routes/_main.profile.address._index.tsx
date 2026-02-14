import { href, Link } from "react-router";
import { Button } from "~/components/ui/button";
import { SimpleCard } from "~/components/ui/card";
import { Plus, Loader2 } from "lucide-react";
import type { Route } from "./+types/_main.profile.address._index";
import { addressesQueryOptions, deleteAddressMutationOptions, setDefaultAddressMutationOptions, } from "~/lib/queries";
import type { AddressResponse } from "~/lib/client/types.gen";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Skeleton } from "~/components/ui/skeleton";

type AddressData = AddressResponse["data"];

export default function ProfileAddress() {
  const addressesQuery = useQuery(addressesQueryOptions);

  if (addressesQuery.error) {
    return <div>Error loading addresses</div>;
  }

  return (
    <>
      <title>My Addresses - MotoGT</title>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black italic text-black tracking-tight">
            Address Information
          </h1>
        </div>

        {/* Address Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addressesQuery.isPending ? (
            <>
              <Skeleton className="h-[110px]" />
              <Skeleton className="h-[110px]" />
              <Skeleton className="h-[110px]" />
            </>
          ) : (
            <>
              {addressesQuery.data.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  count={addressesQuery.data.length}
                />
              ))}
              <Link to="/profile/address/add">
                <SimpleCard className="p-4 h-full border-primary flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer">
                  <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs font-bold text-primary text-center">
                    Add New Address
                  </p>
                </SimpleCard>
              </Link>
            </>
          )}
        </div>

        {/* Empty State */}
        {addressesQuery.data?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No addresses found. Add your first address to get started.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function AddressCard({
  address,
  count,
}: {
  address: AddressData;
  count: number;
}) {
  const deleteAddressMutation = useMutation(deleteAddressMutationOptions);
  const setDefaultAddressMutation = useMutation(
    setDefaultAddressMutationOptions
  );

  return (
    <SimpleCard className="p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-2">
            <img
            loading="lazy"
              src="/nav-icons/address-outline.svg" 
              alt="Address" 
              className="size-6"
            />
            {address.isDefault && (
              <span className="text-xs bg-primary text-white px-2 py-1 rounded font-koulen">
                Default
              </span>
            )}
            {!address.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80 text-xs"
                onClick={() => setDefaultAddressMutation.mutate(address.id)}
                disabled={setDefaultAddressMutation.isPending}
              >
                {setDefaultAddressMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Setting...
                  </>
                ) : (
                  "Set as default"
                )}
              </Button>
            )}
          </div>
          <div className="space-y-2 text-xs">
            <h3 className="font-bold">{address.title}</h3>
            <p className="text-muted-foreground font-medium">
              {address.addressLine1}
            </p>
          </div>
        </div>
        <div className="flex gap-4 ml-3">
          {count > 1 && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => deleteAddressMutation.mutate(address.id)}
              disabled={deleteAddressMutation.isPending}
              className="h-8 w-8"
            >
              <span className="sr-only">Delete</span>
              {deleteAddressMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <img 
                loading="lazy"
                  src="/delete-icon.svg" 
                  alt="Delete" 
                  className="w-4 h-4"
                />
              )}
            </Button>
          )}
          <Button variant="outline" size="icon" asChild className="h-8 w-8">
            <Link to={href(`/profile/address/edit/:id`, { id: address.id })}>
              <span className="sr-only">Edit</span>
              <img
              loading="lazy"
                src="/edit-icon.svg" 
                alt="Edit" 
                className="w-4 h-4"
              />
            </Link>
          </Button>
        </div>
      </div>
    </SimpleCard>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { ProductQuickViewPanel } from "~/components/product-quick-view-panel";

type ProductQuickViewContextValue = {
  openProductQuickView: (productId: string) => void;
  closeProductQuickView: () => void;
};

const ProductQuickViewContext =
  createContext<ProductQuickViewContextValue | null>(null);

export function ProductQuickViewProvider({ children }: { children: ReactNode }) {
  const [productId, setProductId] = useState<string | null>(null);

  const openProductQuickView = useCallback((id: string) => {
    if (!id) return;
    setProductId(id);
  }, []);

  const closeProductQuickView = useCallback(() => {
    setProductId(null);
  }, []);

  const value = useMemo(
    () => ({ openProductQuickView, closeProductQuickView }),
    [openProductQuickView, closeProductQuickView]
  );

  return (
    <ProductQuickViewContext.Provider value={value}>
      {children}
      <Dialog
        open={productId !== null}
        onOpenChange={(open) => {
          if (!open) closeProductQuickView();
        }}
      >
        <DialogContent
          className="flex max-h-[min(90dvh,calc(100dvh-2rem))] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-4 sm:w-[calc(100%-2rem)] sm:max-w-[calc(100%-2rem)] md:max-w-4xl md:p-6 lg:max-w-5xl xl:max-w-6xl"
          showCloseButton
        >
          {productId ? (
            <ProductQuickViewPanel
              productId={productId}
              onClose={closeProductQuickView}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </ProductQuickViewContext.Provider>
  );
}

export function useProductQuickView() {
  const context = useContext(ProductQuickViewContext);
  if (!context) {
    throw new Error(
      "useProductQuickView must be used within ProductQuickViewProvider"
    );
  }
  return context;
}

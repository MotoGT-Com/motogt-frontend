import { Suspense, useId, useState, useEffect } from "react";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { Await } from "react-router";

import styles from "./productsHorizontalScroll.module.css";

interface ProductsHorizontalScrollProps {
  sectionTitle?: string;
  productsResponse: Promise<any> | { data?: { data: any[] } };
  /** Outer section spacing; default matches home product rails */
  wrapperClassName?: string;
  /** When true, keep API order (e.g. newest first); default shuffles client-side */
  preserveProductOrder?: boolean;
}

function ProductCarousel({
  initialData,
  preserveProductOrder,
}: {
  initialData: any[];
  preserveProductOrder?: boolean;
}) {
  const id = useId();

  // Show first 10 products in order during SSR; optionally shuffle client-side
  // to avoid hydration mismatch from Math.random()
  const [randomProducts, setRandomProducts] = useState<any[]>(() => {
    const data = Array.isArray(initialData) ? initialData : [];
    return data.slice(0, 10);
  });

  useEffect(() => {
    const data = Array.isArray(initialData) ? initialData : [];
    if (data.length === 0) return;
    if (preserveProductOrder) {
      setRandomProducts(data.slice(0, 10));
      return;
    }
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setRandomProducts(shuffled.slice(0, 10));
  }, [initialData, preserveProductOrder]);

  return (
    <>
      {randomProducts.map((product, index) => (
        <div
          key={`${id}-${product.id}-${index}`}
          className="basis-[87%] md:basis-[26%] shrink-0"
        >
          <ProductCard product={product} />
        </div>
      ))}
    </>
  );
}

const ProductsHorizontalScroll = ({
  sectionTitle,
  productsResponse,
  wrapperClassName = "pt-4 mb-24",
  preserveProductOrder = false,
}: ProductsHorizontalScrollProps) => {
  return (
    <div className={wrapperClassName}>
      {sectionTitle && (
        <div className="flex items-center justify-between max-w-[96rem] mx-auto px-4 md:px-8 mb-6">
          <h2 className="text-xl font-bold italic text-black">
            {sectionTitle}
          </h2>
        </div>
      )}
      <div className="ps-[calc(max(0px,(100vw-96rem)/2)+1rem)] md:ps-[calc(max(0px,(100vw-96rem)/2)+2rem)]">
        <div
          className={"flex overflow-x-auto gap-4 " + styles.hideScrollbar}
        >
          <Suspense
            fallback={Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="basis-[87%] md:basis-[26%] shrink-0">
                <ProductCardSkeleton />
              </div>
            ))}
          >
            <Await resolve={productsResponse}>
              {(resolvedResponse) =>
                resolvedResponse.data && (
                  <ProductCarousel
                    initialData={resolvedResponse.data.data as any[]}
                    preserveProductOrder={preserveProductOrder}
                  />
                )
              }
            </Await>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default ProductsHorizontalScroll;

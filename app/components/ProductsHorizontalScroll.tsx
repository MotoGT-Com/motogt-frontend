import { Suspense, useId, useState, useEffect } from "react";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { Await } from "react-router";

import styles from "./productsHorizontalScroll.module.css";

interface ProductsHorizontalScrollProps {
  sectionTitle?: string;
  productsResponse: Promise<any> | { data?: { data: any[] } };
}

function ProductCarousel({ initialData }: { initialData: any[] }) {
  const id = useId();
  
  // Show first 10 products in order during SSR, then shuffle client-side
  // to avoid hydration mismatch from Math.random()
  const [randomProducts, setRandomProducts] = useState<any[]>(() => {
    const data = Array.isArray(initialData) ? initialData : [];
    return data.slice(0, 10);
  });

  useEffect(() => {
    const data = Array.isArray(initialData) ? initialData : [];
    if (data.length === 0) return;
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setRandomProducts(shuffled.slice(0, 10));
  }, [initialData]);

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
}: ProductsHorizontalScrollProps) => {
  return (
    <div className="pt-4 mb-24">
      {sectionTitle && (
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 mb-6">
          <h2 className="text-xl font-bold italic text-black">
            {sectionTitle}
          </h2>
        </div>
      )}
      <div className="ps-[calc(max(0px,(100vw-80rem)/2)+1.5rem)]">
        <div
          className={
            "flex overflow-x-auto gap-x-4 pb-2 " + styles.hideScrollbar
          }
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

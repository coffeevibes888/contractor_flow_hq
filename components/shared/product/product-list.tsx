"use client";

import { useRef, useState, useEffect } from "react";
import ProductCard from "./product-card";
import { Product } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ProductList = ({
  data,
  title,
  limit,
}: {
  data: Product[];
  title?: string;
  limit?: number;
}) => {
  const shownData = typeof limit === "number" ? data.slice(0, limit) : data;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const cardWidth = 250; // Width of each card
  const gap = 24; // Gap between cards
  const scrollAmount = cardWidth + gap;

  const checkScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const currentRef = scrollRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', checkScrollPosition);
      // Initial check after a small delay to ensure DOM is fully rendered
      const timer = setTimeout(checkScrollPosition, 100);
      return () => {
        currentRef.removeEventListener('scroll', checkScrollPosition);
        clearTimeout(timer);
      };
    }
  }, [data]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative w-full py-4">
      {title && (
        <h2 className="text-2xl font-bold text-center ">
          {title}
        </h2>
      )}

      <div className="relative mx-auto max-w-7xl px-4">
        {shownData.length > 4 ? (
          <>
            {/* LEFT ARROW */}
            <button
              onClick={scrollLeft}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 
                    flex h-12 w-12 items-center justify-center 
                    bg-black/80 text-white rounded-full 
                    hover:bg-black transition-all duration-200
                    ${!showLeftArrow ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                    shadow-lg`}
              aria-label="Scroll left"
            >
              <ChevronLeft size={30} />
            </button>

            {/* SCROLL ROW */}
            <div
              ref={scrollRef}
              className="flex overflow-x-auto scroll-smooth no-scrollbar gap-6 py-4 px-2"
              style={{
                scrollBehavior: 'smooth',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
            >
              {shownData.map((product) => (
                <div
                  key={product.slug}
                  className="flex-shrink-0 w-[250px] transition-transform duration-200 hover:scale-105"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* RIGHT ARROW */}
            <button
              onClick={scrollRight}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 
                    flex h-12 w-12 items-center justify-center 
                    bg-black/80 text-white rounded-full 
                    hover:bg-black transition-all duration-200
                    ${!showRightArrow ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                    shadow-lg`}
              aria-label="Scroll right"
            >
              <ChevronRight size={30} />
            </button>
          </>
        ) : (
          <div className="flex flex-wrap justify-center gap-6 py-4 px-2">
            {shownData.map((product) => (
              <div
                key={product.slug}
                className="w-[250px] transition-transform duration-200 hover:scale-105"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface CarouselItem {
  id: string;
  image?: string;
  title?: string;
  subtitle?: string;
  link?: string;
  mobileImage?: string;
}

interface CarouselProps {
  items: CarouselItem[];
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
}

export default function Carousel({
  items,
  autoPlay = true,
  interval = 5000,
  showDots = true,
  showArrows = true,
  className,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!autoPlay || isHovered || items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, items.length, isHovered]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  if (!items || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9]">
        {/* Desktop Image */}
        <div className="hidden md:block w-full h-full">
          {currentItem.image && 
           currentItem.image !== "/placeholder-banner.jpg" && 
           !imageErrors.has(currentItem.image) ? (
            <Image
              src={currentItem.image}
              alt={currentItem.title || "Banner"}
              fill
              className="object-cover"
              priority={currentIndex === 0}
              sizes="100vw"
              onError={() => {
                setImageErrors(prev => new Set(prev).add(currentItem.image!));
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary-600 to-primary-700" />
          )}
        </div>
        {/* Mobile Image */}
        <div className="block md:hidden w-full h-full">
          {currentItem.mobileImage && 
           currentItem.mobileImage !== "/placeholder-banner.jpg" && 
           !imageErrors.has(currentItem.mobileImage) ? (
            <Image
              src={currentItem.mobileImage}
              alt={currentItem.title || "Banner"}
              fill
              className="object-cover"
              priority={currentIndex === 0}
              sizes="100vw"
              onError={() => {
                setImageErrors(prev => new Set(prev).add(currentItem.mobileImage!));
              }}
            />
          ) : currentItem.image && 
                currentItem.image !== "/placeholder-banner.jpg" && 
                !imageErrors.has(currentItem.image) ? (
            <Image
              src={currentItem.image}
              alt={currentItem.title || "Banner"}
              fill
              className="object-cover"
              priority={currentIndex === 0}
              sizes="100vw"
              onError={() => {
                setImageErrors(prev => new Set(prev).add(currentItem.image!));
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary-600 to-primary-700" />
          )}
        </div>

        {/* Overlay Content */}
        {(currentItem.title || currentItem.subtitle) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="text-center text-white px-4">
              {currentItem.title && (
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2">
                  {currentItem.title}
                </h2>
              )}
              {currentItem.subtitle && (
                <p className="text-base md:text-lg lg:text-xl">
                  {currentItem.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Arrows */}
        {showArrows && items.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-10",
                "bg-white/80 hover:bg-white text-secondary-900",
                "rounded-full p-2 shadow-lg transition-all duration-200",
                "hover:scale-110 active:scale-95",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                "[@media(prefers-reduced-motion:reduce)]:scale-100"
              )}
              aria-label="Previous slide"
              type="button"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-10",
                "bg-white/80 hover:bg-white text-secondary-900",
                "rounded-full p-2 shadow-lg transition-all duration-200",
                "hover:scale-110 active:scale-95",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                "[@media(prefers-reduced-motion:reduce)]:scale-100"
              )}
              aria-label="Next slide"
              type="button"
            >
              <FiChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {showDots && items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import Image from "next/image";
import { FiZoomIn, FiBox } from "react-icons/fi";
import Product3DViewer from "./Product3DViewer";
import TabsControlled from "@/components/ui/TabsControlled";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/imageUtils";

interface ProductGalleryProps {
  images?: string[];
  modelUrl?: string;
  productName?: string;
}

interface GalleryContentProps {
  normalizedImages: string[];
  selectedImage: string;
  productName?: string;
  onSelectImage: (image: string) => void;
  onZoom: () => void;
}

function GalleryContent({
  normalizedImages,
  selectedImage,
  productName,
  onSelectImage,
  onZoom,
}: GalleryContentProps) {
  return (
    <div className="space-y-4">
      <div
        className="relative aspect-[4/5] bg-secondary-50 rounded-2xl overflow-hidden group cursor-zoom-in border border-secondary-100 shadow-sm"
        onClick={onZoom}
      >
        {selectedImage ? (
          <>
            <Image
              src={selectedImage}
              alt={productName || "Product"}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-sm">
              <FiZoomIn className="w-5 h-5 text-secondary-900" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-secondary-400">
            No Image
          </div>
        )}
      </div>

      {normalizedImages.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {normalizedImages.map((img, idx) => (
            <button
              key={img || idx}
              onClick={() => onSelectImage(img)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200",
                selectedImage === img
                  ? "border-primary-600 ring-2 ring-primary-100 ring-offset-1"
                  : "border-transparent hover:border-secondary-300 opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={img}
                alt={`${productName} ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 12.5vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductGallery({
  images = [],
  modelUrl,
  productName,
}: ProductGalleryProps) {
  // Normalize all image URLs
  const normalizedImages = images.map((img) => normalizeImageUrl(img) || img);
  const [selectedImage, setSelectedImage] = useState(normalizedImages[0] || "");
  const [zoomOpen, setZoomOpen] = useState(false);
  const activeImage =
    normalizedImages.find((img) => img === selectedImage) ||
    normalizedImages[0] ||
    "";

  if (images.length === 0 && !modelUrl) {
    return (
      <div className="aspect-[4/3] bg-secondary-50 rounded-2xl flex items-center justify-center border border-secondary-100">
        <div className="text-center text-secondary-400">
          <FiBox className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <span className="text-sm font-medium">No Image Available</span>
        </div>
      </div>
    );
  }

  const has3D = !!modelUrl;
  const tabs = has3D
    ? [
        { id: "images", label: "Hình ảnh" },
        { id: "3d", label: "Xem 3D" },
      ]
    : [];

  return (
    <div className="w-full">
      {has3D && tabs.length > 0 ? (
        <TabsControlled tabs={tabs} defaultTab="images">
          {(activeTab) => (
            <>
              {activeTab === "images" && (
                <GalleryContent
                  normalizedImages={normalizedImages}
                  selectedImage={activeImage}
                  productName={productName}
                  onSelectImage={setSelectedImage}
                  onZoom={() => setZoomOpen(true)}
                />
              )}
              {activeTab === "3d" && modelUrl && (
                <div className="aspect-[4/3] bg-secondary-50 rounded-2xl overflow-hidden border border-secondary-100">
                  <Product3DViewer modelUrl={modelUrl} />
                </div>
              )}
            </>
          )}
        </TabsControlled>
      ) : (
        <GalleryContent
          normalizedImages={normalizedImages}
          selectedImage={activeImage}
          productName={productName}
          onSelectImage={setSelectedImage}
          onZoom={() => setZoomOpen(true)}
        />
      )}

      {/* Zoom Modal - Full Screen */}
      {zoomOpen && activeImage && (
        <div
          className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex items-center justify-center animate-fade-in"
          onClick={() => setZoomOpen(false)}
        >
          <button
            onClick={() => setZoomOpen(false)}
            className="absolute top-6 right-6 text-secondary-500 hover:text-secondary-900 transition-colors p-2"
          >
            <span className="text-4xl leading-none">&times;</span>
          </button>
          <div className="relative w-full h-full p-4 md:p-12 flex items-center justify-center">
            <Image
              src={activeImage}
              alt={productName || "Product"}
              width={1600}
              height={1600}
              className="object-contain max-h-full max-w-full drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}

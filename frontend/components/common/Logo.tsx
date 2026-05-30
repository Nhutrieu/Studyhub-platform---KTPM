"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settingsService";
import { useMemo } from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export default function Logo({ className, size = "md", showText = true }: LogoProps) {
  const { data: headerSettings } = useQuery({
    queryKey: ["headerSettings"],
    queryFn: () => settingsService.getHeaderSettings(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const logoConfig = useMemo(
    () =>
      headerSettings
        ? {
            logoUrl: headerSettings.logoUrl,
            logoSvg: headerSettings.logoSvg,
            logoText: headerSettings.logoText || "FurniMart",
          }
        : null,
    [headerSettings]
  );

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  // Default logo if no custom logo is set
  const defaultLogo = (
    <div className={cn("relative", sizeClasses[size])}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Sofa base */}
        <rect x="15" y="60" width="70" height="25" rx="3" fill="#0F766E" />
        {/* Sofa back */}
        <rect x="15" y="40" width="70" height="25" rx="3" fill="#14B8A6" />
        {/* Cushions */}
        <rect x="20" y="45" width="20" height="15" rx="2" fill="#5EEAD4" />
        <rect x="45" y="45" width="20" height="15" rx="2" fill="#5EEAD4" />
        <rect x="70" y="45" width="15" height="15" rx="2" fill="#5EEAD4" />
        {/* Table in front */}
        <rect x="30" y="70" width="40" height="5" rx="1" fill="#0F766E" />
        <rect x="48" y="75" width="4" height="10" fill="#14B8A6" />
      </svg>
    </div>
  );

  return (
    <Link href="/" className={cn("flex items-center gap-3 group", className)}>
      {/* Custom Logo Image */}
      {logoConfig?.logoUrl ? (
        <div className={cn("relative", sizeClasses[size])}>
          <Image
            src={logoConfig.logoUrl}
            alt={logoConfig.logoText || "Logo"}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 32px, 40px"
          />
        </div>
      ) : logoConfig?.logoSvg ? (
        <div
          className={cn("relative", sizeClasses[size])}
          dangerouslySetInnerHTML={{ __html: logoConfig.logoSvg }}
        />
      ) : (
        defaultLogo
      )}
      {showText && (
        <span className={cn("font-semibold text-secondary-900 tracking-tight group-hover:text-primary-600 transition-colors", textSizes[size])}>
          {logoConfig?.logoText || "FurniMart"}
        </span>
      )}
    </Link>
  );
}


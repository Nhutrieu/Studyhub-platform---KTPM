"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FiChevronRight, FiHome } from "react-icons/fi";
import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  tabs?: Array<{ label: string; href: string; isActive?: boolean }>;
  className?: string;
}

/**
 * PageHeader
 * 
 * Enhanced page header component with title, description, breadcrumbs, actions, and optional tabs.
 * Use on every dashboard page for consistent layout.
 * 
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Products"
 *   description="Manage your product catalog"
 *   breadcrumbs={[
 *     { label: "Dashboard", href: "/admin" },
 *     { label: "Products" }
 *   ]}
 *   actions={<Button>Add Product</Button>}
 * />
 * ```
 */
export default function PageHeader({
  title,
  subtitle,
  description,
  breadcrumbs,
  actions,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 w-full max-w-full overflow-x-hidden", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 mb-4 text-sm text-secondary-600" aria-label="Breadcrumb">
          <Link
            href="/"
            className="hover:text-primary-600 transition-colors duration-200"
            title="Trang chủ"
          >
            <FiHome className="w-4 h-4" />
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <FiChevronRight className="w-4 h-4 text-secondary-400" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-primary-600 transition-colors duration-200"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-secondary-900 font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold text-secondary-900 tracking-tight mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-secondary-700 font-medium mb-2">{subtitle}</p>
          )}
          {description && (
            <p className="text-sm md:text-base text-secondary-600 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="border-b border-secondary-200 -mb-6 mt-6">
          <nav className="flex space-x-8 w-full max-w-full overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap flex-shrink-0",
                  tab.isActive
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-primary-300"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

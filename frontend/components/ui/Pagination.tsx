"use client";

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Button from "./Button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      (page >= currentPage - 1 && page <= currentPage + 1)
  );

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <FiChevronLeft className="w-4 h-4" />
      </Button>

      {visiblePages.map((page, index) => {
        const showEllipsis =
          index > 0 && visiblePages[index - 1] !== page - 1;
        return (
          <div key={page} className="flex items-center gap-2">
            {showEllipsis && (
              <span className="px-2 text-secondary-500">...</span>
            )}
            <Button
              variant={currentPage === page ? "primary" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          </div>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <FiChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}


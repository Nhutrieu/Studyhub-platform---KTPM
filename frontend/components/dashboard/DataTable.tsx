"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import Pagination from "@/components/ui/Pagination";
import { dataTablePattern } from "@/lib/design-system/patterns";
import Card from "@/components/ui/Card";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  toolbar?: ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

/**
 * DataTable
 * 
 * Standard data table component with toolbar, pagination, and consistent styling.
 * MUST be used for all list/table pages in dashboards.
 * 
 * Usage:
 * ```tsx
 * <DataTable
 *   columns={[
 *     { key: "id", header: "ID" },
 *     { key: "name", header: "Name", render: (item) => item.name },
 *   ]}
 *   data={orders}
 *   toolbar={<FilterBar />}
 *   pagination={{ currentPage: 1, totalPages: 10, onPageChange: handlePageChange }}
 * />
 * ```
 */
export default function DataTable<T extends { id?: string | number } = { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyState,
  toolbar,
  pagination,
  className,
}: DataTableProps<T>) {
  return (
    <Card className={cn(dataTablePattern.container, className)}>
      {/* Toolbar */}
      {toolbar && (
        <div className={cn(dataTablePattern.header, "border-b")}>
          {toolbar}
        </div>
      )}

      {/* Table */}
      <div className="w-full max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <div className="animate-pulse text-secondary-500">Loading...</div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  {emptyState || (
                    <div className="text-secondary-500">No data available</div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => {
                const itemId = item.id !== undefined ? String(item.id) : undefined;
                return (
                  <TableRow key={itemId || index}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render
                          ? column.render(item)
                          : String((item as Record<string, unknown>)[column.key] ?? "-")}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className={cn(dataTablePattern.pagination, "flex justify-end")}>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </Card>
  );
}


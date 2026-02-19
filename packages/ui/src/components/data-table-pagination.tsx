import { Table } from "@tanstack/react-table";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./select";

interface DataTablePaginationProps<TData> {
    table?: Table<TData>;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
    /** Total number of rows across all pages (for "Showing X to Y of Z rows") */
    totalRowCount?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    className?: string;
    variant?: "default" | "compact";
}

export function DataTablePagination<TData>({
    table,
    currentPage,
    totalPages,
    pageSize,
    totalRowCount,
    onPageChange,
    onPageSizeChange,
    className,
    variant = "default",
}: DataTablePaginationProps<TData>) {
    // Support both TanStack Table instance OR manual pagination props
    const isManual = currentPage !== undefined;

    const _pageSize = isManual ? pageSize : table?.getState().pagination.pageSize;
    const _pageIndex = isManual ? (currentPage ?? 1) - 1 : table?.getState().pagination.pageIndex;
    const _pageCount = isManual ? (totalPages ?? 1) : table?.getPageCount();
    const _totalRows = isManual ? (totalRowCount ?? 0) : (table?.getFilteredRowModel().rows.length ?? 0);

    const canPrev = isManual ? (_pageIndex! > 0) : table?.getCanPreviousPage();
    const canNext = isManual ? (_pageIndex! < (_pageCount! - 1)) : table?.getCanNextPage();

    const start = _totalRows === 0 ? 0 : _pageIndex! * _pageSize! + 1;
    const end = _totalRows === 0 ? 0 : Math.min((_pageIndex! + 1) * _pageSize!, _totalRows);

    const setPageIndex = (idx: number) => {
        if (isManual) {
            onPageChange?.(idx + 1);
        } else {
            table?.setPageIndex(idx);
        }
    };

    const setPageSize = (size: number) => {
        if (isManual) {
            onPageSizeChange?.(size);
        } else {
            table?.setPageSize(size);
        }
    };

    const isCompact = variant === "compact";

    return (
        <div
            className={cn(
                "flex items-center justify-between px-2",
                isCompact && "py-0.5",
                className
            )}
        >
            <div className={cn("flex-1 text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
                Showing {start} to {end} of {_totalRows} rows
                {table?.getFilteredSelectedRowModel().rows.length ? (
                    <span className="ml-4">{table.getFilteredSelectedRowModel().rows.length} row(s) selected.</span>
                ) : null}
            </div>
            <div className={cn("flex items-center", isCompact ? "space-x-3" : "space-x-6 lg:space-x-8")}>
                <div className="flex items-center space-x-2">
                    <p className={cn("font-medium", isCompact ? "text-xs" : "text-sm")}>Rows per page</p>
                    <Select
                        value={`${_pageSize}`}
                        onValueChange={(value) => {
                            setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className={isCompact ? "h-7 w-[60px] text-xs px-2.5 py-1.5" : "h-8 w-[70px]"}>
                            <SelectValue placeholder={_pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 25, 30, 40, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`} className={isCompact ? "py-1 pl-6 pr-2 text-xs" : undefined}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className={cn("flex w-[100px] items-center justify-center font-medium", isCompact ? "text-xs" : "text-sm")}>
                    Page {_pageIndex! + 1} of {_pageCount}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className={cn("hidden p-0 lg:flex", isCompact ? "h-7 w-7" : "h-8 w-8")}
                        onClick={() => setPageIndex(0)}
                        disabled={!canPrev}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    </Button>
                    <Button
                        variant="outline"
                        className={cn("p-0", isCompact ? "h-7 w-7" : "h-8 w-8")}
                        onClick={() => setPageIndex(_pageIndex! - 1)}
                        disabled={!canPrev}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    </Button>
                    <Button
                        variant="outline"
                        className={cn("p-0", isCompact ? "h-7 w-7" : "h-8 w-8")}
                        onClick={() => setPageIndex(_pageIndex! + 1)}
                        disabled={!canNext}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    </Button>
                    <Button
                        variant="outline"
                        className={cn("hidden p-0 lg:flex", isCompact ? "h-7 w-7" : "h-8 w-8")}
                        onClick={() => setPageIndex(_pageCount! - 1)}
                        disabled={!canNext}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    </Button>
                </div>
            </div>
        </div>
    );
}

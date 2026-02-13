import { Table } from "@tanstack/react-table";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";

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
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
}

export function DataTablePagination<TData>({
    table,
    currentPage,
    totalPages,
    pageSize,
    onPageChange,
    onPageSizeChange,
}: DataTablePaginationProps<TData>) {
    // Support both TanStack Table instance OR manual pagination props
    const isManual = currentPage !== undefined;

    const _pageSize = isManual ? pageSize : table?.getState().pagination.pageSize;
    const _pageIndex = isManual ? (currentPage ?? 1) - 1 : table?.getState().pagination.pageIndex;
    const _pageCount = isManual ? (totalPages ?? 1) : table?.getPageCount();

    const canPrev = isManual ? (_pageIndex! > 0) : table?.getCanPreviousPage();
    const canNext = isManual ? (_pageIndex! < (_pageCount! - 1)) : table?.getCanNextPage();

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

    return (
        <div className="flex items-center justify-between px-2">
            <div className="flex-1 text-sm text-muted-foreground">
                {table?.getFilteredSelectedRowModel().rows.length ? (
                    <>{table.getFilteredSelectedRowModel().rows.length} row(s) selected.</>
                ) : null}
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${_pageSize}`}
                        onValueChange={(value) => {
                            setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={_pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {_pageIndex! + 1} of {_pageCount}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => setPageIndex(0)}
                        disabled={!canPrev}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setPageIndex(_pageIndex! - 1)}
                        disabled={!canPrev}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setPageIndex(_pageIndex! + 1)}
                        disabled={!canNext}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => setPageIndex(_pageCount! - 1)}
                        disabled={!canNext}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/**
 * Reusable pagination component for data tables.
 * Standard implementation based on AuditLogs page.
 * 
 * Features:
 * - Rows per page selector (default: 10, 25, 50, 100)
 * - Page X of Y display
 * - 4 navigation buttons (First, Previous, Next, Last)
 * - Right-aligned layout
 * - Consistent spacing and sizing
 */
export function DataTablePagination({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-end gap-6 px-4 py-3">
      {/* Rows per page */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page</span>
        <select
          id="rows-per-page"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 px-2 rounded-md border border-input bg-background text-sm font-medium"
          aria-label="Rows per page"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>

      {/* Page info */}
      <span className="text-sm font-medium text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>

      {/* 4 Navigation buttons */}
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onPageChange(1)} 
          disabled={currentPage === 1}
          className="h-8 w-8"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1}
          className="h-8 w-8"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
          className="h-8 w-8"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

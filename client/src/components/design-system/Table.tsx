/**
 * Table Component - Vedic LMS Design System
 * 
 * Data tables for LMS content management and user administration.
 * Supports sorting, selection, and colorful status indicators.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React from "react";
import { ChevronUp, ChevronDown, MoreHorizontal } from "lucide-react";
import { Checkbox } from "./Checkbox";
import { Badge } from "./Badge";
import { Button } from "./Button";

export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string, direction: "asc" | "desc") => void;
  selectable?: boolean;
  selectedRows?: string[];
  onRowSelect?: (selectedIds: string[]) => void;
  getRowId?: (row: T) => string;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  size?: "sm" | "md" | "lg";
  striped?: boolean;
  hoverable?: boolean;
  className?: string;
}

export interface DataTableProps<T = any> extends TableProps<T> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

const sizeClasses = {
  sm: "text-sm px-3 py-2",
  md: "text-base px-4 py-3", 
  lg: "text-lg px-6 py-4"
};

const variantClasses = {
  blue: "border-blue-200 focus-within:ring-blue-500",
  green: "border-green-200 focus-within:ring-green-500",
  purple: "border-purple-200 focus-within:ring-purple-500",
  orange: "border-orange-200 focus-within:ring-orange-500",
  pink: "border-pink-200 focus-within:ring-pink-500",
  indigo: "border-indigo-200 focus-within:ring-indigo-500",
  teal: "border-teal-200 focus-within:ring-teal-500",
  cyan: "border-cyan-200 focus-within:ring-cyan-500",
  yellow: "border-yellow-200 focus-within:ring-yellow-500",
  lime: "border-lime-200 focus-within:ring-lime-500",
  rose: "border-rose-200 focus-within:ring-rose-500",
  emerald: "border-emerald-200 focus-within:ring-emerald-500"
};

export function Table<T = any>({
  columns,
  data,
  sortKey,
  sortDirection,
  onSort,
  selectable = false,
  selectedRows = [],
  onRowSelect,
  getRowId = (row: any) => row.id,
  variant = "blue",
  size = "md",
  striped = true,
  hoverable = true,
  className = ""
}: TableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;
    
    const newDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, newDirection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onRowSelect) return;
    
    if (checked) {
      onRowSelect(data.map(getRowId));
    } else {
      onRowSelect([]);
    }
  };

  const handleRowSelect = (rowId: string, checked: boolean) => {
    if (!onRowSelect) return;
    
    if (checked) {
      onRowSelect([...selectedRows, rowId]);
    } else {
      onRowSelect(selectedRows.filter(id => id !== rowId));
    }
  };

  const isAllSelected = selectedRows.length === data.length && data.length > 0;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < data.length;

  return (
    <div className={`overflow-x-auto border-2 rounded-lg ${variantClasses[variant]} ${className}`}>
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {selectable && (
              <th className={`${sizeClasses[size]} text-left`}>
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                  variant={variant}
                  size="sm"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={`${sizeClasses[size]} text-left font-semibold text-gray-900`}
                style={column.width ? { width: column.width } : {}}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.key)}
                    className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                  >
                    {column.header}
                    {sortKey === column.key ? (
                      sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const rowId = getRowId(row);
            const isSelected = selectedRows.includes(rowId);
            
            return (
              <tr
                key={rowId}
                className={`
                  border-b border-gray-200 last:border-b-0
                  ${striped && index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                  ${hoverable ? 'hover:bg-gray-100' : ''}
                  ${isSelected ? 'bg-blue-50' : ''}
                  transition-colors
                `}
              >
                {selectable && (
                  <td className={sizeClasses[size]}>
                    <Checkbox
                      checked={isSelected}
                      onChange={(checked) => handleRowSelect(rowId, checked)}
                      variant={variant}
                      size="sm"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={`${sizeClasses[size]} text-gray-900`}>
                    {column.render 
                      ? column.render(row[column.key], row)
                      : row[column.key]
                    }
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {data.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No data available</p>
        </div>
      )}
    </div>
  );
}

export function DataTable<T = any>({
  title,
  description,
  actions,
  pagination,
  ...tableProps
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || description || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <Table {...tableProps} />

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Pre-built LMS table configurations
export const LMSTableColumns = {
  users: [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { 
      key: "role", 
      header: "Role", 
      render: (value: string) => (
        <Badge variant={value === "admin" ? "purple" : value === "teacher" ? "emerald" : "blue"}>
          {value}
        </Badge>
      )
    },
    { 
      key: "status", 
      header: "Status",
      render: (value: string) => (
        <Badge variant={value === "active" ? "green" : "yellow"}>
          {value}
        </Badge>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: () => (
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )
    }
  ],
  
  tracks: [
    { key: "title", header: "Track Title", sortable: true },
    { key: "description", header: "Description" },
    { 
      key: "status", 
      header: "Status",
      render: (value: string) => (
        <Badge variant={value === "published" ? "green" : "yellow"}>
          {value}
        </Badge>
      )
    },
    { key: "chaptersCount", header: "Chapters", sortable: true },
    { key: "createdAt", header: "Created", sortable: true }
  ],
  
  chapters: [
    { key: "title", header: "Chapter Title", sortable: true },
    { key: "trackTitle", header: "Track" },
    { 
      key: "hasAudio", 
      header: "Audio",
      render: (value: boolean) => (
        <Badge variant={value ? "green" : "gray"}>
          {value ? "Yes" : "No"}
        </Badge>
      )
    },
    { key: "segmentCount", header: "Segments", sortable: true },
    { 
      key: "status", 
      header: "Status",
      render: (value: string) => (
        <Badge variant={value === "published" ? "green" : "yellow"}>
          {value}
        </Badge>
      )
    }
  ]
};
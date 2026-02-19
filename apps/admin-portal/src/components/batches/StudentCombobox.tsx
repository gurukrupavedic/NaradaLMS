import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { EligibleStudent } from "./types";

// Re-using EligibleStudent as StudentSearchResult for simplicity in combobox
type StudentSearchResult = EligibleStudent;

interface StudentComboboxProps {
    students: StudentSearchResult[];
    isLoading: boolean;
    value: StudentSearchResult | null;
    onSelect: (student: StudentSearchResult) => void;
    placeholder?: string;
    disabled?: boolean; // Added disabled prop
}

export function StudentCombobox({
    students,
    isLoading,
    value,
    onSelect,
    placeholder = "Search by name, email, or ID...",
    disabled = false,
}: StudentComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredStudents = students.filter((student) => {
        const query = searchInput.toLowerCase();
        return (
            student.email.toLowerCase().includes(query) ||
            (student.firstName && student.firstName.toLowerCase().includes(query)) ||
            (student.lastName && student.lastName.toLowerCase().includes(query)) ||
            student.id.toLowerCase().includes(query)
        );
    });

    const handleSelect = (student: StudentSearchResult) => {
        onSelect(student);
        setSearchInput("");
        setIsOpen(false);
    };

    const displayName = value
        ? `${value.firstName || ""} ${value.lastName || ""}`.trim() || value.email
        : "";

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={value ? "" : placeholder}
                    value={value ? displayName : searchInput}
                    onChange={(e) => {
                        setSearchInput(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground pr-10 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {value && !disabled && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onSelect(null as any);
                                setSearchInput("");
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            type="button"
                            aria-label="Clear selection"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <ChevronDown
                        size={16}
                        className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            Loading students...
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            {searchInput ? "No students found" : "No students available"}
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {filteredStudents.map((student) => (
                                <li key={student.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(student)}
                                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm"
                                    >
                                        <div className="font-medium">
                                            {student.firstName && student.lastName
                                                ? `${student.firstName} ${student.lastName}`
                                                : student.firstName || student.lastName || "No name"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {student.email} • {student.id}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

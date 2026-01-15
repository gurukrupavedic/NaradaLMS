import React, { forwardRef, useCallback } from "react";

import Icon from "./icon";
import { cn } from "../../helpers/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void;
  showSearchIcon?: boolean;
  showClearButton?: boolean;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onClear,
      onChange,
      showSearchIcon = true,
      showClearButton = true,
      ...props
    },
    ref
  ) => {
    const hasValue = Boolean(value && String(value).length > 0);

    const handleClear = useCallback(() => {
      onClear?.();
      // Trigger onChange with empty value if onClear not provided
      if (!onClear && onChange) {
        const event = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    }, [onClear, onChange]);

    return (
      <div className={cn("rte-search-input", className)}>
        {showSearchIcon && (
          <Icon size={18} name="Search" className="rte-search-input__icon" />
        )}
        <input
          ref={ref}
          type="text"
          className={cn(
            "rte-input rte-search-input__input",
            !showSearchIcon && "rte-search-input__input--no-icon"
          )}
          value={value}
          onChange={onChange}
          {...props}
        />
        {showClearButton && hasValue && (
          <button
            type="button"
            className="rte-search-input__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <Icon size={16} name="Close" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export default SearchInput;

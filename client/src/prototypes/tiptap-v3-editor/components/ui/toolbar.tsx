import React, { HTMLProps, forwardRef } from "react";

import { cn } from "../../helpers/utils";

export type ToolbarProps = {
  dense?: boolean;
  vertical?: boolean;
} & HTMLProps<HTMLDivElement>;

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ children, dense, vertical = false, className, ...rest }, ref) => {
    const toolbarClassName = cn(
      "rte-toolbar",
      dense && "rte-toolbar--dense",
      vertical && "rte-toolbar--vertical",
      className
    );

    return (
      <div className={toolbarClassName} {...rest} ref={ref}>
        {children}
      </div>
    );
  }
);

Toolbar.displayName = "Toolbar";

export type ToolbarGroupProps = {
  className?: string;
  children: React.ReactNode;
} & HTMLProps<HTMLDivElement>;

const ToolbarGroup = forwardRef<HTMLDivElement, ToolbarGroupProps>(
  ({ className, ...rest }, ref) => {
    const groupClassName = cn("rte-toolbar__group", className);

    return <div className={groupClassName} role="group" ref={ref} {...rest} />;
  }
);

ToolbarGroup.displayName = "ToolbarGroup";

export type ToolbarDividerProps = {
  horizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

const ToolbarDivider = forwardRef<HTMLDivElement, ToolbarDividerProps>(
  ({ horizontal, className, ...rest }, ref) => {
    const dividerClassName = cn(
      "bg-neutral-200 dark:bg-neutral-800 rte-toolbar__divider",
      horizontal && "rte-toolbar__divider--horizontal",
      className
    );

    return <div className={dividerClassName} ref={ref} {...rest} />;
  }
);

ToolbarDivider.displayName = "Toolbar.Divider";

export { Toolbar, ToolbarGroup, ToolbarDivider };

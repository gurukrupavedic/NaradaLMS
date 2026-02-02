import React from "react";

import { cn } from "../../helpers/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  iconOnly?: boolean;
  block?: boolean;
  slotBefore?: React.ReactNode;
  slotAfter?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      type = "button",
      variant = "primary",
      iconOnly,
      block,
      slotBefore,
      slotAfter,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      "rte-button",
      `rte-button--${variant}`,
      iconOnly && "rte-button--icon-only",
      block && "rte-button--block",
      className
    );

    return (
      <button ref={ref} type={type} className={classes} {...props}>
        {!iconOnly && slotBefore}
        {children &&
          (iconOnly || (!slotAfter && !slotBefore) ? (
            children
          ) : (
            <span className="rte-button__text">{children}</span>
          ))}
        {!iconOnly && slotAfter}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;

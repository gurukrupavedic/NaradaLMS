import React, { type ReactNode, type JSX } from "react";

import { cn } from "../../helpers/utils";

interface LabelProps {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
  children: ReactNode;
  className?: string;
}

const Label = ({
  as: Comp = "label",
  children,
  className = "",
}: LabelProps) => {
  return <Comp className={cn("rte-label", className)}>{children}</Comp>;
};

export default Label;

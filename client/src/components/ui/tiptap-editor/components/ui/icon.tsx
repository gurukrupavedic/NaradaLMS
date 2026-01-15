import React from "react";

import { cn } from "../../helpers/utils";
import { icons, type IconBaseProps } from "../icons/icons";

export type IconProps = IconBaseProps & {
  name: keyof typeof icons;
};

export const Icon = ({ name, className, size = 20, ...props }: IconProps) => {
  const Comp = icons[name];

  return <Comp size={size} className={cn("rte-icon", className)} {...props} />;
};

export default Icon;

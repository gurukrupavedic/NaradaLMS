import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Export design system tokens path for apps to import
export const DESIGN_TOKENS_PATH = "./styles/tokens.css";

// Export UI Components
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/card";
export { Input, type InputProps } from "./components/input";

// Export Chameleon Theming
export {
    injectOrganizationTheme,
    getOrganizationTheme,
    organizationThemes,
    type OrganizationId
} from "./themes/organizations";

import type { ProficiencyStatus } from "@narada/types";

export function getProficiencyBadgeClasses(
  _level: number,
  status: ProficiencyStatus
): {
  bgColor: string;
  textColor: string;
  borderColor: string;
  darkBgColor: string;
  darkTextColor: string;
  darkBorderColor: string;
} {
  if (status === "absent") {
    return {
      bgColor: "bg-gray-200",
      textColor: "text-gray-700",
      borderColor: "border-gray-400",
      darkBgColor: "dark:bg-gray-700",
      darkTextColor: "dark:text-gray-300",
      darkBorderColor: "dark:border-gray-500",
    };
  }
  if (status === "not_started") {
    return {
      bgColor: "bg-gray-50",
      textColor: "text-gray-400",
      borderColor: "border-gray-200",
      darkBgColor: "dark:bg-gray-900",
      darkTextColor: "dark:text-gray-500",
      darkBorderColor: "dark:border-gray-700",
    };
  }
  switch (status) {
    case "practicing":
      return {
        bgColor: "bg-amber-50",
        textColor: "text-amber-900",
        borderColor: "border-amber-300",
        darkBgColor: "dark:bg-amber-900/30",
        darkTextColor: "dark:text-amber-200",
        darkBorderColor: "dark:border-amber-700",
      };
    case "level_1":
      return {
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-800",
        borderColor: "border-emerald-300",
        darkBgColor: "dark:bg-emerald-900/30",
        darkTextColor: "dark:text-emerald-200",
        darkBorderColor: "dark:border-emerald-700",
      };
    case "level_2":
      return {
        bgColor: "bg-green-500",
        textColor: "text-white",
        borderColor: "border-green-600",
        darkBgColor: "dark:bg-green-700",
        darkTextColor: "dark:text-white",
        darkBorderColor: "dark:border-green-800",
      };
    case "level_3":
      return {
        bgColor: "bg-violet-100",
        textColor: "text-violet-900",
        borderColor: "border-violet-300",
        darkBgColor: "dark:bg-violet-900/30",
        darkTextColor: "dark:text-violet-200",
        darkBorderColor: "dark:border-violet-700",
      };
    case "certified":
      return {
        bgColor: "bg-purple-600",
        textColor: "text-white",
        borderColor: "border-purple-700",
        darkBgColor: "dark:bg-purple-800",
        darkTextColor: "dark:text-white",
        darkBorderColor: "dark:border-purple-900",
      };
    default:
      return {
        bgColor: "bg-gray-50",
        textColor: "text-gray-600",
        borderColor: "border-gray-200",
        darkBgColor: "dark:bg-gray-900",
        darkTextColor: "dark:text-gray-400",
        darkBorderColor: "dark:border-gray-700",
      };
  }
}

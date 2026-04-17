import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Optional delay for faking network requests during dev
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

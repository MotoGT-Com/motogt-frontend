import { clsx, type ClassValue } from "clsx";
import type { MetaDescriptor } from "react-router";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function jsonToFormData(json: Record<string, any>) {
  const formData = new FormData();
  Object.entries(json).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

export function capitalizeWords(str: string) {
  return str
    .toLocaleLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export function stripNulls<T extends Record<string, any>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null)
  ) as {
    [K in keyof T]: null extends T[K] ? NonNullable<T[K]> | undefined : T[K];
  };
}

/**
 * Convert kebab-case URL slug to API enum format
 * @example slugToProductType("car-parts") => "car_parts"
 */
export function slugToProductType(slug: string): string {
  return slug.replace(/-/g, "_");
}

/**
 * Convert API enum format to kebab-case URL slug
 * @example productTypeToSlug("car_parts") => "car-parts"
 */
export function productTypeToSlug(type: string): string {
  return type.replace(/_/g, "-");
}

/**
 * Extract error message from API response error object
 * Handles various error structures from the OpenAPI client
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  
  // Handle Error instances
  if (error instanceof Error) {
    return error.message || fallback;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle object errors with various structures
  if (typeof error === 'object') {
    const errorObj = error as Record<string, any>;
    
    // Check for nested error.error.message pattern
    if (errorObj.error && typeof errorObj.error === 'object' && errorObj.error.message) {
      return errorObj.error.message;
    }
    
    // Check for error.message pattern
    if (errorObj.message) {
      return errorObj.message;
    }
    
    // Check for error.error string pattern
    if (errorObj.error && typeof errorObj.error === 'string') {
      return errorObj.error;
    }
  }
  
  return fallback;
}

/**
 * Format year range for car compatibility display
 * @example formatYearRange(2020, 2023) => "2020-2023"
 * @example formatYearRange(2020, null) => "2020-Present"
 * @example formatYearRange(2020, 2020) => "2020"
 */
export function formatYearRange(yearFrom: number | null, yearTo: number | null): string {
  if (!yearFrom) return "";
  if (!yearTo) return `${yearFrom}-Present`;
  if (yearFrom === yearTo) return `${yearFrom}`;
  return `${yearFrom}-${yearTo}`;
}

/**
 * Format product type for display
 * @example formatProductType("car_parts") => "Car Parts"
 */
export function formatProductType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const mergeMeta = <TMetaArgs extends {matches: any[]}>(
  args: TMetaArgs,
  descriptors: MetaDescriptor[],
): MetaDescriptor[] => {
  descriptors = [...descriptors]

  const isSimilar = (a: MetaDescriptor, b: MetaDescriptor, key: string) => {
    const keysAreEqual = key in a && key in b
    const valuesAreEqual = a[key as keyof typeof a] === b[key as keyof typeof b]

    return key === 'charSet' || key === 'title'
      ? keysAreEqual
      : keysAreEqual && valuesAreEqual
  }

  const processedMatches = args.matches.filter(Boolean).flatMap(_ => _.meta)

  processedMatches.reverse()

  for (const descriptor of processedMatches) {
    const foundSimilar = descriptors.some(
      _ =>
        isSimilar(_, descriptor, 'charSet')
        || isSimilar(_, descriptor, 'name')
        || isSimilar(_, descriptor, 'property')
        || isSimilar(_, descriptor, 'title'),
    )

    if (!foundSimilar) {
      descriptors.push(descriptor)
    }
  }

  return descriptors
}
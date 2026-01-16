/**
 * Address parsing and validation utility
 *
 * Per council recommendation: Use Zod for validation.
 * Supports both CLI flags and JSON file inputs for bulk orders.
 */

import { z } from "zod";
import type { ShippingAddress } from "../types/lulu-print.js";

// ISO 3166-1 alpha-2 country codes (common subset)
const COUNTRY_CODES = [
  "US",
  "CA",
  "GB",
  "AU",
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "AT",
  "CH",
  "SE",
  "NO",
  "DK",
  "FI",
  "IE",
  "PT",
  "PL",
  "CZ",
  "NZ",
  "JP",
  "SG",
  "HK",
  "MX",
  "BR",
  "IN",
] as const;

// US state codes
const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  "PR",
  "VI",
] as const;

// Canadian province codes
const CA_PROVINCE_CODES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
] as const;

/**
 * Zod schema for shipping address validation
 */
export const ShippingAddressSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(64, "Name must be 64 characters or less"),
    street1: z
      .string()
      .min(1, "Street address is required")
      .max(64, "Street address must be 64 characters or less"),
    street2: z
      .string()
      .max(64, "Street address 2 must be 64 characters or less")
      .optional(),
    city: z
      .string()
      .min(1, "City is required")
      .max(64, "City must be 64 characters or less"),
    state_code: z
      .string()
      .max(16, "State/Province code must be 16 characters or less")
      .optional(),
    postal_code: z
      .string()
      .min(1, "Postal code is required")
      .max(16, "Postal code must be 16 characters or less"),
    country_code: z
      .string()
      .length(2, "Country code must be 2 characters (ISO 3166-1 alpha-2)")
      .toUpperCase(),
    phone_number: z
      .string()
      .min(1, "Phone number is required")
      .max(32, "Phone number must be 32 characters or less")
      .regex(
        /^[+]?[\d\s\-().]+$/,
        "Phone number can only contain digits, spaces, and +()-.",
      ),
    email: z.string().email("Invalid email format").optional(),
    organization: z.string().max(64).optional(),
    is_business: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // US and CA require state_code
      if (["US", "CA"].includes(data.country_code) && !data.state_code) {
        return false;
      }
      return true;
    },
    {
      message: "State/Province code is required for US and CA addresses",
      path: ["state_code"],
    },
  )
  .refine(
    (data) => {
      // Validate US state codes
      if (
        data.country_code === "US" &&
        data.state_code &&
        !US_STATE_CODES.includes(data.state_code as any)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Invalid US state code",
      path: ["state_code"],
    },
  )
  .refine(
    (data) => {
      // Validate CA province codes
      if (
        data.country_code === "CA" &&
        data.state_code &&
        !CA_PROVINCE_CODES.includes(data.state_code as any)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Invalid Canadian province code",
      path: ["state_code"],
    },
  );

/**
 * CLI flags for address input
 */
export interface AddressFlags {
  name?: string;
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  organization?: string;
  business?: boolean;
}

/**
 * Parse CLI flags into ShippingAddress
 * @throws Error if validation fails
 */
export function parseAddressFlags(flags: AddressFlags): ShippingAddress {
  const rawAddress = {
    name: flags.name,
    street1: flags.street,
    street2: flags.street2,
    city: flags.city,
    state_code: flags.state?.toUpperCase(),
    postal_code: flags.zip,
    country_code: flags.country?.toUpperCase(),
    phone_number: flags.phone,
    email: flags.email,
    organization: flags.organization,
    is_business: flags.business,
  };

  return validateAddress(rawAddress);
}

/**
 * Parse JSON string into ShippingAddress
 * @throws Error if parsing or validation fails
 */
export function parseAddressJson(json: string): ShippingAddress {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON format for address");
  }

  return validateAddress(parsed);
}

/**
 * Validate address object against schema
 * @throws Error with detailed field errors if validation fails
 */
export function validateAddress(address: unknown): ShippingAddress {
  const result = ShippingAddressSchema.safeParse(address);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `${String(e.path?.join(".") || "unknown")}: ${e.message}`)
      .join("; ");
    throw new Error(`Address validation failed: ${errors}`);
  }

  return result.data as ShippingAddress;
}

/**
 * Format address for display
 */
export function formatAddress(address: ShippingAddress): string {
  const lines = [
    address.name,
    address.organization,
    address.street1,
    address.street2,
    [address.city, address.state_code, address.postal_code]
      .filter(Boolean)
      .join(", "),
    address.country_code,
  ].filter(Boolean);

  return lines.join("\n");
}

/**
 * Check if all required address fields are present in flags
 */
export function hasRequiredAddressFlags(flags: AddressFlags): boolean {
  return Boolean(
    flags.name &&
      flags.street &&
      flags.city &&
      flags.zip &&
      flags.country &&
      flags.phone,
  );
}

/**
 * Get missing required fields from flags
 */
export function getMissingAddressFields(flags: AddressFlags): string[] {
  const required = ["name", "street", "city", "zip", "country", "phone"];
  const missing: string[] = [];

  for (const field of required) {
    if (!flags[field as keyof AddressFlags]) {
      missing.push(field);
    }
  }

  // Check state for US/CA
  if (
    flags.country &&
    ["US", "CA"].includes(flags.country.toUpperCase()) &&
    !flags.state
  ) {
    missing.push("state");
  }

  return missing;
}

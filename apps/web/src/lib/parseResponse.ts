import { z } from "zod";

/** Validates untrusted API data without exposing response contents in errors. */
export function parseResponse<T extends z.ZodType>(
  schema: T,
  value: unknown,
  errorCode: string,
): z.output<T> {
  try {
    return schema.parse(value);
  } catch {
    throw new Error(errorCode);
  }
}

export const setupKeys = {
  preflight: ["system", "preflight"] as const,
  email: ["setup", "email"] as const,
  status: ["setup", "status"] as const,
  current: (subject: string | undefined) =>
    ["setup", subject, "current"] as const,
  operation: (subject: string | undefined, id: string) =>
    ["setup", subject, "operation", id] as const,
};

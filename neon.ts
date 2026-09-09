import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Managed Better Auth + Data API (verified against Neon Auth's JWTs).
  // The contacts table and its RLS policies are declared separately in
  // db/schema.sql — this file only provisions Neon services, not schema.
  auth: true,
  dataApi: true,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});

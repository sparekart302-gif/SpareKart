import { getAppUrl } from "../src/server/config/env.js";

// Test the redirect URI construction
console.log("Testing redirect URI construction...");
console.log("NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL);
console.log("Redirect URI:", getAppUrl("/api/auth/google/callback"));
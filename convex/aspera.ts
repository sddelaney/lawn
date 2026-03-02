"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { isAsperaEnabled } from "./hsts";

// Action (not query) because it reads env vars which require "use node"
export const isEnabled = action({
  args: {},
  returns: v.boolean(),
  handler: async () => {
    return isAsperaEnabled();
  },
});

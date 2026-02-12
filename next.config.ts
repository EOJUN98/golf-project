import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Re-enable strict mode (it's not the issue)
  reactStrictMode: true,
  // Always pin Turbopack root to this project directory (independent of shell cwd).
  turbopack: {
    root: configDir,
  },
};

export default nextConfig;

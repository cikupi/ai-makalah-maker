import type { NextConfig } from "next";

// Determine basePath for GitHub Pages when building in CI
// Prefer BASE_PATH env if provided (e.g., "/ai-makalah-maker")
// Fallback: derive from GITHUB_REPOSITORY ("owner/repo") => "/repo"
const repoFromCI = process.env.GITHUB_REPOSITORY?.split("/")[1];
const computedBasePath = process.env.BASE_PATH || (repoFromCI ? `/${repoFromCI}` : undefined);

const nextConfig: NextConfig = {
  // Enable static export for GitHub Pages
  output: "export",
  images: { unoptimized: true },
  // Only apply basePath/assetPrefix in CI (not during local dev)
  ...(computedBasePath
    ? {
        basePath: computedBasePath,
        assetPrefix: computedBasePath,
      }
    : {}),
};

export default nextConfig;

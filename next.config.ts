import type { NextConfig } from "next";

// Determine basePath for GitHub Pages when building in CI
// Prefer BASE_PATH env if provided (e.g., "/ai-makalah-maker")
// Fallback: derive from GITHUB_REPOSITORY ("owner/repo") => "/repo"
const repoFromCI = process.env.GITHUB_REPOSITORY?.split("/")[1];
const computedBasePath = process.env.BASE_PATH || (repoFromCI ? `/${repoFromCI}` : undefined);

const nextConfig: NextConfig = {
  // Enable static export ONLY for GitHub Pages builds
  ...(computedBasePath
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        basePath: computedBasePath,
        assetPrefix: computedBasePath,
      }
    : {}),
  // Ignore ESLint errors during production builds (e.g., on Vercel)
  // so that lint warnings/errors don't fail CI builds. Local dev can still lint.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

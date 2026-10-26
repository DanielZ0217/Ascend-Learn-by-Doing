import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default config;

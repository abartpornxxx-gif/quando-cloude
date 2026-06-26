import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // web-push usa moduli Node nativi (crypto, https) — non deve essere bundlato da webpack
  serverExternalPackages: ['web-push'],
};

export default nextConfig;

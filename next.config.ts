import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  // Utiliser webpack au lieu de Turbopack (meilleure compatibilité avec les jonctions)
  webpack: (config) => config,
};

export default nextConfig;

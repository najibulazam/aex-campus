import path from "node:path";
import type { NextConfig } from "next";

const projectRoot = process.env.npm_package_json
  ? path.dirname(process.env.npm_package_json)
  : process.cwd();

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: projectRoot,
  },
  webpack: (config, { dir }) => {
    config.resolve.modules = [
      path.join(dir, "node_modules"),
      ...(config.resolve.modules ?? []),
    ];
    return config;
  },
};

export default nextConfig;

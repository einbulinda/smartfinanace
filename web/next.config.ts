import type { NextConfig } from "next";
import path from "path";

// @tailwindcss/node builds its enhanced-resolve CSS resolver at module-load
// time using process.env.NODE_PATH.  In a monorepo, Next.js can detect the
// repo root as the workspace root and pass it as the resolution context, so
// the resolver only looks in <repo-root>/node_modules (which doesn't exist).
// Prepending this package's node_modules directory to NODE_PATH ensures every
// child/worker process inherits it and finds packages like 'tailwindcss'
// regardless of what context is used.
process.env.NODE_PATH = [
  path.resolve(__dirname, "node_modules"),
  ...(process.env.NODE_PATH
    ? process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
    : []),
].join(path.delimiter);

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  devIndicators: false,
};

export default nextConfig;

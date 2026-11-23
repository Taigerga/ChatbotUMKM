import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  experimental: {
    agentUpgrade: "security",
  },
}

export default nextConfig

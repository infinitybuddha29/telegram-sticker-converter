import type { NextConfig } from "next";

const MAX_UPLOAD_MB = parseInt(process.env["MAX_UPLOAD_SIZE_MB"] ?? "20", 10);

const nextConfig: NextConfig = {
  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: `${MAX_UPLOAD_MB}mb`,
    },
  },
};

export default nextConfig;

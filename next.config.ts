import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize packages with native binaries that can't be bundled
  serverExternalPackages: [
    '@morphllm/morphsdk',
    '@vscode/ripgrep',
  ],
};

export default nextConfig;

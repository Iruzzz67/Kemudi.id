import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled: React StrictMode's dev-only double-invoke of mount/unmount
  // effects breaks @react-three/rapier's RigidBody refs (they can end up
  // pointing at an already-freed Rapier handle), crashing the physics loop.
  reactStrictMode: false,
};

export default nextConfig;

import type { NextConfig } from "next";
import { networkInterfaces } from "os";

// Collect every non-internal IPv4 address on this machine so the dev server
// accepts requests from any device on the same LAN (Quest Browser, phones,
// tablets) without editing this file every time the laptop's IP changes.
function lanIpv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const nextConfig: NextConfig = {
  // Disabled: React StrictMode's dev-only double-invoke of mount/unmount
  // effects breaks @react-three/rapier's RigidBody refs (they can end up
  // pointing at an already-freed Rapier handle), crashing the physics loop.
  reactStrictMode: false,
  // Let the Meta Quest / other LAN devices load the dev server from their own
  // origin (http://<laptop-ip>:3000). Auto-detected — no manual IP edits.
  //
  // Note: WebXR itself still requires a SECURE context (HTTPS or localhost).
  // On a headset over LAN, either run `npm run dev:https` (self-signed cert,
  // accept the warning in Quest Browser) or use `adb reverse tcp:3000 tcp:3000`
  // and open http://localhost:3000 in Quest Browser.
  allowedDevOrigins: ["localhost", ...lanIpv4Addresses()],
};

export default nextConfig;

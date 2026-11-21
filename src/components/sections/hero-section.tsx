import { isLandingDemoEnabled, isWarRoomHeroEnabled } from "@/lib/warRoom/flags";
import { LandingHeroSection } from "./landing-hero-section";
import { WarRoomHeroSection } from "./war-room-hero-section";

export function HeroSection({
  forceLanding = false,
  fixture = false,
}: {
  forceLanding?: boolean;
  fixture?: boolean;
} = {}) {
  if (!forceLanding && isWarRoomHeroEnabled()) {
    return <WarRoomHeroSection fixture={fixture} />;
  }
  return <LandingHeroSection showDemo={isLandingDemoEnabled()} />;
}

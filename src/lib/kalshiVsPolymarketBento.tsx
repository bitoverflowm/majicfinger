import { FirstBentoAnimation } from "@/components/first-bento-animation";
import { FourthBentoAnimation } from "@/components/fourth-bento-animation";
import { SecondBentoAnimation } from "@/components/second-bento-animation";
import { ThirdBentoAnimation } from "@/components/third-bento-animation";
import type { BentoItem } from "@/lib/bento-section";
import { kalshiVsPolymarketLanding } from "@/lib/kalshiVsPolymarketLanding";

const visuals = [
  <FirstBentoAnimation key="search" />,
  <SecondBentoAnimation key="match" />,
  <ThirdBentoAnimation
    key="prices"
    data={[20, 30, 25, 45, 40, 55, 75]}
    toolTipValues={[1234, 1678, 2101, 2534, 2967, 3400, 3833, 4266, 4700, 5133]}
  />,
  <FourthBentoAnimation key="charts" once={false} />,
  <ThirdBentoAnimation
    key="activity"
    data={[18, 22, 28, 24, 36, 42, 58]}
    toolTipValues={[980, 1240, 1510, 1890, 2210, 2680, 3100, 3520, 4010, 4480]}
  />,
  <FourthBentoAnimation key="orderbooks" once={false} />,
];

export const kalshiVsPolymarketBentoItems: BentoItem[] =
  kalshiVsPolymarketLanding.bento.items.map((item, index) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    content: visuals[index] ?? visuals[index % visuals.length],
  }));

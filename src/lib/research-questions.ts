export type ResearchQuestionType =
  | "Research"
  | "Guide"
  | "Explainer"
  | "Dashboard";

export type ResearchQuestionStatus = "published" | "coming_soon";

export type ResearchQuestion = {
  question: string;
  href: string;
  status: ResearchQuestionStatus;
  type: ResearchQuestionType;
  badges: string[];
};

export const researchQuestions: ResearchQuestion[] = [
  {
    question: "Are 90% Kalshi political markets actually accurate?",
    href: "/guides/kalshi-political-prediction-market-accuracy",
    status: "published",
    type: "Research",
    badges: ["Kalshi Historical", "Calibration", "Research"],
  },
  {
    question: "When do political prediction markets become accurate?",
    href: "/guides/kalshi-historical-political-prediction-market-accuracy-lifecycle",
    status: "published",
    type: "Research",
    badges: ["Kalshi Historical", "Lifecycle", "Research"],
  },
  {
    question: "How accurate are Kalshi weather prediction markets?",
    href: "/guides/kalshi-weather-probability-calibration-chart",
    status: "published",
    type: "Research",
    badges: ["Kalshi Historical", "Weather", "Research"],
  },
  {
    question: "What does volume mean on Kalshi?",
    href: "/guides/what-does-volume-mean-on-kalshi",
    status: "published",
    type: "Explainer",
    badges: ["Kalshi Historical", "Volume", "Explainer"],
  },
  {
    question: "How do you get historical Kalshi data?",
    href: "/guides/kalshi-historical-data",
    status: "published",
    type: "Guide",
    badges: ["Kalshi Historical", "Data", "Guide"],
  },
  {
    question: "How do you chart Polymarket odds over time?",
    href: "/guides/polymarket-odds-over-time",
    status: "published",
    type: "Guide",
    badges: ["Polymarket Historical", "Charts", "Guide"],
  },
  {
    question: "Which Polymarket markets are moving fastest right now?",
    href: "#demo",
    status: "coming_soon",
    type: "Dashboard",
    badges: ["Polymarket Live", "Movers", "Dashboard"],
  },
  {
    question: "Can volume predict price movement before resolution?",
    href: "#demo",
    status: "coming_soon",
    type: "Research",
    badges: ["Historical Data", "Backtest", "Research"],
  },
  {
    question: "Which markets are stale, mispriced, or suddenly active?",
    href: "#demo",
    status: "coming_soon",
    type: "Dashboard",
    badges: ["Live Feeds", "Trader Dashboard"],
  },
  {
    question: "Where do Kalshi and Polymarket prices disagree?",
    href: "#demo",
    status: "coming_soon",
    type: "Research",
    badges: ["Cross-Market", "Arbitrage", "Research"],
  },
  {
    question: "Which markets changed after major news events?",
    href: "#demo",
    status: "coming_soon",
    type: "Research",
    badges: ["Twitter/X", "Live Feeds", "Research"],
  },
  {
    question: "Can you backtest a prediction market strategy without code?",
    href: "#demo",
    status: "coming_soon",
    type: "Research",
    badges: ["Historical Data", "Backtest", "Export"],
  },
];

export function getResearchQuestionCta(
  question: ResearchQuestion,
): string {
  if (question.status === "coming_soon") return "Coming soon →";

  switch (question.type) {
    case "Research":
      return "Read research →";
    case "Guide":
      return "Read guide →";
    case "Explainer":
      return "Read explainer →";
    case "Dashboard":
      return "Open dashboard →";
  }
}

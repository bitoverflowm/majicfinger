// Config for landing page v2 (MagicUI template)
export const landingPageV2Config = {
  name: "Lychee",
  description: "Your Quant in a Box. Built for Polymarket • Powerful for anyone who works with data. No CSVs, No Python, No copy-pasting. Just raw data to analysis and actionable insights. Real quantitative edge. 0 lines of code.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  keywords: ["PolyMarket", "quant", "Data Analysis", "Prediction Markets", "No-Code API", "Charts", "Data Visualization"],
  links: {
    email: "support@bitoverflow.org",
    twitter: "https://twitter.com/misterrpink1",
    discord: "#",
    github: "https://github.com",
    instagram: "#",
  },
  header: [
    {
      trigger: "Features",
      content: {
        main: {
          icon: null,
          title: "Chart Features",
          description: "Powerful chart creation and customization.",
          href: "#features",
        },
        items: [
          { href: "#features", title: "Multiple Chart Types", description: "Bar, line, pie, and more." },
          { href: "#features", title: "Easy Customization", description: "Customize colors, labels, and styles." },
          { href: "#features", title: "Export Options", description: "Export to PNG, SVG, and more." },
        ],
      },
    },
    {
      trigger: "Solutions",
      content: {
        items: [
          { title: "For Presentations", href: "#", description: "Create charts for your slides." },
          { title: "For Reports", href: "#", description: "Visualize data in reports." },
          { title: "For Dashboards", href: "#", description: "Build data dashboards." },
        ],
      },
    },
    { href: "/landingpage_v2#blog", label: "Blog" },
  ],
  pricing: [
    {
      name: "BASIC",
      href: "/login",
      price: "Free",
      period: "forever",
      yearlyPrice: "Free",
      features: ["3 Charts", "Basic Export", "Community Support"],
      description: "Perfect for getting started",
      buttonText: "Get Started",
      isPopular: false,
    },
    {
      name: "PRO",
      href: "/login",
      price: "$19",
      period: "month",
      yearlyPrice: "$16",
      features: ["Unlimited Charts", "All Export Formats", "Priority Support", "Custom Themes"],
      description: "Ideal for professionals",
      buttonText: "Subscribe",
      isPopular: true,
    },
    {
      name: "ENTERPRISE",
      href: "/login",
      price: "$49",
      period: "month",
      yearlyPrice: "$40",
      features: ["Everything in Pro", "Team Collaboration", "API Access", "Dedicated Support"],
      description: "For teams and organizations",
      buttonText: "Contact Sales",
      isPopular: false,
    },
  ],
  faqs: [
    { question: "What is Easy Charts?", answer: "Easy Charts is a platform that helps you create stunning charts effortlessly. No subscriptions for basic use, unlimited exports, and fully customizable." },
    { question: "How can I get started?", answer: "Sign up for a free account, choose a chart type, add your data, and export. It's that simple." },
    { question: "What chart types are supported?", answer: "We support bar charts, line charts, pie charts, area charts, and more. All built with shadcn/charts for beautiful, accessible visualizations." },
    { question: "Can I export my charts?", answer: "Yes! Export to PNG, SVG, and other formats. Pro users get access to all export options." },
  ],
  footer: [
    {
      title: "Product",
      links: [
        { href: "#features", text: "Features", icon: null },
        { href: "#pricing", text: "Pricing", icon: null },
        { href: "/dashboard", text: "Dashboard", icon: null },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "#", text: "About", icon: null },
        { href: "/landingpage_v2#blog", text: "Blog", icon: null },
        { href: "/help", text: "Help", icon: null },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "#", text: "Documentation", icon: null },
        { href: "#", text: "Contact", icon: null },
      ],
    },
  ],
};

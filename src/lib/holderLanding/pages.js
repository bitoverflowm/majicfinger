/**
 * Copy and structure for the three Holder Terminal landing pages. Every step is one chapter of a
 * guided walkthrough: the copy renders as HTML on the left, `panel` is the live terminal component
 * on the right, and `tips` annotate parts of it in order. A tip `target` is a CSS selector, or
 * `text:Label` for the element showing that exact label; the first that matches wins.
 *
 * `links` are step actions: `wallet` (the market's top holder on the wallet tracker), `market`
 * (the wallet's latest market on the holder page), `terminal` (the subject in the free terminal),
 * `page` (a fixed path) and `pickHolder` (top holders as buttons).
 */

export const HOLDER_PATHS = {
  flagship: "/polymarket-holder-terminal",
  market: "/polymarket-market-holders",
  wallet: "/polymarket-wallet-tracker",
  guide: "/guides/polymarket-top-holders",
};

const SKILL_SCORE_NOTE = {
  summary: "How the Lychee Skill Score works",
  body: "The score asks how surprising a wallet's results are if every price it paid was fair. It runs from −100 to 100, uses only markets the wallet has finished, and ±20 is a two-sigma outlier. Wallets without enough finished positions stay unscored.",
};

const FLAG_NOTE = {
  summary: "What the flags mean",
  body: "New wallet: the Polymarket profile is less than 30 days old. First trade ever: the wallet's first Polymarket trade was in this market. Holds both sides: the wallet holds shares of both outcomes.",
};

const NEWS_TIME_NOTE = {
  summary: "How news timestamps work",
  body: "Recent articles from Google News use their publication time. GDELT records when it first saw an article. Articles known only by date are marked “date only”.",
};

/* ------------------------------------------------------------------ */
/* Market steps, shared by the flagship and the market page.          */
/* ------------------------------------------------------------------ */

const PRICE_NEWS = {
  id: "market-trades-and-news",
  nav: "Price & news",
  title: "What was in the news as prices moved?",
  body: "Follow YES and NO prices alongside matching headlines. Select a news bar to read the stories from that period, and change the news keywords to follow the part of the story you care about.",
  notes: ["Controls: Edit news keywords · Zoom · Select a news bar"],
  details: NEWS_TIME_NOTE,
  panel: "priceChart",
  tips: [
    {
      target: '[aria-label="Market price with the news"]',
      title: "Both outcomes, one chart",
      body: "Each line is the price Polymarket shows for an outcome, from the day the market opened. While it's open, the line keeps extending live.",
      side: "top",
    },
    {
      target: ['[aria-label="Matching articles over time"]', '[aria-label="Headlines"]'],
      title: "News where it broke",
      body: "The bars count matching headlines over time. A burst of coverage beside a jump in the odds is the first place to look. Click a bar to zoom in.",
      side: "top",
    },
    {
      target: '[data-tour="news-terms"]',
      title: "Choose which stories count",
      body: "The keywords start from the market's title. Add or remove words and the headlines and bars re-run.",
      side: "bottom",
    },
  ],
};

const NEWS_FEED = {
  id: "market-news-feed",
  nav: "News feed",
  title: "Which headlines are coming in?",
  body: "Read the latest stories matching your keywords, newest first. Open the source, or select a story to see where it falls on the chart.",
  notes: ["Actions: Open article · Show on chart"],
  details: NEWS_TIME_NOTE,
  panel: "headlines",
  toast: "news",
  tips: [
    {
      target: '[data-tour="news-list"]',
      title: "Newest first",
      body: "Each headline shows when it came out, the publisher, and whether Google News or GDELT found it.",
      side: "top",
    },
    {
      target: '[aria-label="Show on the chart"]',
      title: "Show on chart",
      body: "Jump to the moment this story broke on the price chart, zoomed in on the hours around it.",
      side: "bottom",
    },
    {
      target: '[data-tour="news-terms"]',
      title: "Following your keywords",
      body: "The feed uses the same keywords as the chart, so changing them here changes both.",
      side: "bottom",
    },
  ],
};

const STATS = {
  id: "market-stats",
  nav: "Market stats",
  title: "How active is this market?",
  body: "Check the latest trade, the best bid and ask, and how much traded in the past 24 hours. Compare that with total volume and liquidity on the order book.",
  caption: "Volume measures completed trades. Liquidity shows what's on the book.",
  panel: "stats",
  tips: [
    { target: "text:Bid / ask", title: "Bid and ask", body: "The best prices buyers and sellers are quoting right now, which can differ from the last trade.", side: "bottom" },
    { target: "text:24h volume", title: "Activity today", body: "Dollars traded in the last 24 hours. Compare it with total volume to see if interest is building or fading.", side: "bottom" },
    { target: "text:Liquidity", title: "Depth of the book", body: "Dollars resting on the order book. It's what you could trade against now, not what has traded.", side: "top" },
  ],
};

const TRADES = {
  id: "market-live-trades",
  nav: "Live trades",
  title: "Who's buying and selling YES and NO?",
  body: "Watch fills arrive on each side. Each row shows the time, price, shares, and trade value. Open the trader once Polymarket confirms the wallet.",
  notes: ["Row action: Explore this wallet"],
  panel: "trades",
  toast: "trade",
  tips: [
    {
      target: ['[role="table"][aria-label$=" trades"]', '[aria-label="Trades"]'],
      title: "Every fill, as it happens",
      body: "New trades stream in at the top. The history underneath runs back to the market's first trade.",
      side: "top",
    },
    {
      target: ['[aria-label^="Open holder analysis for"]'],
      title: "Explore this wallet",
      body: "Once Polymarket confirms who made a trade, pick the trader to see everything they hold and how they've done.",
      side: "right",
    },
    {
      target: ['[aria-label^="Merge "]', '[aria-label^="Split "]'],
      title: "One list or two",
      body: "Merge both outcomes into one timeline, or keep YES and NO side by side.",
      side: "bottom",
    },
  ],
};

const HEATMAP = {
  id: "market-holder-heatmap",
  nav: "Holder heatmap",
  title: "How concentrated is each side?",
  body: "The largest tiles belong to the wallets holding the most shares. Switch to profit and loss, or highlight wallets that hold both outcomes.",
  notes: ["Action: Inspect this holder"],
  details: FLAG_NOTE,
  panel: "heatmap",
  links: [{ kind: "wallet", label: "Inspect the largest holder" }],
  tips: [
    {
      target: '[aria-label$="holder heatmap"]',
      title: "Area is ownership",
      body: "Each tile is one wallet, sized by its share of that outcome's supply. The grey tile groups everyone too small to draw.",
      side: "top",
    },
    {
      target: '[aria-label="Colour by"]',
      title: "Size or profit",
      body: "Colour by position size to see who dominates, or by profit and loss to see who's underwater.",
      side: "bottom",
    },
    {
      target: '[role="group"][aria-label="Flags"]',
      title: "Flags",
      body: "Outline new wallets, wallets whose first trade was here, and wallets holding both sides.",
      side: "bottom",
    },
  ],
};

const HOLDERS = {
  id: "market-top-holders",
  nav: "Top holders",
  title: "Who are the top holders in this Polymarket market?",
  body: "Compare YES and NO holders by shares held. See their leaderboard ranks and explore wallets flagged as new or holding both sides.",
  notes: ["Action: See this wallet's trades"],
  details: FLAG_NOTE,
  panel: "holders",
  links: [
    { kind: "wallet", label: "See the top holder's trades" },
    { kind: "page", href: HOLDER_PATHS.market, label: "Explore market holder analysis", flagshipOnly: true },
  ],
  tips: [
    {
      target: '[role="table"][aria-label$=" holders"]',
      title: "Largest positions first",
      body: "YES holders on the left, NO on the right. Positions re-value live with the price.",
      side: "top",
    },
    {
      target: "text:Leaderboard · Holder",
      title: "Leaderboard rank",
      body: "Each wallet's all-time PnL rank on Polymarket. Wallets that lost money show the loss in red instead.",
      side: "bottom",
    },
    {
      target: '[role="group"][aria-label="Flags"]',
      title: "Flags worth a look",
      body: "New wallets and wallets holding both sides are often the first ones to open.",
      side: "bottom",
    },
  ],
};

const SUPPLY = {
  id: "market-profit-and-ownership",
  nav: "Profit & ownership",
  title: "Which holders are above their entry price?",
  body: "Compare positions trading above and below their average cost. See the unrealized gains and losses alongside the share held by the largest wallet and the top ten on each side.",
  panel: "supply",
  tips: [
    {
      target: '[aria-label$=" supply"]',
      title: "Above and below entry",
      body: "Dollars in positions worth more than they cost, and dollars in positions worth less, with the gain or loss on each.",
      side: "top",
    },
    {
      target: '[aria-label$="ownership distribution"]',
      title: "How much the top wallets own",
      body: "The single largest holder, the next nine, and everyone else, as a share of the outcome's supply.",
      side: "top",
    },
  ],
};

const ENTRY = {
  id: "market-entry-prices",
  nav: "Entry prices",
  title: "What prices did current holders pay?",
  body: "Compare holders' average entry prices in one-cent bands. Switch between shares, current value, and cost. Positions without a recorded entry price are excluded from this chart.",
  notes: ["Controls: Shares · Value now · Cost"],
  panel: "entry",
  tips: [
    {
      target: '[aria-label="Entry price distribution"]',
      title: "Where the supply was bought",
      body: "Tall bars are price levels where a lot of shares changed hands. The dashed lines mark where each outcome trades now.",
      side: "top",
    },
    {
      target: '[aria-label="Measure"]',
      title: "Shares, value or cost",
      body: "Measure each band by shares, by what they're worth now, or by what was paid.",
      side: "bottom",
    },
  ],
};

const SCORES = {
  id: "market-holder-scores",
  nav: "Holder scores",
  title: "How do YES and NO holders compare by Lychee Skill Score?",
  body: "Compare historical scores among the largest holders, weighted by shares held. Check the share of supply scored on each side before interpreting the difference.",
  details: SKILL_SCORE_NOTE,
  panel: "scores",
  tips: [
    {
      target: '[aria-label="Holder score distribution"]',
      title: "Proven traders sit to the right",
      body: "Each curve spreads one side's supply across its holders' scores. A side carried by proven traders leans right.",
      side: "top",
    },
  ],
};

const CHOOSE = {
  id: "market-choose-a-wallet",
  nav: "Choose a wallet",
  title: "Which wallet do you want to investigate?",
  body: "Choose a holder to see its trades in this market, then explore its other positions.",
  panel: "pickHolder",
  links: [{ kind: "terminal", label: "Open this market in the free terminal" }],
  tips: [
    {
      target: '[data-tour="pick-holder"]',
      title: "Pick a holder",
      body: "The largest wallets on each side. Choose one to follow it into its own trades and results.",
      side: "top",
    },
  ],
};

/* Market page variants: the same panels, worded for ownership research. */

const MP_HOLDERS = {
  ...HOLDERS,
  title: "Who holds the largest positions?",
  body: "Compare YES and NO wallets by shares held. Use the flags to find new wallets, first trades, and holders on both sides.",
  notes: ["Action: Inspect this wallet"],
  links: [{ kind: "wallet", label: "Inspect the top holder on the wallet tracker" }],
};

const MP_HEATMAP = {
  ...HEATMAP,
  id: "market-ownership-map",
  nav: "Ownership map",
  title: "How much does one wallet own?",
  body: "Compare the largest holder with the next nine and the rest of the holders on each side. Select a tile to open the wallet behind it.",
  caption: "Tiles show up to 60 individual holders per outcome; smaller positions are grouped.",
  links: [{ kind: "wallet", label: "Open the largest wallet's trades" }],
};

const MP_SUPPLY = {
  ...SUPPLY,
  id: "market-gains-and-losses",
  nav: "Gains & losses",
  title: "How many holders are in profit at the current price?",
  body: "See how many positions are above or below average entry on each side. Compare their current value with their unrealized gains or losses.",
  links: [{ kind: "wallet", label: "Check the top holder's entry and PnL" }],
};

const MP_ENTRY = {
  ...ENTRY,
  title: "Where do holders' average entry prices cluster?",
  body: "Each bar groups current positions by the average price paid per share. Compare each band with the current price for that outcome. Positions without a recorded entry price are left out.",
};

const MP_SCORES = {
  ...SCORES,
  title: "Which side has the higher share-weighted score?",
  body: "Compare the Lychee Skill Scores of scored wallets among the top 60 holders on each side. Read the supply coverage alongside each aggregate.",
  links: [{ kind: "wallet", label: "See how the top holder scores" }],
};

const MP_TRADES = {
  ...TRADES,
  title: "What's trading in this market now?",
  body: "Inspect recent YES and NO fills as they arrive. Select a trader to see its activity in this market on the wallet tracker.",
  notes: ["Actions: View live trades · Explore this wallet"],
  links: [{ kind: "terminal", label: "Open this market in the free terminal" }],
};

/* ------------------------------------------------------------------ */
/* Wallet steps, shared by the flagship and the wallet page.          */
/* ------------------------------------------------------------------ */

const W_OVERVIEW = {
  id: "wallet-overview",
  nav: "Wallet overview",
  title: "How has this wallet performed?",
  body: "Review the wallet's portfolio value, realized P&L, and unrealized gains or losses, then its Lychee Skill Score across the markets it has finished.",
  details: SKILL_SCORE_NOTE,
  panel: "traderStats",
  tips: [
    { target: "text:Realized PnL", title: "Realized P&L", body: "Profit locked in by selling or settlement, all time. Unrealized P&L on open positions sits underneath.", side: "bottom" },
    { target: "text:Portfolio", title: "Still at stake", body: "What the wallet's open positions are worth now.", side: "bottom" },
    { target: '[aria-label="Lychee Skill Score"]', title: "Luck or skill?", body: "How surprising the wallet's finished results are if every price it paid was fair.", side: "top" },
  ],
};

const W_PNL_CHART = {
  id: "wallet-pnl-history",
  nav: "P&L history",
  title: "How did the P&L build over time?",
  body: "Follow the wallet's profit and loss from its first trade to now. Change the date range to inspect a stretch.",
  panel: "traderPnl",
  tips: [
    { target: '[aria-label="PnL chart"]', title: "The whole record", body: "Long climbs and sudden drops point to the markets worth opening next.", side: "top" },
  ],
};

const W_QUESTIONS = {
  id: "wallet-sources-of-pnl",
  nav: "Sources of P&L",
  title: "Which questions made or lost the most money?",
  body: "See gains and losses by market question. Each question combines the outcomes this wallet traded, including loaded finished bets and open positions at current prices.",
  panel: "traderQuestions",
  links: [{ kind: "market", label: "Explore the holders of this wallet's latest market" }],
  tips: [
    {
      target: '[aria-label^="Overall PnL by question"]',
      title: "Biggest wins and losses",
      body: "The five largest questions each get a slice; the rest share Other. Pick one to open the market.",
      side: "top",
    },
  ],
};

const W_POSITIONS = {
  id: "wallet-open-positions",
  nav: "Open positions",
  title: "What is this trader still holding?",
  body: "Compare the size, average entry price, current price, and unrealized P&L of active positions. Open a market to see how the position was built.",
  panel: "traderPositions",
  links: [{ kind: "market", label: "See who else holds this wallet's latest market" }],
  tips: [
    {
      target: '[role="table"][aria-label="Active positions"]',
      title: "Biggest first",
      body: "Prices and P&L refresh every 20 seconds, and again right after a new trade.",
      side: "top",
    },
  ],
};

const W_FINISHED = {
  id: "wallet-finished-bets",
  nav: "Finished bets",
  title: "How did the wallet finish ahead or fall behind?",
  body: "Compare wins and losses, return on cost, and the largest finished bets. Totals cover the finished bets loaded so far; older bets load as you scroll.",
  notes: ["Action: Compare winning and losing bets"],
  panel: "traderFinished",
  tips: [
    { target: '[role="group"][aria-label="Result"]', title: "Wins and losses", body: "Filter to the winners or the losers to compare how each was traded.", side: "bottom" },
    { target: '[role="table"][aria-label="Finished bets"]', title: "Every finished bet", body: "Sold out of, or resolved. An amber dot marks winnings not yet redeemed.", side: "top" },
  ],
};

const W_PATTERNS = {
  id: "wallet-trading-patterns",
  nav: "Trading patterns",
  title: "Where did the trader's results differ?",
  body: "Compare P&L by category, group results by day of week, month, quarter, or year, and see how return varied with holding duration.",
  panel: "traderPatterns",
  tips: [
    { target: "text:PnL by category", title: "By category", body: "Each finished bet counted under its event's broad category.", side: "bottom" },
    { target: '[aria-label="Group PnL by"]', title: "By when bets finished", body: "Group P&L by day of week, month, quarter, or year, in your time zone.", side: "bottom" },
    { target: "text:Edge by holding duration", title: "Does the edge fade?", body: "Return on cost for bets held minutes, days, or months.", side: "top" },
  ],
};

const W_TRADES = {
  id: "wallet-latest-trades",
  nav: "Latest trades",
  title: "What has this wallet traded recently?",
  body: "Filter buys and sells. Each row shows the market, outcome, price, shares, and value. Keep the tab open for new-trade alerts.",
  notes: ["Actions: Open market · Pause alerts"],
  panel: "traderTrades",
  toast: "trader",
  links: [{ kind: "market", label: "Explore the holders of the latest market traded" }],
  tips: [
    { target: '[role="table"][aria-label="Trades"]', title: "Newest first", body: "Checked every 10 seconds. New trades slide in at the top and raise an alert while you're here.", side: "top" },
    { target: '[role="group"][aria-label="Side"]', title: "Buys or sells", body: "Show only buys, only sells, or both.", side: "bottom" },
  ],
};

const W_FOCUS = {
  id: "wallet-trades-and-news",
  nav: "Trades & news",
  title: "When did the wallet trade this market?",
  body: "Pin a buy or sell to inspect its size and price. Compare the move with matching headlines before and after it. Edit the news terms or zoom out to see the whole market.",
  notes: ["Controls: Pick a market · Zoom · Pin a move"],
  panel: "traderFocus",
  tips: [
    {
      target: '[aria-label="Market price with this trader\'s moves"]',
      title: "Every move on the price",
      body: "Filled dots are buys, hollow dots are sells, and bigger dots mean more money. Click one to pin its details.",
      side: "top",
    },
    {
      target: '[aria-label="Markets this trader has traded"]',
      title: "Pick a market",
      body: "Every market this wallet has traded, ready to chart.",
      side: "bottom",
    },
    {
      target: '[aria-label="Chart range"]',
      title: "Around their moves, or the whole market",
      body: "Zoom to the stretch where this wallet traded, or out to the market's whole life.",
      side: "bottom",
    },
  ],
};

const W_REALIZED = {
  id: "wallet-realized-pnl",
  nav: "Realized P&L",
  title: "How much P&L did the wallet realize here?",
  body: "Follow each sale, merge, or settlement that changed realized P&L in this market, beside the price and the wallet's moves.",
  panel: "traderFocus",
  links: [
    { kind: "terminal", label: "Open this trader in the free terminal" },
    { kind: "market", label: "Explore holders in this market" },
  ],
  tips: [
    {
      target: '[aria-label="Cumulative realized PnL"]',
      title: "Realized, step by step",
      body: "Each step is a sale, merge or settlement that locked in a gain or loss in this market.",
      side: "top",
    },
  ],
};

const FLAGSHIP_W_OVERVIEW = {
  ...W_OVERVIEW,
  title: "Where did this Polymarket trader make their money?",
  body: "Compare realized P&L with the gain or loss on open positions, then see how the Lychee Skill Score rates the wallet's finished bets.",
};

const FLAGSHIP_W_QUESTIONS = {
  ...W_QUESTIONS,
  title: "Which markets drove the gains and losses?",
  body: "Explore results by question. Open a market to examine how the trader built the position.",
};

const FLAGSHIP_W_FOCUS = {
  ...W_FOCUS,
  title: "When did this wallet buy or sell?",
  body: "Pin a move to see its size and price. Compare it with nearby headlines, then switch to the whole market for context.",
};

const FLAGSHIP_W_POSITIONS = {
  ...W_POSITIONS,
  body: "Compare the shares remaining, their average cost, and their current value.",
};

const FLAGSHIP_W_FINISHED = {
  ...W_FINISHED,
  title: "How did the finished bets perform?",
  body: "Review wins, losses, and return on cost across the finished positions loaded.",
  links: [
    { kind: "page", href: HOLDER_PATHS.wallet, label: "Explore the full wallet analysis", withWallet: true },
    { kind: "terminal", label: "Open this trader in the free terminal" },
  ],
};

/* ------------------------------------------------------------------ */
/* Pages                                                              */
/* ------------------------------------------------------------------ */

export const HOLDER_LANDING_PAGES = {
  flagship: {
    key: "flagship",
    path: HOLDER_PATHS.flagship,
    navLabel: "Holder Terminal",
    seo: {
      title: "Polymarket Tracker for Markets & Traders | Lychee Holder Terminal",
      description:
        "Explore Polymarket markets and traders in Lychee Holder Terminal. Compare prices with news, see who holds YES and NO, and trace a wallet's gains and losses.",
      ogTitle: "Explore Polymarket markets and traders in Lychee Holder Terminal",
      ogDescription: "Start with a market or a wallet. See the trades, headlines, and positions behind the numbers.",
      ogImage: "/og/polymarket-holder-terminal.png",
      ogImageAlt: "YES and NO prices with matching news headlines in Lychee Holder Terminal.",
    },
    hero: {
      label: "Lychee Holder Terminal",
      title: "The Ultimate Trader Intelligence Terminal for Polymarket",
      description:
        "Pick a market to see its trades, headlines, and largest holders. Or start with a trader to see which positions made or lost them money.",
      scopes: ["markets", "traders"],
      browse: ["markets", "holders"],
      exampleAction: "Take the guided tour",
      exampleTarget: "market-path",
      points: ["Every trade as it happens", "Who holds YES and NO, and what they paid", "Headlines lined up against the price"],
    },
    cta: {
      title: "See who's behind the price on any Polymarket market.",
      body: "Open any market or wallet in the free terminal, with every panel from this page, live.",
    },
    chapters: [
      {
        id: "market-path",
        kind: "market",
        label: "Start with a market",
        summary:
          "Follow one market from its price and headlines to the wallets behind it: live trades, who holds YES and NO, what they paid, and whether proven traders are on each side.",
        steps: [PRICE_NEWS, NEWS_FEED, STATS, TRADES, HEATMAP, HOLDERS, SUPPLY, ENTRY, SCORES, CHOOSE],
      },
      {
        id: "trader-path",
        kind: "trader",
        label: "Start with a trader",
        summary:
          "Follow one wallet from its overall record to the questions that made or lost it money, every move it made in a market, what it still holds, and how its finished bets ended.",
        steps: [FLAGSHIP_W_OVERVIEW, FLAGSHIP_W_QUESTIONS, FLAGSHIP_W_FOCUS, FLAGSHIP_W_POSITIONS, FLAGSHIP_W_FINISHED],
      },
    ],
    faq: [
      {
        question: "Can I start without a wallet address?",
        answer: "Yes. Browse markets by topic or activity, or open Browse Holders to choose a trader by P&L, volume, or biggest win.",
      },
      {
        question: "Can I try Holder Terminal for free?",
        answer: "Yes. Open the free terminal to explore any market or trader, with the same panels you see on this page.",
      },
      {
        question: "How do news timestamps work?",
        answer: "Recent articles from Google News use publication times. GDELT records when it first saw an article. Open the source to read the story in context.",
      },
    ],
    related: [
      { href: HOLDER_PATHS.market, title: "Polymarket top holders by market", description: "Who holds YES and NO, what they paid, and how concentrated each side is." },
      { href: HOLDER_PATHS.wallet, title: "Polymarket wallet tracker", description: "A trader's open positions, finished bets, and where the P&L came from." },
      { href: HOLDER_PATHS.guide, title: "How to find Polymarket's top holders", description: "A step-by-step guide to comparing YES and NO holders." },
    ],
  },

  market: {
    key: "market",
    path: HOLDER_PATHS.market,
    navLabel: "Market holders",
    seo: {
      title: "Polymarket Top Holders by Market | Lychee Holder Terminal",
      description:
        "Look up a Polymarket market to compare its largest YES and NO holders, ownership concentration, average entry prices, and unrealized gains and losses.",
      ogTitle: "Who holds YES and NO on Polymarket?",
      ogDescription: "Open a market to compare its largest wallets, inspect entry prices, and see who holds both sides.",
      ogImage: "/og/polymarket-market-holders.png",
      ogImageAlt: "Largest YES and NO wallets sized by shares held in a Polymarket market.",
    },
    hero: {
      label: "Lychee Holder Terminal",
      title: "Who holds the most YES and NO shares?",
      description:
        "Look up a Polymarket market. Compare the largest positions on each side, see what holders paid, and open any listed wallet to investigate its trades.",
      scopes: ["markets"],
      browse: ["markets"],
      exampleAction: "Take the guided tour",
      exampleTarget: "market-top-holders",
      crossLink: { href: HOLDER_PATHS.wallet, lead: "Have a trader in mind?", label: "Look up a wallet." },
      points: ["The largest wallets on both sides", "What holders paid, and who's underwater", "Skill Scores for the wallets behind each side"],
    },
    cta: {
      title: "See who holds any Polymarket market.",
      body: "Open any market in the free terminal to compare its YES and NO holders, live.",
    },
    chapters: [
      {
        id: "market-path",
        kind: "market",
        label: "Holders",
        summary: "Who holds each side, how concentrated it is, what holders paid, and whether proven traders are on YES or NO.",
        steps: [MP_HOLDERS, MP_HEATMAP, MP_SUPPLY, MP_ENTRY, MP_SCORES, MP_TRADES, STATS, PRICE_NEWS, NEWS_FEED],
      },
    ],
    faq: [
      {
        question: "Can a wallet hold both YES and NO?",
        answer: "Yes. The “Holds Yes and No” flag identifies wallets with positions on both sides. Open the wallet to examine the sequence of trades.",
      },
      {
        question: "What does the holder heatmap show?",
        answer: "Tile area shows a wallet's share of that outcome's supply. Colour the tiles by position size or by profit and loss, and outline flagged wallets.",
      },
      {
        question: "Where can I learn to interpret top holders?",
        answer: "Follow the step-by-step guide to comparing YES and NO holders, reading concentration, and investigating a wallet: How to find Polymarket's top holders.",
        href: HOLDER_PATHS.guide,
      },
    ],
    related: [
      { href: HOLDER_PATHS.flagship, title: "Lychee Holder Terminal", description: "Markets and traders together, from price and news to the wallets behind them." },
      { href: HOLDER_PATHS.wallet, title: "Polymarket wallet tracker", description: "Open any holder to see its positions, finished bets, and P&L." },
      { href: HOLDER_PATHS.guide, title: "How to find Polymarket's top holders", description: "Compare YES and NO holders, read concentration, and investigate a wallet." },
    ],
  },

  wallet: {
    key: "wallet",
    path: HOLDER_PATHS.wallet,
    navLabel: "Wallet tracker",
    seo: {
      title: "Polymarket Wallet Tracker & Trader P&L | Lychee Holder Terminal",
      description:
        "Explore a Polymarket trader's open positions, finished bets, and P&L. See which markets drove returns and inspect wallet trades alongside prices and news.",
      ogTitle: "Where did this Polymarket trader make their money?",
      ogDescription: "Follow a wallet from its overall record to the trades, prices, and headlines in one market.",
      ogImage: "/og/polymarket-wallet-tracker.png",
      ogImageAlt: "A Polymarket wallet's trades plotted against outcome prices and news coverage.",
    },
    hero: {
      label: "Lychee Holder Terminal",
      title: "Where did this Polymarket trader make their money?",
      description:
        "Look up a trader to see what they still hold, which bets they've finished, and which markets account for their gains and losses.",
      scopes: ["traders"],
      browse: ["holders"],
      browseHelper: "Choose a category and period. Rank traders by P&L or volume, or explore the biggest single wins.",
      exampleAction: "Take the guided tour",
      exampleTarget: "trader-path",
      crossLink: { href: HOLDER_PATHS.market, lead: "Starting with a market?", label: "Explore its holders." },
      points: ["Realized and open P&L", "Every buy and sell on the price chart", "Alerts on new trades while you watch"],
    },
    cta: {
      title: "Track any Polymarket wallet.",
      body: "Open any trader in the free terminal to follow their positions, P&L, and new trades, live.",
    },
    chapters: [
      {
        id: "trader-path",
        kind: "trader",
        label: "Wallet",
        summary: "A wallet's record, where its P&L came from, what it holds, how its bets ended, and every move it made in a market.",
        steps: [W_OVERVIEW, W_PNL_CHART, W_QUESTIONS, W_POSITIONS, W_FINISHED, W_PATTERNS, W_TRADES, W_FOCUS, W_REALIZED],
      },
    ],
    faq: [
      {
        question: "How do I find a trader without an address?",
        answer: "Use Browse Holders to select a category, time period, and ranking. Choose a trader to open the wallet.",
      },
      {
        question: "How can a wallet realize a gain without selling?",
        answer: "Shares held through settlement can realize a gain or loss. The market-specific chart also records realized P&L from sales and merges.",
      },
      {
        question: "How often do wallet trades and positions refresh?",
        answer: "The wallet Trades panel checks for new trades every 10 seconds and raises alerts while the tab is open. Active positions refresh every 20 seconds and after a new trade.",
      },
      {
        question: "What does return on cost measure?",
        answer: "In Finished bets, it expresses P&L as a percentage of the cost of the positions included in that view.",
      },
    ],
    related: [
      { href: HOLDER_PATHS.flagship, title: "Lychee Holder Terminal", description: "Markets and traders together, from price and news to the wallets behind them." },
      { href: HOLDER_PATHS.market, title: "Polymarket top holders by market", description: "Who holds YES and NO in any market, and what they paid." },
    ],
  },
};

export const HOLDER_BROWSE_HELPERS = {
  markets: "Explore trending, newly listed, or recently closed markets. Choose a category or browse by volume and liquidity.",
  holders: "Browse top traders by P&L or volume. Choose a category and period, or explore the biggest single wins.",
};

export const HOLDER_SEARCH_COPY = {
  labels: { markets: "Search markets", traders: "Search traders" },
  placeholders: {
    markets: "Search a market, event, or series, or paste a Polymarket link",
    traders: "Search a Polymarket trader by username, or paste a wallet address",
  },
};

/** The free terminal opened on `subject`; `/dashboard` reads these and opens a Holder Terminal tab. */
export function holderTerminalHref(subject) {
  const params = new URLSearchParams({ terminal: "holder" });
  if (subject?.kind === "market" && subject.conditionId) params.set("market", subject.conditionId);
  if (subject?.kind === "trader" && subject.address) params.set("wallet", subject.address);
  if (subject?.title) params.set("title", subject.title);
  return `/dashboard?${params}`;
}

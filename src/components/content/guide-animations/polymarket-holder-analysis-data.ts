/**
 * A real Polymarket Holder Analysis run on "Will the Democratic Party control the House after the
 * 2026 Midterm elections?", pulled Nov 4, 2026. Shares, flags, ages, positions, activity, and PnL are
 * as Polymarket returned them; labels are trimmed to fit the mock blocks.
 */

export const HA_MARKET = {
  title: "Will the Democratic Party control the House after the 2026 Midterm elections?",
  subtitle: "Which party will win the House in 2026?",
  slug: "will-the-democratic-party-control-the-house-after-the-2026-midterm-elections",
  yes: "100¢",
  no: "No 0.1¢",
  volume: "$37.3M",
  volume24h: "$12.1M in 24h",
};

export const HA_QUERY = "Democratic Party control the House 2026";

export const HA_RESULTS = [
  { title: HA_MARKET.title, subtitle: HA_MARKET.subtitle, meta: "$37.3M vol · closes Nov 4, 2026", status: "Open" as const },
  { title: "Will the Republican Party control the House after the 2026 Midterm elections?", subtitle: HA_MARKET.subtitle, meta: "$25.9M vol · closes Nov 4, 2026", status: "Closed" as const },
  {
    title: "Will the Democratic Party win the popular vote in the 2026 U.S. House midterm elections by between 10% and 12%?",
    subtitle: "2026 Midterms: House Popular Vote Margin of Victory",
    meta: "$34.6K vol · closes Nov 4, 2026",
    status: "Open" as const,
  },
  {
    title: "Will the Democratic Party win the popular vote in the 2026 U.S. House midterm elections by between 12% and 14%?",
    subtitle: "2026 Midterms: House Popular Vote Margin of Victory",
    meta: "$33.4K vol · closes Nov 4, 2026",
    status: "Open" as const,
  },
];

/** [label, shares, holds both sides, age in days or null when Polymarket has no profile]. */
export type HolderTile = [label: string, shares: number, both: 0 | 1, age: number | null];

export type HolderSide = {
  outcome: "Yes" | "No";
  count: number;
  topTen: string;
  bothCount: number;
  newCount: number;
  /** Shares held by the holders past the 40 named tiles. */
  rest: number;
  tiles: HolderTile[];
};

export const HA_YES: HolderSide = {
  outcome: "Yes",
  count: 300,
  topTen: "43%",
  bothCount: 6,
  newCount: 26,
  rest: 4786840,
  tiles: [
    ["ndb1", 1640000, 0, 223],
    ["033033033", 1424600, 0, 727],
    ["elmcap2", 1312311, 0, 1284],
    ["plumbis", 447600, 0, 117],
    ["lfg321", 433177, 0, 800],
    ["GroyperFinance", 422687, 0, 188],
    ["f2hf84hg52h5", 409000, 0, 342],
    ["Rowdy-Evening-Universe", 381086, 0, 125],
    ["Serene-Decision", 300000, 0, 278],
    ["BABELCONSTEL", 298928, 0, 392],
    ["PolBandit", 269870, 0, 334],
    ["Warlike-Horn", 265000, 0, 485],
    ["machbut", 259064, 0, 968],
    ["burrito338", 253740, 0, 757],
    ["Car", 221483, 0, 999],
    ["okcoolstorybro", 219497, 0, 1586],
    ["scottilicious", 210490, 0, 2169],
    ["gaven-willwin", 203866, 0, 636],
    ["tsekinming01", 203581, 0, 2172],
    ["SAPolitcsSeer", 176697, 0, 221],
    ["Elastic-Universe", 174000, 0, 844],
    ["BuddhaYTorrance", 171750, 0, 538],
    ["BISBluevine", 151509, 0, 2169],
    ["bondor", 149761, 0, 210],
    ["kgvdotcom", 147052, 0, 810],
    ["DavidxDavid", 142400, 0, 12],
    ["arjennnnn", 142000, 0, 730],
    ["wokerjoesleeper", 119974, 0, 751],
    ["Vvv", 117011, 0, 969],
    ["End123", 111482, 0, 411],
    ["JSG3", 110000, 0, 49],
    ["Well-Lit-Space", 108900, 0, 11],
    ["TheReturnOfDarthMaul", 105000, 0, 267],
    ["FlyingPlaty", 101855, 0, 771],
    ["KnightDasCapital", 100000, 0, 340],
    ["b4k9xj2wh", 100000, 0, 730],
    ["Malfunction.", 92759, 0, 704],
    ["hideo", 91477, 0, 835],
    ["i66666688888888", 81417, 0, 2],
    ["0xheavy888", 80834, 0, 813],
  ],
};

export const HA_NO: HolderSide = {
  outcome: "No",
  count: 300,
  topTen: "82%",
  bothCount: 6,
  newCount: 29,
  rest: 1018108,
  tiles: [
    ["0xa5ef…2966", 4226858, 0, null],
    ["BreakTheBank", 3736732, 0, 285],
    ["QQQ777", 1416153, 0, 2175],
    ["0x7B7ab681a5733…", 1305684, 0, 40],
    ["mooseborzoi", 1113105, 0, 193],
    ["happy7ucker1", 873126, 0, 0],
    ["ForesightOracle", 776028, 0, 681],
    ["bullishkirby", 452654, 0, 177],
    ["hellothereworld", 383576, 0, 2],
    ["Carefree-Significance", 219388, 0, 170],
    ["Outsid3rTrading", 170000, 0, 718],
    ["Failing-Flesh", 154249, 0, 302],
    ["Known-Icing", 132664, 0, 207],
    ["ChiCozCapital", 130000, 0, 860],
    ["ackie", 114977, 0, 881],
    ["Humble", 103105, 0, 994],
    ["Imperfect-Beetle", 100000, 0, 818],
    ["Libratus007", 95733, 0, 141],
    ["alexhamilton", 93494, 0, 142],
    ["YoshiYamamoto", 78183, 1, 727],
    ["mastm", 77595, 0, 49],
    ["Mammoth-Oval-Tortilla", 75884, 0, 0],
    ["tiburon", 72928, 0, 732],
    ["0xa0f2…1848", 71730, 0, null],
    ["NicolasBoy", 70065, 0, 758],
    ["sabghm", 70000, 0, 1],
    ["Nickertron", 62157, 0, 36],
    ["11122", 53719, 0, 723],
    ["jpz6311whu", 52266, 0, 1],
    ["Thirsty-Terrace", 48025, 0, 665],
    ["cowcat", 46818, 0, 936],
    ["0xc4f8…8a4a", 45205, 0, 1496],
    ["CucCu", 42211, 0, 772],
    ["baran-ludoman", 40000, 0, 345],
    ["xjp12580", 35330, 0, 1480],
    ["nanshen", 31240, 0, 782],
    ["thiaoouba", 30549, 0, 1],
    ["Trumped100000", 30392, 0, 162],
    ["0x036d…53d0", 30099, 0, null],
    ["llllllllllll", 30000, 1, 2],
  ],
};

/** The first ten rows of each holder sheet, as the run placed them. */
export type HolderRow = {
  name: string;
  shares: string;
  pct: string;
  value: string;
  avg: string;
  pnl: string;
  both: boolean;
  fresh: boolean;
  age: string;
  created: string;
  wallet: string;
};

const row = (name: string, shares: string, pct: string, value: string, avg: string, pnl: string, age: number | null, created: string, wallet: string): HolderRow => ({
  name,
  shares,
  pct,
  value,
  avg,
  pnl,
  both: false,
  fresh: age != null && age < 30,
  age: age == null ? "" : age.toLocaleString("en-US"),
  created,
  wallet,
});

export const HA_YES_ROWS: HolderRow[] = [
  row("ndb1", "1.6M", "9.92", "1.6M", "0.9401", "40.2K", 223, "3/26/2026", "0xfea31bc0…d227"),
  row("033033033", "1.4M", "8.62", "1.4M", "0.9989", "824.24", 727, "11/7/2024", "0xd1c76931…1d2b"),
  row("elmcap2", "1.3M", "7.94", "1.3M", "0.9539", "59.7K", 1284, "4/29/2023", "0xed107a85…d2e5"),
  row("plumbis", "447.6K", "2.71", "447.4K", "0.9362", "28.9K", 117, "7/9/2026", "0x77fbd6bd…266c"),
  row("lfg321", "433.2K", "2.62", "433K", "0.949", "22.3K", 800, "8/26/2024", "0x7e97bd09…4d54"),
  row("GroyperFinance", "422.7K", "2.56", "422.5K", "0.999", "46.3K", 188, "4/30/2026", "0xfcd0eadb…391d"),
  row("f2hf84hg52h5", "409K", "2.47", "408.8K", "0.9519", "20.2K", 342, "11/27/2025", "0x4b2995b6…716f"),
  row("Rowdy-Evening-Universe", "381.1K", "2.3", "380.9K", "0.9518", "18.9K", 125, "7/2/2026", "0x690bfe39…bd2c"),
  row("Serene-Decision", "300K", "1.81", "299.9K", "0.9457", "17.7K", 278, "1/30/2026", "0x8b4bca1d…541b"),
  row("BABELCONSTEL", "298.9K", "1.81", "298.8K", "0.9817", "6.4K", 392, "10/8/2025", "0xfa21179f…1438"),
];

export const HA_NO_ROWS: HolderRow[] = [
  row("0xa5ef…2966", "4.2M", "23.87", "4.2K", "0", "2.1K", null, "", "0xa5ef39c3…2966"),
  row("BreakTheBank", "3.7M", "21.1", "3.7K", "0.0676", "-250.4K", 285, "1/23/2026", "0xf0318c32…c80c"),
  row("QQQ777", "1.4M", "8", "1.4K", "0.0896", "-123.4K", 2175, "11/20/2020", "0x7f2de588…39a8"),
  row("0x7B7ab681a5733…", "1.3M", "7.37", "1.3K", "0.0228", "-28K", 40, "9/25/2026", "0x7b7ab681…9bdb"),
  row("mooseborzoi", "1.1M", "6.29", "1.1K", "0.0765", "-81.4K", 193, "4/24/2026", "0x84cfffc3…2f63"),
  row("happy7ucker1", "873.1K", "4.93", "873.13", "0.0012", "-574.28", 0, "11/4/2026", "0x809a8a7d…ea6e"),
  row("ForesightOracle", "776K", "4.38", "776.03", "0.05", "-161.2K", 681, "12/23/2024", "0x7072dd52…3413"),
  row("bullishkirby", "452.7K", "2.56", "452.65", "0.0998", "-44.9K", 177, "5/11/2026", "0x515e2144…8309"),
  row("hellothereworld", "383.6K", "2.17", "383.58", "0.0622", "-22.8K", 2, "11/2/2026", "0x164eae1c…b0a5"),
  row("Carefree-Significance", "219.4K", "1.24", "219.39", "0.0444", "-9.6K", 170, "5/17/2026", "0x99f0d31f…9495"),
];

export const HA_TRADERS = ["ndb1", "033033033", "elmcap2", "plumbis", "lfg321"] as const;

/** [market, outcome, current value in USDC, unrealized PnL in USDC]. */
export type TraderPosition = [market: string, outcome: string, value: number, upnl: number];

export type TraderTab = {
  name: string;
  positions: TraderPosition[];
  /** Position PnL in thousands of USDC, oldest first. */
  pnl: number[];
};

const HOUSE = "Will the Democratic Party control the House…";

export const HA_TRADER_TABS: TraderTab[] = [
  {
    name: "ndb1",
    positions: [
      ["2026 Balance of Power: D Senate, D House", "Yes", 4354154, 3038258],
      [HOUSE, "Yes", 1639180, 97433],
      ["2026 Balance of Power: R Senate, R House", "No", 999500, 59500],
      ["Will Manchester City win the 2026-27 EPL?", "No", 334653, 70288],
      ["Bitcoin all time high by December 31, 2026?", "No", 87186, 10036],
      ["Will Bitcoin hit $150k by December 31, 2026?", "No", 84992, 7593],
      ["Will Barcelona win the 2026-27 Champions League?", "No", 82806, -985],
      ["Will Barcelona win the 2026-27 LALIGA?", "Yes", 62333, 455],
    ],
    pnl: [0, -342, 120, 322, 348, 901, 1023, 945, 997, 789, 841, 793, 777, 1705, 1378, 2789, 2792, 2815, 2947, 2568, 2830, 2859, 3130, 3256, 3243, 3143, 3264, 3685, 4707],
  },
  {
    name: "033033033",
    positions: [
      [HOUSE, "Yes", 1423888, 824],
      ["Strait of Hormuz traffic returns to normal by Oct…", "No", 832169, 450],
      ["2026 Balance of Power: R Senate, R House", "No", 401647, 206],
      ["US x Iran ceasefire continues through October 31", "Yes", 173005, 280],
      ["Will Bitcoin reach $1,000,000 by December 31?", "No", 163590, -161],
      ["US x Iran ceasefire continues through November", "Yes", 75156, 195],
      ["Will Trump say \"Burger\" in October?", "No", 46580, 33],
      ["Will Vivek Ramaswamy pull the Amy Acton…", "Yes", 32190, 16],
    ],
    pnl: [0, 4, 6, 9, 10, 12, 13, 17, 21, 24, 51, 56, 66, 74, 78, 95, 113, 127, 144, 167, 196, 212, 218, 264, 283, 285, 291, 305, 318],
  },
  {
    name: "elmcap2",
    positions: [
      [HOUSE, "Yes", 1311655, 59727],
      ["Will JD Vance win the 2028 US Presidential Election?", "No", 1272000, 522000],
      ["2026 Balance of Power: D Senate, D House", "Yes", 1063728, 539],
      ["Will the US confirm that aliens exist before 2027?", "No", 481159, 10278],
      ["Trump out as President before 2027?", "No", 355954, 13272],
      ["Xi Jinping out before 2027?", "No", 256177, 3140],
      ["Will JD Vance win the 2028 US Presidential Election?", "Yes", 228000, -522000],
      ["Will Trump acquire Greenland before 2027?", "No", 221162, 19380],
    ],
    pnl: [0, -2, -2, 4, 4, 6, 5, 6, 7, 8, 31, 174, 246, 381, 482, 502, 537, 610, 762, 841, 1035, 1183, 1266, 1309, 1662, 1825, 2020, 2080, 2180, 2486],
  },
  {
    name: "plumbis",
    positions: [
      [HOUSE, "Yes", 447376, 28566],
      ["Edi Rama out as Albania PM in 2026?", "No", 30401, 1347],
      ["Pedro Sánchez out as PM of Spain by December 31?", "No", 15965, 1076],
      ["U.S. enacts AI safety bill before 2027?", "No", 12582, 120],
      ["Will Magdalena Andersson be the next PM of Sweden?", "Yes", 10160, -1753],
      ["Will Samuel Alito announce his retirement by Dec 31?", "Yes", 896, 657],
      ["Will Andris Kulbergs be the next PM of Latvia?", "Yes", 760, 71],
      ["Will the Republicans win the Mississippi Senate race?", "Yes", 522, -1448],
    ],
    pnl: [0, 0.7, 5.1, 12.6, 11, 13.1, 13.5, 4.6, 6.2, 8.6, 30, 31.5, 34.2, 34.9, 36.8, 36.4, 37.8, 38.1, 40.4, 40.1, 40.6, 40.1, 40.6, 40.5, 40.6, 45.3, 42.5, 44.4, 45.5, 47.4, 49, 50.6, 49.7, 51.6, 52.5, 56.6, 57.2, 58.1, 58.4, 58.4, 58.4, 57.8, 59.2, 62.4, 60.9, 60.7, 61.7, 61.1, 59.4, 61.6, 50.5, 57.7, 62.5, 58.2, 59, 60.3, 63.1, 67.5, 66.7, 98.1, 98.1],
  },
  {
    name: "lfg321",
    positions: [
      [HOUSE, "Yes", 432960, 22338],
      ["Trump out as President before 2027?", "No", 9645, 1545],
    ],
    pnl: [0, 2, 2, 2, 4, 4, 14, 14, 14, 14, 14, 14, 80, 120, 120, 120, 120, 120, 152, 162, 170, 184, 193, 195, 211, 212, 212, 213, 213, 229],
  },
];

/** Every open plumbis position: [market, outcome, size, avg price, current price, value, unrealized PnL]. */
export const HA_PLUMBIS_POSITIONS: [market: string, outcome: string, size: number, avg: number, cur: number, value: number, upnl: number][] = [
  [HA_MARKET.title, "Yes", 447600, 0.9356, 0.9995, 447376, 28566],
  ["Edi Rama out as Albania PM in 2026?", "No", 34547, 0.8409, 0.88, 30401, 1347],
  ["Pedro Sánchez out as PM of Spain by December 31, 2026?", "No", 19956, 0.7461, 0.8, 15965, 1076],
  ["U.S. enacts AI safety bill before 2027?", "No", 14058, 0.8864, 0.895, 12582, 120],
  ["Will Magdalena Andersson be the next Prime Minister of Sweden?", "Yes", 16000, 0.7445, 0.635, 10160, -1753],
  ["Will Samuel Alito announce his retirement by December 31, 2026?", "Yes", 3982, 0.06, 0.225, 896, 657],
  ["Will Andris Kulbergs be the next Prime Minister of Latvia?", "Yes", 802, 0.8593, 0.9475, 760, 71],
  ["Will the Republicans win the Mississippi Senate race in 2026?", "Yes", 2204, 0.8938, 0.237, 522, -1448],
  ["Will Raphael Warnock win the 2028 Democratic presidential nomination?", "Yes", 20000, 0.005, 0.0215, 430, 330],
  ["SCOTUS accepts sports event contract case by December 31, 2026?", "No", 465, 0.6024, 0.795, 370, 90],
  ["Will Ro Khanna win the 2028 Democratic presidential nomination?", "Yes", 20000, 0.0137, 0.0155, 310, 34],
  ["Will Tom Cotton win the 2028 Republican presidential nomination?", "Yes", 43838, 0.0034, 0.0065, 285, 135],
  ["Will Ted Cruz win the 2028 Republican presidential nomination?", "Yes", 10000, 0.02, 0.025, 250, 50],
  ["Will Roy Cooper win the 2028 Democratic presidential nomination?", "Yes", 75000, 0.004, 0.0025, 188, -112],
];

/** plumbis's latest 500 actions by day, Oct 27 – Nov 4, 2026. */
export const HA_PLUMBIS_DAYS: { day: string; actions: number; buy: number; sell: number; redeem: number; other: number }[] = [
  { day: "Oct 27", actions: 11, buy: 1765, sell: 1460, redeem: 109, other: 25 },
  { day: "Oct 28", actions: 3, buy: 0, sell: 0, redeem: 16900, other: 38 },
  { day: "Oct 29", actions: 74, buy: 252571, sell: 235971, redeem: 0, other: 36 },
  { day: "Oct 30", actions: 34, buy: 9, sell: 11421, redeem: 0, other: 39 },
  { day: "Oct 31", actions: 42, buy: 12078, sell: 456, redeem: 0, other: 36 },
  { day: "Nov 1", actions: 168, buy: 12917, sell: 14439, redeem: 0, other: 32 },
  { day: "Nov 2", actions: 117, buy: 138599, sell: 10465, redeem: 0, other: 46 },
  { day: "Nov 3", actions: 16, buy: 1180, sell: 273, redeem: 0, other: 60 },
  { day: "Nov 4", actions: 35, buy: 10663, sell: 11914, redeem: 33516, other: 44 },
];

/** plumbis's newest activity rows. */
export const HA_PLUMBIS_ACTIVITY: [time: string, type: string, side: string, outcome: string, price: string, size: string, usdc: string, market: string][] = [
  ["11/4 10:35", "TRADE", "BUY", "Yes", "0.004", "7,702.6", "30.81", "Will Roy Cooper win the 2028 Democratic nomination?"],
  ["11/4 09:44", "TRADE", "BUY", "Yes", "0.004", "17,297.4", "69.19", "Will Roy Cooper win the 2028 Democratic nomination?"],
  ["11/4 07:34", "REDEEM", "", "No", "", "1,000", "1,000", "Will the Republican candidate win the 2026 NY…"],
  ["11/4 07:34", "REDEEM", "", "Yes", "", "2,156.8", "2,156.8", "Will the Democratic candidate win the 2026 NY…"],
  ["11/4 04:38", "TRADE", "SELL", "Yes", "0.92", "500", "460", "Will Nithya Raman win the 2026 LA mayoral election?"],
  ["11/4 04:38", "TRADE", "SELL", "Yes", "0.92", "170", "156.4", "Will Nithya Raman win the 2026 LA mayoral election?"],
];

/** plumbis's PnL at the latest point, in USDC. */
export const HA_PLUMBIS_PNL = { position: "$98.1K", realized: "$70.1K", unrealized: "$28.0K", economic: "$101.4K", since: "Jul 10, 2026" };

/**
 * Deterministic market → map location (no LLM).
 *
 * Resolution order:
 * 1. Sports club / franchise → home stadium city
 * 2. Crypto markets → New York City
 * 3. Known people / companies → HQ city
 * 4. Broad US topical cues → Washington / US centroid
 *
 * Import `resolveMarketLocation` anywhere you need the same rules (War Room,
 * news pings, research cards, etc.).
 *
 * @typedef {{ lon: number; lat: number; region: string; precision: string; venue?: string; method: string }} MarketLocation
 */

function loc(region, lon, lat, precision = "city", venue, method) {
  return { lon, lat, region, precision, ...(venue ? { venue } : {}), method };
}

const NYC = loc("New York City", -73.9654, 40.7829, "city", undefined, "crypto_default");
const US = loc("United States", -98.5795, 39.8283, "country", undefined, "us_topic");
const DC = loc("Washington, D.C.", -77.0365, 38.8977, "city", undefined, "us_politics");

/**
 * Home venues for major sports franchises. Matched as whole phrases in the
 * market title (longest key wins). Coordinates are stadium / arena locations.
 * @type {Array<{ keys: string[]; region: string; lon: number; lat: number; venue: string }>}
 */
const SPORTS_HOMES = [
  // Premier League
  { keys: ["afc bournemouth", "bournemouth"], region: "Bournemouth", lon: -1.8383, lat: 50.7352, venue: "Vitality Stadium" },
  { keys: ["arsenal"], region: "London", lon: -0.1086, lat: 51.5549, venue: "Emirates Stadium" },
  { keys: ["aston villa"], region: "Birmingham", lon: -1.8847, lat: 52.5092, venue: "Villa Park" },
  { keys: ["brentford"], region: "London", lon: -0.2887, lat: 51.4908, venue: "Gtech Community Stadium" },
  { keys: ["brighton", "brighton & hove", "brighton and hove"], region: "Brighton", lon: -0.0833, lat: 50.8618, venue: "Amex Stadium" },
  { keys: ["chelsea"], region: "London", lon: -0.191, lat: 51.4817, venue: "Stamford Bridge" },
  { keys: ["crystal palace"], region: "London", lon: -0.0855, lat: 51.3983, venue: "Selhurst Park" },
  { keys: ["everton"], region: "Liverpool", lon: -2.9663, lat: 53.4388, venue: "Goodison Park" },
  { keys: ["fulham"], region: "London", lon: -0.2216, lat: 51.475, venue: "Craven Cottage" },
  { keys: ["ipswich"], region: "Ipswich", lon: 1.1448, lat: 52.055, venue: "Portman Road" },
  { keys: ["leicester"], region: "Leicester", lon: -1.1422, lat: 52.6203, venue: "King Power Stadium" },
  { keys: ["liverpool"], region: "Liverpool", lon: -2.9608, lat: 53.4308, venue: "Anfield" },
  { keys: ["manchester city", "man city"], region: "Manchester", lon: -2.2003, lat: 53.4831, venue: "Etihad Stadium" },
  { keys: ["manchester united", "man united", "man utd"], region: "Manchester", lon: -2.2913, lat: 53.4631, venue: "Old Trafford" },
  { keys: ["newcastle united", "newcastle"], region: "Newcastle", lon: -1.6217, lat: 54.9756, venue: "St James' Park" },
  { keys: ["nottingham forest", "nott'm forest", "nottm forest"], region: "Nottingham", lon: -1.1328, lat: 52.94, venue: "City Ground" },
  { keys: ["southampton"], region: "Southampton", lon: -1.3709, lat: 50.9058, venue: "St Mary's Stadium" },
  { keys: ["tottenham", "spurs"], region: "London", lon: -0.0662, lat: 51.6042, venue: "Tottenham Hotspur Stadium" },
  { keys: ["west ham"], region: "London", lon: -0.0165, lat: 51.5387, venue: "London Stadium" },
  { keys: ["wolverhampton", "wolves"], region: "Wolverhampton", lon: -2.1303, lat: 52.5902, venue: "Molineux" },
  // Top EU clubs
  { keys: ["real madrid"], region: "Madrid", lon: -3.6883, lat: 40.453, venue: "Santiago Bernabéu" },
  { keys: ["barcelona", "fc barcelona", "barça"], region: "Barcelona", lon: 2.1228, lat: 41.3809, venue: "Spotify Camp Nou" },
  { keys: ["atletico madrid", "atlético madrid"], region: "Madrid", lon: -3.5997, lat: 40.4362, venue: "Cívitas Metropolitano" },
  { keys: ["bayern munich", "bayern münchen", "bayern"], region: "Munich", lon: 11.6247, lat: 48.2188, venue: "Allianz Arena" },
  { keys: ["borussia dortmund", "dortmund"], region: "Dortmund", lon: 7.4518, lat: 51.4926, venue: "Signal Iduna Park" },
  { keys: ["psg", "paris saint-germain", "paris saint germain"], region: "Paris", lon: 2.253, lat: 48.8414, venue: "Parc des Princes" },
  { keys: ["juventus"], region: "Turin", lon: 7.565, lat: 45.1096, venue: "Allianz Stadium" },
  { keys: ["ac milan", "inter milan", "inter"], region: "Milan", lon: 9.124, lat: 45.4781, venue: "San Siro" },
  { keys: ["ajax"], region: "Amsterdam", lon: 4.9419, lat: 52.3142, venue: "Johan Cruijff Arena" },
  { keys: ["benfica"], region: "Lisbon", lon: -9.1847, lat: 38.7527, venue: "Estádio da Luz" },
  { keys: ["porto", "fc porto"], region: "Porto", lon: -8.5836, lat: 41.1618, venue: "Estádio do Dragão" },
  // NBA
  { keys: ["atlanta hawks", "hawks"], region: "Atlanta", lon: -84.3963, lat: 33.7573, venue: "State Farm Arena" },
  { keys: ["boston celtics", "celtics"], region: "Boston", lon: -71.0621, lat: 42.3662, venue: "TD Garden" },
  { keys: ["brooklyn nets", "nets"], region: "Brooklyn", lon: -73.976, lat: 40.6826, venue: "Barclays Center" },
  { keys: ["charlotte hornets", "hornets"], region: "Charlotte", lon: -80.8392, lat: 35.2251, venue: "Spectrum Center" },
  { keys: ["chicago bulls", "bulls"], region: "Chicago", lon: -87.6742, lat: 41.8807, venue: "United Center" },
  { keys: ["cleveland cavaliers", "cavaliers", "cavs"], region: "Cleveland", lon: -81.6882, lat: 41.4965, venue: "Rocket Mortgage FieldHouse" },
  { keys: ["dallas mavericks", "mavericks", "mavs"], region: "Dallas", lon: -96.8103, lat: 32.7905, venue: "American Airlines Center" },
  { keys: ["denver nuggets", "nuggets"], region: "Denver", lon: -104.992, lat: 39.7487, venue: "Ball Arena" },
  { keys: ["detroit pistons", "pistons"], region: "Detroit", lon: -83.054, lat: 42.3411, venue: "Little Caesars Arena" },
  { keys: ["golden state warriors", "warriors"], region: "San Francisco", lon: -122.3877, lat: 37.768, venue: "Chase Center" },
  { keys: ["houston rockets", "rockets"], region: "Houston", lon: -95.3621, lat: 29.7508, venue: "Toyota Center" },
  { keys: ["indiana pacers", "pacers"], region: "Indianapolis", lon: -86.1555, lat: 39.764, venue: "Gainbridge Fieldhouse" },
  { keys: ["la clippers", "los angeles clippers", "clippers"], region: "Inglewood", lon: -118.341, lat: 33.9582, venue: "Intuit Dome" },
  { keys: ["la lakers", "los angeles lakers", "lakers"], region: "Los Angeles", lon: -118.2673, lat: 34.043, venue: "Crypto.com Arena" },
  { keys: ["memphis grizzlies", "grizzlies"], region: "Memphis", lon: -90.0505, lat: 35.1382, venue: "FedExForum" },
  { keys: ["miami heat"], region: "Miami", lon: -80.187, lat: 25.7814, venue: "Kaseya Center" },
  { keys: ["milwaukee bucks", "bucks"], region: "Milwaukee", lon: -87.9172, lat: 43.0451, venue: "Fiserv Forum" },
  { keys: ["minnesota timberwolves", "timberwolves", "wolves"], region: "Minneapolis", lon: -93.2761, lat: 44.9795, venue: "Target Center" },
  { keys: ["new orleans pelicans", "pelicans"], region: "New Orleans", lon: -90.0821, lat: 29.949, venue: "Smoothie King Center" },
  { keys: ["new york knicks", "knicks"], region: "New York City", lon: -73.9934, lat: 40.7505, venue: "Madison Square Garden" },
  { keys: ["oklahoma city thunder", "thunder", "okc"], region: "Oklahoma City", lon: -97.5151, lat: 35.4634, venue: "Paycom Center" },
  { keys: ["orlando magic"], region: "Orlando", lon: -81.3839, lat: 28.5392, venue: "Kia Center" },
  { keys: ["philadelphia 76ers", "76ers", "sixers"], region: "Philadelphia", lon: -75.1719, lat: 39.9012, venue: "Wells Fargo Center" },
  { keys: ["phoenix suns", "suns"], region: "Phoenix", lon: -112.0712, lat: 33.4457, venue: "Footprint Center" },
  { keys: ["portland trail blazers", "trail blazers", "blazers"], region: "Portland", lon: -122.6668, lat: 45.5316, venue: "Moda Center" },
  { keys: ["sacramento kings", "kings"], region: "Sacramento", lon: -121.5181, lat: 38.5802, venue: "Golden 1 Center" },
  { keys: ["san antonio spurs", "spurs"], region: "San Antonio", lon: -98.4375, lat: 29.427, venue: "Frost Bank Center" },
  { keys: ["toronto raptors", "raptors"], region: "Toronto", lon: -79.3791, lat: 43.6435, venue: "Scotiabank Arena" },
  { keys: ["utah jazz", "jazz"], region: "Salt Lake City", lon: -111.9011, lat: 40.7683, venue: "Delta Center" },
  { keys: ["washington wizards", "wizards"], region: "Washington, D.C.", lon: -77.0209, lat: 38.8981, venue: "Capital One Arena" },
  // NFL
  { keys: ["arizona cardinals"], region: "Glendale", lon: -112.2625, lat: 33.5276, venue: "State Farm Stadium" },
  { keys: ["atlanta falcons"], region: "Atlanta", lon: -84.4009, lat: 33.7555, venue: "Mercedes-Benz Stadium" },
  { keys: ["baltimore ravens"], region: "Baltimore", lon: -76.6227, lat: 39.278, venue: "M&T Bank Stadium" },
  { keys: ["buffalo bills"], region: "Orchard Park", lon: -78.787, lat: 42.7738, venue: "Highmark Stadium" },
  { keys: ["carolina panthers"], region: "Charlotte", lon: -80.8529, lat: 35.2258, venue: "Bank of America Stadium" },
  { keys: ["chicago bears"], region: "Chicago", lon: -87.6167, lat: 41.8623, venue: "Soldier Field" },
  { keys: ["cincinnati bengals"], region: "Cincinnati", lon: -84.516, lat: 39.0955, venue: "Paycor Stadium" },
  { keys: ["cleveland browns"], region: "Cleveland", lon: -81.6996, lat: 41.5061, venue: "Huntington Bank Field" },
  { keys: ["dallas cowboys"], region: "Arlington", lon: -97.0945, lat: 32.7473, venue: "AT&T Stadium" },
  { keys: ["denver broncos"], region: "Denver", lon: -105.02, lat: 39.7439, venue: "Empower Field" },
  { keys: ["detroit lions"], region: "Detroit", lon: -83.0456, lat: 42.34, venue: "Ford Field" },
  { keys: ["green bay packers", "packers"], region: "Green Bay", lon: -88.0622, lat: 44.5013, venue: "Lambeau Field" },
  { keys: ["houston texans"], region: "Houston", lon: -95.4107, lat: 29.6847, venue: "NRG Stadium" },
  { keys: ["indianapolis colts"], region: "Indianapolis", lon: -86.1639, lat: 39.7601, venue: "Lucas Oil Stadium" },
  { keys: ["jacksonville jaguars", "jaguars"], region: "Jacksonville", lon: -81.6373, lat: 30.3239, venue: "EverBank Stadium" },
  { keys: ["kansas city chiefs", "chiefs"], region: "Kansas City", lon: -94.4839, lat: 39.0489, venue: "Arrowhead Stadium" },
  { keys: ["las vegas raiders", "raiders"], region: "Las Vegas", lon: -115.1833, lat: 36.0909, venue: "Allegiant Stadium" },
  { keys: ["los angeles chargers", "chargers"], region: "Inglewood", lon: -118.3391, lat: 33.9535, venue: "SoFi Stadium" },
  { keys: ["los angeles rams", "rams"], region: "Inglewood", lon: -118.3391, lat: 33.9535, venue: "SoFi Stadium" },
  { keys: ["miami dolphins"], region: "Miami Gardens", lon: -80.2389, lat: 25.958, venue: "Hard Rock Stadium" },
  { keys: ["minnesota vikings"], region: "Minneapolis", lon: -95.1665, lat: 44.9738, venue: "U.S. Bank Stadium" },
  { keys: ["new england patriots", "patriots"], region: "Foxborough", lon: -71.2643, lat: 42.0909, venue: "Gillette Stadium" },
  { keys: ["new orleans saints"], region: "New Orleans", lon: -90.0812, lat: 29.9511, venue: "Caesars Superdome" },
  { keys: ["new york giants", "giants"], region: "East Rutherford", lon: -74.0744, lat: 40.8128, venue: "MetLife Stadium" },
  { keys: ["new york jets", "jets"], region: "East Rutherford", lon: -74.0744, lat: 40.8128, venue: "MetLife Stadium" },
  { keys: ["philadelphia eagles", "eagles"], region: "Philadelphia", lon: -75.1675, lat: 39.9008, venue: "Lincoln Financial Field" },
  { keys: ["pittsburgh steelers", "steelers"], region: "Pittsburgh", lon: -80.0158, lat: 40.4468, venue: "Acrisure Stadium" },
  { keys: ["san francisco 49ers", "49ers"], region: "Santa Clara", lon: -121.9702, lat: 37.403, venue: "Levi's Stadium" },
  { keys: ["seattle seahawks", "seahawks"], region: "Seattle", lon: -122.3316, lat: 47.5952, venue: "Lumen Field" },
  { keys: ["tampa bay buccaneers", "buccaneers", "bucs"], region: "Tampa", lon: -82.5033, lat: 27.9759, venue: "Raymond James Stadium" },
  { keys: ["tennessee titans", "titans"], region: "Nashville", lon: -86.7713, lat: 36.1665, venue: "Nissan Stadium" },
  { keys: ["washington commanders", "commanders"], region: "Landover", lon: -76.8645, lat: 38.9077, venue: "Northwest Stadium" },
  // MLB (sample of high-volume markets)
  { keys: ["new york yankees", "yankees"], region: "Bronx", lon: -73.9262, lat: 40.8296, venue: "Yankee Stadium" },
  { keys: ["boston red sox", "red sox"], region: "Boston", lon: -71.0972, lat: 42.3467, venue: "Fenway Park" },
  { keys: ["los angeles dodgers", "dodgers"], region: "Los Angeles", lon: -118.24, lat: 34.0739, venue: "Dodger Stadium" },
  { keys: ["chicago cubs", "cubs"], region: "Chicago", lon: -87.6556, lat: 41.9484, venue: "Wrigley Field" },
  { keys: ["san francisco giants"], region: "San Francisco", lon: -122.389, lat: 37.7786, venue: "Oracle Park" },
  { keys: ["houston astros", "astros"], region: "Houston", lon: -95.3555, lat: 29.7573, venue: "Daikin Park" },
  { keys: ["atlanta braves", "braves"], region: "Cumberland", lon: -84.4677, lat: 33.8907, venue: "Truist Park" },
  { keys: ["new york mets", "mets"], region: "Queens", lon: -73.8458, lat: 40.7571, venue: "Citi Field" },
  // NHL
  { keys: ["toronto maple leafs", "maple leafs"], region: "Toronto", lon: -79.3791, lat: 43.6435, venue: "Scotiabank Arena" },
  { keys: ["montreal canadiens", "canadiens"], region: "Montreal", lon: -73.569, lat: 45.4961, venue: "Bell Centre" },
  { keys: ["boston bruins", "bruins"], region: "Boston", lon: -71.0621, lat: 42.3662, venue: "TD Garden" },
  { keys: ["new york rangers", "rangers"], region: "New York City", lon: -73.9934, lat: 40.7505, venue: "Madison Square Garden" },
  { keys: ["edmonton oilers", "oilers"], region: "Edmonton", lon: -113.497, lat: 53.5469, venue: "Rogers Place" },
  { keys: ["vegas golden knights", "golden knights"], region: "Las Vegas", lon: -115.182, lat: 36.1028, venue: "T-Mobile Arena" },
  // Tennis majors / golf majors
  { keys: ["wimbledon"], region: "London", lon: -0.2144, lat: 51.4341, venue: "All England Club" },
  { keys: ["us open", "u.s. open"], region: "Queens", lon: -73.8467, lat: 40.75, venue: "USTA Billie Jean King" },
  { keys: ["french open", "roland garros"], region: "Paris", lon: 2.2486, lat: 48.847, venue: "Roland Garros" },
  { keys: ["australian open"], region: "Melbourne", lon: 144.9785, lat: -37.8215, venue: "Melbourne Park" },
  { keys: ["masters tournament", "augusta national"], region: "Augusta", lon: -82.02, lat: 33.503, venue: "Augusta National" },
  { keys: ["super bowl"], region: "United States", lon: -98.5795, lat: 39.8283, venue: undefined },
  { keys: ["world cup", "fifa world cup"], region: "United States", lon: -98.5795, lat: 39.8283, venue: undefined },
];

/** People / companies with a clear HQ city (prediction-market regulars). */
const ENTITY_HOMES = [
  { keys: ["jensen huang", "nvidia"], region: "Santa Clara", lon: -121.9552, lat: 37.3541 },
  { keys: ["elon musk", "tesla", "spacex", "xai"], region: "Austin", lon: -97.7431, lat: 30.2672 },
  { keys: ["sam altman", "openai"], region: "San Francisco", lon: -122.4194, lat: 37.7749 },
  { keys: ["mark zuckerberg", "meta platforms", "facebook"], region: "Menlo Park", lon: -122.1817, lat: 37.4529 },
  { keys: ["tim cook", "apple"], region: "Cupertino", lon: -122.0322, lat: 37.323, },
  { keys: ["satya nadella", "microsoft"], region: "Redmond", lon: -122.1215, lat: 47.674 },
  { keys: ["jeff bezos", "amazon"], region: "Seattle", lon: -122.3321, lat: 47.6062 },
  { keys: ["alphabet", "google", "sundar pichai"], region: "Mountain View", lon: -122.0838, lat: 37.3861 },
  { keys: ["donald trump", "trump"], region: "Palm Beach", lon: -80.0365, lat: 26.7056 },
  { keys: ["joe biden", "kamala harris", "white house"], region: "Washington, D.C.", lon: -77.0365, lat: 38.8977 },
];

const CRYPTO_RE =
  /\b(bitcoin|btc|ethereum|eth|solana|sol|crypto|cryptocurrency|token|defi|nft|binance|coinbase|memecoin|dogecoin|xrp|ripple)\b/i;

const US_TOPIC_RE =
  /\b(congress|senate|house of representatives|supreme court|democrat|republican|\bgop\b|presidential|primary election|midterm|fbi|sec\b|federal reserve|\bfed\b|fomc|nasdaq|s&p|dow jones|wall street)\b/i;

function normalizeHay(title, tags) {
  const tagText = Array.isArray(tags) ? tags.map((t) => String(t?.label ?? t ?? "")).join(" ") : String(tags || "");
  return `${title || ""} ${tagText}`.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * @param {string} hay
 * @param {Array<{ keys: string[]; region: string; lon: number; lat: number; venue?: string }>} catalog
 * @param {string} method
 * @returns {MarketLocation | null}
 */
function matchCatalog(hay, catalog, method) {
  let best = null;
  let bestLen = 0;
  for (const row of catalog) {
    for (const key of row.keys) {
      if (key.length < bestLen) continue;
      // Word-ish boundaries so "inter" doesn't steal "winter".
      const re = new RegExp(`(?:^|[^a-z0-9])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[^a-z0-9]|$)`, "i");
      if (!re.test(hay)) continue;
      best = row;
      bestLen = key.length;
    }
  }
  if (!best) return null;
  return loc(best.region, best.lon, best.lat, "venue", best.venue, method);
}

/**
 * Resolve a market title/tags to a map point without network or LLM calls.
 *
 * @param {{ title?: string; tags?: string[] | string; seriesTicker?: string; category?: string }} input
 * @returns {MarketLocation | null}
 */
export function resolveMarketLocation(input = {}) {
  const hay = normalizeHay(input.title, input.tags);
  if (!hay) return null;

  const sports = matchCatalog(hay, SPORTS_HOMES, "sports_home");
  if (sports) return sports;

  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => String(t?.label ?? t ?? "").toLowerCase())
    : [];
  const category = String(input.category || "").toLowerCase();
  if (category === "crypto" || tags.includes("crypto") || CRYPTO_RE.test(hay)) {
    return { ...NYC };
  }

  const entity = matchCatalog(hay, ENTITY_HOMES, "entity_hq");
  if (entity) return entity;

  if (US_TOPIC_RE.test(hay)) {
    if (/\b(congress|senate|white house|supreme court|presidential|democrat|republican|\bgop\b|fbi|fomc|\bfed\b)\b/i.test(hay)) {
      return { ...DC, method: "us_politics" };
    }
    return { ...US };
  }

  return null;
}

/**
 * Sports home for a title, or null.
 * @param {string} title
 */
export function resolveSportsVenue(title) {
  return matchCatalog(normalizeHay(title, []), SPORTS_HOMES, "sports_home");
}

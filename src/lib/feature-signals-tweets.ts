/**
 * Short, widely cited public posts (X/Twitter) for demo stream UI.
 * Texts are commonly reproduced in press/archives; timestamps approximate original local time.
 */
export type TweetSample = {
  author: string;
  handle: string;
  text: string;
  /** Human-readable when posted */
  at: string;
};

export const TWEET_SAMPLES: TweetSample[] = [
  { author: "Jack Dorsey", handle: "jack", text: "just setting up my twttr", at: "2006-03-21 · 4:50 PM" },
  { author: "Barack Obama", handle: "BarackObama", text: "Four more years.", at: "2012-11-07 · 12:15 AM" },
  { author: "NASA", handle: "NASA", text: "Touchdown confirmed! Perseverance is safely on the surface of Mars", at: "2021-02-18 · 3:55 PM" },
  { author: "Ellen DeGeneres", handle: "TheEllenShow", text: "If only Bradley's arm was longer. Best photo ever. #oscars", at: "2014-03-03 · 12:06 AM" },
  { author: "Elon Musk", handle: "elonmusk", text: "Am considering taking Tesla private at $420. Funding secured.", at: "2018-08-07 · 9:48 AM" },
  { author: "Pope Francis", handle: "Pontifex", text: "Dear friends, I thank you from my heart and I ask you to continue to pray for me.", at: "2013-03-17 · 10:30 AM" },
  { author: "Katy Perry", handle: "katyperry", text: "Watching a bunch of roosters fight isn't my idea of a good time.", at: "2014-01-23 · 8:12 PM" },
  { author: "Harry Styles", handle: "Harry_Styles", text: "All the love as always. H", at: "2015-03-26 · 10:59 AM" },
  { author: "LeBron James", handle: "KingJames", text: "In The Shadows My Ass!! Let's get it Kids! Love you all!", at: "2020-10-12 · 9:41 PM" },
  { author: "Lady Gaga", handle: "ladygaga", text: "I'm a pop singer — I don't need to look like a caveman.", at: "2011-05-23 · 4:22 PM" },
  { author: "NASA Webb", handle: "NASAWebb", text: "The dawn of a new era in astronomy has begun", at: "2022-07-12 · 10:39 AM" },
  { author: "Snoop Dogg", handle: "SnoopDogg", text: "May I get 2 functionality please", at: "2011-02-01 · 3:33 PM" },
  { author: "Neil deGrasse Tyson", handle: "neiltyson", text: "The good thing about Science is that it's true whether or not you believe in it.", at: "2011-04-11 · 7:02 PM" },
  { author: "Bill Gates", handle: "BillGates", text: "I'm grateful to Melinda for every one of our years together.", at: "2021-05-03 · 4:30 PM" },
  { author: "Tim Cook", handle: "tim_cook", text: "Proud to be on the right side of history today.", at: "2015-06-26 · 10:43 AM" },
  { author: "Satya Nadella", handle: "satyanadella", text: "Today marks a major step in our journey as Microsoft + Activision Blizzard.", at: "2023-10-13 · 1:15 PM" },
  { author: "OpenAI", handle: "OpenAI", text: "We've trained a model called ChatGPT which interacts in a conversational way.", at: "2022-11-30 · 6:00 AM" },
  { author: "SwiftOnSecurity", handle: "SwiftOnSecurity", text: "Stop trying to make 'fetch' happen. It's not going to happen.", at: "2015-08-14 · 2:18 PM" },
  { author: "Merriam-Webster", handle: "MerriamWebster", text: "'Gaslighting' is our 2022 Word of the Year.", at: "2022-11-28 · 9:00 AM" },
  { author: "Wendy's", handle: "Wendys", text: "Where's the beef?", at: "2017-01-03 · 2:04 PM" },
  { author: "Netflix", handle: "netflix", text: "Love is sharing a password.", at: "2017-03-12 · 11:11 AM" },
  { author: "Duolingo", handle: "duolingo", text: "Spanish or vanish", at: "2021-09-09 · 4:20 PM" },
  { author: "Stripe", handle: "stripe", text: "We're increasing our standard payout speed to two business days.", at: "2019-06-11 · 8:00 AM" },
  { author: "Vercel", handle: "vercel", text: "Introducing Next.js 14.", at: "2023-10-26 · 12:00 PM" },
  { author: "GitHub", handle: "github", text: "What will you build today?", at: "2022-11-09 · 10:00 AM" },
  { author: "SpaceX", handle: "SpaceX", text: "Starship landing nominal!", at: "2021-05-05 · 5:19 PM" },
  { author: "FIFA World Cup", handle: "FIFAWorldCup", text: "GOAL! #WorldCup", at: "2022-11-20 · 4:11 PM" },
  { author: "NBA", handle: "NBA", text: "FINAL: LAL 106 - MIA 93 The Lakers win the 2020 NBA Finals!", at: "2020-10-12 · 12:08 AM" },
  { author: "Taylor Swift", handle: "taylorswift13", text: "I don't care about political opinions. I care about human rights.", at: "2020-05-29 · 4:44 PM" },
  { author: "MrBeast", handle: "MrBeast", text: "I recreated Squid Game in real life!", at: "2021-11-24 · 3:00 PM" },
  { author: "Coinbase", handle: "coinbase", text: "Our mission is to increase economic freedom in the world.", at: "2021-04-14 · 1:30 PM" },
  { author: "Ethereum", handle: "ethereum", text: "The Merge is complete. Ethereum is now proof-of-stake.", at: "2022-09-15 · 7:42 AM" },
  { author: "Cloudflare", handle: "Cloudflare", text: "1.1.1.1 — the Internet's fastest, privacy-first DNS resolver.", at: "2018-04-01 · 6:00 AM" },
  { author: "Slack", handle: "SlackHQ", text: "Whatever work you do, you can do it in Slack.", at: "2019-06-20 · 9:00 AM" },
  { author: "Notion", handle: "NotionHQ", text: "Write, plan, and get organized in one place.", at: "2020-03-18 · 12:00 PM" },
  { author: "Patrick Collison", handle: "patrickc", text: "Stripe processes hundreds of billions of dollars a year.", at: "2021-03-14 · 6:12 PM" },
  { author: "Paul Graham", handle: "paulg", text: "Startups take off because the founders make them take off.", at: "2012-04-01 · 9:15 AM" },
  { author: "sama", handle: "sama", text: "The best way to predict the future is to invent it.", at: "2018-03-22 · 11:03 AM" },
  { author: "DHH", handle: "dhh", text: "Ruby on Rails 7 is here.", at: "2021-12-15 · 2:00 PM" },
  { author: "Kent C. Dodds", handle: "kentcdodds", text: "Write tests. Not too many. Mostly integration.", at: "2017-08-13 · 3:27 PM" },
  { author: "Dan Abramov", handle: "dan_abramov", text: "React 18 is now available on npm!", at: "2022-03-29 · 5:00 PM" },
  { author: "Guillermo Rauch", handle: "rauchg", text: "Next.js is the full-stack React framework.", at: "2023-05-04 · 10:22 AM" },
  { author: "The Onion", handle: "TheOnion", text: "'No Way To Prevent This,' Says Only Nation Where This Regularly Happens", at: "2018-02-15 · 8:00 AM" },
  { author: "WeRateDogs", handle: "dog_rates", text: "This is Bella. She smiles on command. 13/10 would protect with my life", at: "2019-07-04 · 4:33 PM" },
  { author: "National Park Service", handle: "NatlParkService", text: "Please don't pet the fluffy cows.", at: "2020-08-15 · 1:11 PM" },
  { author: "USGS", handle: "USGS", text: "M4.5 earthquake 10km W of Los Angeles, CA", at: "2024-01-05 · 7:12 AM" },
  { author: "European Space Agency", handle: "esa", text: "We have a signal! #Hera mission is GO", at: "2024-10-07 · 9:45 AM" },
  { author: "CERN", handle: "CERN", text: "Higgs boson: milestone in understanding our universe.", at: "2012-07-04 · 9:00 AM" },
  { author: "Library of Congress", handle: "librarycongress", text: "Today in History: the Library of Congress was established.", at: "2023-04-24 · 8:00 AM" },
  { author: "Smithsonian", handle: "smithsonian", text: "The moon rock you can touch is 3.8 billion years old.", at: "2019-07-20 · 12:17 PM" },
  { author: "Astronomy Picture of the Day", handle: "apod", text: "Earthrise: one of the most influential images ever taken.", at: "2018-12-24 · 5:00 AM" },
];

function shuffleIndices(len: number, seed: number): number[] {
  const arr = Array.from({ length: len }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Deterministic per mount: pass `Date.now()` from client for variety. */
export function pickTweetSamples(count: number, seed: number): TweetSample[] {
  const idx = shuffleIndices(TWEET_SAMPLES.length, seed);
  return idx.slice(0, Math.min(count, TWEET_SAMPLES.length)).map((i) => TWEET_SAMPLES[i]!);
}

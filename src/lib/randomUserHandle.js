const ADJECTIVES = [
  "amber",
  "bright",
  "calm",
  "clever",
  "crimson",
  "daisy",
  "ember",
  "gentle",
  "golden",
  "happy",
  "honey",
  "ivory",
  "jolly",
  "kind",
  "lucky",
  "mellow",
  "nimble",
  "olive",
  "peachy",
  "quiet",
  "rapid",
  "rosy",
  "silver",
  "sunny",
  "swift",
  "tidal",
  "velvet",
  "warm",
  "witty",
];

const NOUNS = [
  "lychee",
  "mango",
  "peach",
  "plum",
  "berry",
  "cedar",
  "maple",
  "otter",
  "panda",
  "robin",
  "sparrow",
  "willow",
  "comet",
  "harbor",
  "meadow",
  "pebble",
  "quartz",
  "river",
  "summit",
];

export function randomUserHandle() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = 10 + Math.floor(Math.random() * 90);
  return `${adjective}${noun}${suffix}`;
}

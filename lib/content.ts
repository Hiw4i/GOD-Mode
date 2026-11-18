export type FeatureKind = "focus" | "standard" | "timer" | "ambient";

export interface Feature {
  id: string;
  title: string;
  description: string;
  kind: FeatureKind;
  align?: "left" | "right";
  delay: 1 | 2 | 3 | 4 | 5;
  speed: number;
}

export interface DownloadPlan {
  title: string;
  planName: string;
  features: string[];
  price: string;
  cta: string;
}

export interface SupportMethod {
  id: "card" | "crypto";
  symbol: string;
  title: string;
  subtitle: string;
}

export interface AmbientTrack {
  name: string;
  cover: string;
  src: string;
}

export const features: Feature[] = [
  {
    id: "total-focus",
    title: "Total Focus",
    description: "All notifications and apps are blocked. You are left alone with the task.",
    kind: "focus",
    delay: 1,
    speed: 0.95,
  },
  {
    id: "best-ux",
    title: "The Best UX/UI",
    description: "Aesthetic excellence is the heart of GOD Mode. Every detail is crafted to perfection.",
    kind: "standard",
    align: "right",
    delay: 2,
    speed: 1.08,
  },
  {
    id: "statistics",
    title: "Real Statistics",
    description: "Know yourself. Find out your real productivity. Every second tracked. Every distraction counted.",
    kind: "standard",
    delay: 2,
    speed: 1.16,
  },
  {
    id: "cruel-stopwatch",
    title: "Cruel Stopwatch",
    description: "Every break has a price. Stopwatch will reset after any distraction.",
    kind: "timer",
    delay: 3,
    speed: 1.5,
  },
  {
    id: "ambient-soundscapes",
    title: "Ambient Soundscapes",
    description: "Curated sounds to drown out noise.",
    kind: "ambient",
    delay: 4,
    speed: 1.34,
  },
  {
    id: "task-targeting",
    title: "Task Targeting",
    description: "Point all energy at one task with absolute intent.",
    kind: "standard",
    delay: 5,
    speed: 1.42,
  },
  {
    id: "museum-focus",
    title: "Museum of Focus",
    description: "Turn your discipline into art. Convert raw focus time and completed tasks into XP, level up your rank, and unlock unique collectible trophies.",
    kind: "standard",
    delay: 5,
    speed: 1.3,
  },
  {
    id: "quests",
    title: "Quests",
    description: "Pick daily focus goals for free, or build a longer routine with weekly and monthly Premium quests.",
    kind: "standard",
    delay: 5,
    speed: 1.25,
  },
];

export const freeDownloadPlan: DownloadPlan = {
  title: "Free",
  price: "$0",
  planName: "Core GOD Mode",
  cta: "Download Free",
  features: [
    "Basic focus stopwatch",
    "Last 4 weeks of statistics",
    "Daily quests and unlimited focus tasks",
    "Sync across devices with an account",
    "No ads",
  ],
};

export const premiumFeatures = [
  "Weekly & monthly quests",
  "Full Focus History & Statistics",
  "Cruel Stopwatch & unlimited blocked apps",
  "Premium music, themes & clock fonts",
  "Navigation customization",
  "Premium level rewards on paid plans",
] as const;

export const supportMethods: SupportMethod[] = [
  { id: "card", symbol: "$", title: "Card", subtitle: "Visa, MasterCard, СБП, PayPal, Apple Pay" },
  { id: "crypto", symbol: "₿", title: "Crypto", subtitle: "USDT / BTC / ETH / SOL" },
];

export const ambientTracks: AmbientTrack[] = [
  { name: "Had to be alone", cover: "/sources/music (1).jpg", src: "/sources/music (1).mp3" },
  { name: "Hope burns last", cover: "/sources/music (2).jpg", src: "/sources/music (2).mp3" },
  { name: "Lo-fi Focus", cover: "/sources/music (3).jpg", src: "/sources/music (3).m4a" },
];

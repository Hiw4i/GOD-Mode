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
    description: "Block the apps you choose during focus sessions. Premium adds website blocking on Windows Portable with a browser extension and in Chrome and Brave on supported Android builds.",
    kind: "focus",
    delay: 1,
    speed: 0.95,
  },
  {
    id: "best-ux",
    title: "Make It Yours",
    description: "Choose a theme and clock font, adjust stopwatch opacity, and set the pace of animations.",
    kind: "standard",
    align: "right",
    delay: 2,
    speed: 1.08,
  },
  {
    id: "statistics",
    title: "Real Statistics",
    description: "See where your focus time goes with a session calendar, time by task, and Focus Quality charts.",
    kind: "standard",
    delay: 2,
    speed: 1.16,
  },
  {
    id: "cruel-stopwatch",
    title: "Cruel Stopwatch",
    description: "Turn on Cruel Stopwatch to reset your timer if you stay away from GOD Mode for more than 10 seconds.",
    kind: "timer",
    delay: 3,
    speed: 1.5,
  },
  {
    id: "ambient-soundscapes",
    title: "Ambient Soundscapes",
    description: "Play ambient soundscapes, noise, binaural beats, or lo-fi in the background while you work.",
    kind: "ambient",
    delay: 4,
    speed: 1.34,
  },
  {
    id: "task-targeting",
    title: "Task Targeting",
    description: "Pick a task before you start. Your focus time is recorded against it, so you can see what you worked on later.",
    kind: "standard",
    delay: 5,
    speed: 1.42,
  },
  {
    id: "museum-focus",
    title: "Museum of Focus",
    description: "Earn XP as you focus, level up, and unlock collectible trophies, each with its own story.",
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
  "Website blocking on Windows Portable & supported Android builds",
  "Premium music, themes & clock fonts",
  "Navigation customization",
  "Premium level rewards on paid plans",
] as const;

export const supportMethods: SupportMethod[] = [
  { id: "card", symbol: "$", title: "One-time donation", subtitle: "Bank cards, SBP, PayPal, Apple Pay" },
  { id: "crypto", symbol: "₿", title: "Crypto", subtitle: "USDT / BTC / ETH / SOL" },
];

export const ambientTracks: AmbientTrack[] = [
  { name: "Had to be alone", cover: "/sources/music (1).jpg", src: "/sources/music (1).mp3" },
  { name: "Hope burns last", cover: "/sources/music (2).jpg", src: "/sources/music (2).mp3" },
  { name: "Lo-fi Focus", cover: "/sources/music (3).jpg", src: "/sources/music (3).m4a" },
];

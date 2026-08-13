export type Post = {
  id: string;
  url: string;
  author: string;
  text: string;
  matchedKeywords: string[];
  status: string;
  relevanceScore: number | null;
  promotionScore: number | null;
  suitable: boolean | null;
  category: string | null;
  reason: string | null;
  suggestedComment: string | null;
  riskLevel: string | null;
  error: string | null;
  attemptCount: number;
};

export type Promotion = {
  websiteName: string;
  websiteUrl: string;
  description: string;
  targetAudience: string[];
  promotionTopics: string[];
  tone: string;
};

export type Overview = {
  counts: {
    todayFound: number;
    pendingAi: number;
    recommended: number;
    needsReview: number;
    sent: number;
    failed: number;
  };
  keywords: { id: string; phrase: string; enabled: boolean }[];
  posts: Post[];
  promotion: Promotion;
  providers: {
    mockMode: boolean;
    discovery: string;
    send: string;
    hasThreadsToken: boolean;
    hasPlaywrightAuth: boolean;
  };
  queue: {
    paused: boolean;
    stopped: boolean;
    running: boolean;
    delayMs: number;
    maxDailyActions: number;
    dailyCount: number;
    counts: Record<string, number>;
    sending: Post[];
  };
  ai: { exists: boolean; valid: boolean; count: number; hash: string };
  limitations: string[];
};

export type PreparedAi = {
  prompt: string;
  message: string;
  nextSteps: string[];
  cliAvailable: boolean;
  openedDeeplink: boolean;
};

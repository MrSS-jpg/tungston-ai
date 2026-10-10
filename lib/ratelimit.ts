import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Vercel's "Connect Store" flow can name these either UPSTASH_REDIS_REST_* or KV_REST_API_*
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Reasonable Groq developer tier limits:
// Groq on-demand has 30 RPM, 6k-14k TPM, 500k TPD.
// Guest: 20 messages per 15-minute sliding window (~80/hr max) - protects host key.
// Authenticated: 100 messages per 1-hour sliding window.
// Burst protection: Minimum 1.5 seconds between consecutive requests per client.
const GUEST_CHAT_LIMIT = Number(process.env.RATE_LIMIT_GUEST_15MIN) || 20;
const AUTH_CHAT_LIMIT = Number(process.env.RATE_LIMIT_AUTH_HOUR) || 100;
const IMAGE_LIMIT = Number(process.env.RATE_LIMIT_IMAGE_PER_HOUR) || 8;
const MIN_REQUEST_INTERVAL_MS = 1500;

// Memory fallback store for Edge / local / when Redis is not linked
type ClientRecord = {
  timestamps: number[];
  lastRequest: number;
};
const memoryStore = new Map<string, ClientRecord>();

let redisLimiterGuest: Ratelimit | null = null;
let redisLimiterAuth: Ratelimit | null = null;
let redisLimiterImage: Ratelimit | null = null;

if (url && token) {
  try {
    const redis = new Redis({ url, token });
    redisLimiterGuest = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(GUEST_CHAT_LIMIT, "15 m"),
      prefix: "tungston:guest",
    });
    redisLimiterAuth = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(AUTH_CHAT_LIMIT, "1 h"),
      prefix: "tungston:auth",
    });
    redisLimiterImage = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(IMAGE_LIMIT, "1 h"),
      prefix: "tungston:image",
    });
  } catch {
    // Falls back to in-memory store
  }
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export type LimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number; // seconds until reset
  reason?: "burst" | "quota";
};

export async function checkChatLimit(
  clientId: string,
  tier: "guest" | "authenticated" = "guest"
): Promise<LimitResult> {
  const now = Date.now();
  const limitMax = tier === "authenticated" ? AUTH_CHAT_LIMIT : GUEST_CHAT_LIMIT;
  const windowMs = tier === "authenticated" ? 3600_000 : 900_000; // 1h vs 15m

  // Burst cooldown check (1.5s interval)
  let rec = memoryStore.get(clientId);
  if (!rec) {
    rec = { timestamps: [], lastRequest: 0 };
    memoryStore.set(clientId, rec);
  }

  if (rec.lastRequest && now - rec.lastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitSec = Math.max(1, Math.ceil((MIN_REQUEST_INTERVAL_MS - (now - rec.lastRequest)) / 1000));
    return {
      allowed: false,
      remaining: 0,
      limit: limitMax,
      reset: waitSec,
      reason: "burst",
    };
  }

  // Try Redis if configured
  const redisLimiter = tier === "authenticated" ? redisLimiterAuth : redisLimiterGuest;
  if (redisLimiter) {
    try {
      const { success, remaining, limit, reset } = await redisLimiter.limit(clientId);
      if (success) {
        rec.lastRequest = now;
      }
      return {
        allowed: success,
        remaining,
        limit,
        reset: Math.max(1, Math.ceil((reset - now) / 1000)),
        reason: success ? undefined : "quota",
      };
    } catch {
      // Fallback to in-memory below
    }
  }

  // In-memory sliding window algorithm
  rec.timestamps = rec.timestamps.filter((t) => now - t < windowMs);

  if (rec.timestamps.length >= limitMax) {
    const oldest = rec.timestamps[0];
    const resetSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return {
      allowed: false,
      remaining: 0,
      limit: limitMax,
      reset: resetSec,
      reason: "quota",
    };
  }

  rec.timestamps.push(now);
  rec.lastRequest = now;
  const remaining = Math.max(0, limitMax - rec.timestamps.length);
  return {
    allowed: true,
    remaining,
    limit: limitMax,
    reset: Math.ceil(windowMs / 1000),
  };
}

export async function checkImageLimit(clientId: string): Promise<LimitResult> {
  const now = Date.now();
  const windowMs = 3600_000;
  let rec = memoryStore.get(`img:${clientId}`);
  if (!rec) {
    rec = { timestamps: [], lastRequest: 0 };
    memoryStore.set(`img:${clientId}`, rec);
  }

  if (redisLimiterImage) {
    try {
      const { success, remaining, limit, reset } = await redisLimiterImage.limit(clientId);
      return {
        allowed: success,
        remaining,
        limit,
        reset: Math.max(1, Math.ceil((reset - now) / 1000)),
        reason: success ? undefined : "quota",
      };
    } catch {
      // Fallback to memory
    }
  }

  rec.timestamps = rec.timestamps.filter((t) => now - t < windowMs);
  if (rec.timestamps.length >= IMAGE_LIMIT) {
    const oldest = rec.timestamps[0];
    const resetSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return {
      allowed: false,
      remaining: 0,
      limit: IMAGE_LIMIT,
      reset: resetSec,
      reason: "quota",
    };
  }

  rec.timestamps.push(now);
  return {
    allowed: true,
    remaining: IMAGE_LIMIT - rec.timestamps.length,
    limit: IMAGE_LIMIT,
    reset: Math.ceil(windowMs / 1000),
  };
}

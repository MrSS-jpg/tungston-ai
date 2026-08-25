import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Vercel's "Connect Store" flow can name these either UPSTASH_REDIS_REST_* (Upstash
// marketplace integration) or KV_REST_API_* (Vercel KV). We accept either.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const CHAT_LIMIT = Number(process.env.RATE_LIMIT_CHAT_PER_HOUR) || 30;
const IMAGE_LIMIT = Number(process.env.RATE_LIMIT_IMAGE_PER_HOUR) || 8;

let chatLimiter: Ratelimit | null = null;
let imageLimiter: Ratelimit | null = null;

if (url && token) {
  const redis = new Redis({ url, token });
  chatLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(CHAT_LIMIT, "1 h"), prefix: "tungston:chat" });
  imageLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(IMAGE_LIMIT, "1 h"), prefix: "tungston:image" });
}

export const rateLimitingEnabled = !!(chatLimiter && imageLimiter);

export function getClientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export type LimitResult = { allowed: boolean; remaining: number; limit: number; reset: number };

async function check(limiter: Ratelimit | null, fallbackLimit: number, id: string): Promise<LimitResult> {
  if (!limiter) return { allowed: true, remaining: fallbackLimit, limit: fallbackLimit, reset: 0 };
  const { success, remaining, limit, reset } = await limiter.limit(id);
  return { allowed: success, remaining, limit, reset };
}

export const checkChatLimit = (ip: string) => check(chatLimiter, CHAT_LIMIT, ip);
export const checkImageLimit = (ip: string) => check(imageLimiter, IMAGE_LIMIT, ip);

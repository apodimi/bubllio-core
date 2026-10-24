import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common'

const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 6
const MAX_KEYS = 1024

interface RateEntry {
  count: number
  resetAt: number
}

/** Bounded single-process protection; shared edge limiting remains a release gate. */
@Injectable()
export class SetupRateLimitGuard implements CanActivate {
  private readonly entries = new Map<string, RateEntry>()

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip?: string }>()
    const now = Date.now()
    const key = request.ip ?? 'unknown'
    this.prune(now)
    const current = this.entries.get(key)
    if (!current || current.resetAt <= now) {
      if (this.entries.size >= MAX_KEYS) this.entries.delete(this.entries.keys().next().value ?? '')
      this.entries.set(key, { count: 1, resetAt: now + WINDOW_MS })
      return true
    }
    current.count += 1
    if (current.count > MAX_ATTEMPTS) throw new HttpException('Setup rate limited', 429)
    return true
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key)
    }
  }
}

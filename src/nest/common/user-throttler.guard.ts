import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const authId = (req as any).auth?.id;
    const sessionUserId = (req as any).session?.userId;
    const userId = authId || sessionUserId;
    if (userId) {
      return `user:${String(userId)}`;
    }
    return `ip:${req.ip}`;
  }
}

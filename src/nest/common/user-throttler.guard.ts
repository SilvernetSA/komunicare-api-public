import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId =
      req.auth?.id ||
      req.session?.userId;

    if (userId) {
      return `user:${userId}`;
    }

    return `ip:${req.ip}`;
  }
}

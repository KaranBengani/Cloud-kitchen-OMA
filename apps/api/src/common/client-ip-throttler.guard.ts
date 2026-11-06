import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

// Rate limits must count each visitor separately. On Render every request arrives through Cloudflare
// and Render's proxy, so req.ip is the proxy's address and everyone would share one limit: a stranger
// guessing PINs would lock the family out, and one busy network could block all web orders.
// Cloudflare puts the visitor's real address in CF-Connecting-IP and overwrites any value a client
// sends, so it can't be faked. Locally (no Cloudflare) it falls back to req.ip.
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const cloudflare = request.headers['cf-connecting-ip'];
    return Promise.resolve((typeof cloudflare === 'string' && cloudflare) || request.ip || 'unknown');
  }
}

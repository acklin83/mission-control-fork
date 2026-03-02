/**
 * Bitcoin API Proxy
 *
 * Proxies requests to the Bitcoin dashboard running on the local network.
 * Keeps the upstream URL server-side only (never exposed to the browser).
 *
 * ENV:
 *   BITCOIN_API_URL — upstream endpoint (default: http://192.168.177.3:3000/api/bitcoin)
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BITCOIN_API_URL =
  process.env.BITCOIN_API_URL || 'http://192.168.177.3:3000/api/bitcoin';

/** Upstream fetch timeout in ms */
const FETCH_TIMEOUT_MS = 8_000;

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(BITCOIN_API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[bitcoin] Upstream returned ${res.status}`);
      return NextResponse.json(
        { error: 'Upstream unavailable' },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Return a trimmed, safe payload (strip any raw addresses / sensitive tx data)
    const wallet = data.wallet ?? {};
    const price = data.price ?? {};
    const node = data.node ?? {};

    return NextResponse.json({
      wallet: {
        balanceSats: wallet.balanceSats ?? 0,
        balanceLightningSats: wallet.balanceLightningSats ?? 0,
        balanceUnconfirmedSats: wallet.balanceUnconfirmedSats ?? 0,
        lightningAddress: wallet.lightningAddress ?? null,
        totalReceived: wallet.totalReceived ?? 0,
        totalSent: wallet.totalSent ?? 0,
        recentTxCount: Array.isArray(wallet.recentTx)
          ? wallet.recentTx.length
          : 0,
        recentTx: Array.isArray(wallet.recentTx)
          ? wallet.recentTx.slice(0, 10).map((tx: Record<string, unknown>) => ({
              id: tx.id,
              type: tx.type,
              status: tx.status,
              amount: tx.amount,
              currency: tx.currency,
              description: tx.description,
              time: tx.time,
              fees: tx.fees,
            }))
          : [],
      },
      node: {
        reachable: node.reachable ?? false,
      },
      price: {
        usd: price.usd ?? 0,
        chf: price.chf ?? 0,
        eur: price.eur ?? 0,
        satsPerDollar: price.satsPerDollar ?? 0,
        change24h: price.change24h ?? 0,
      },
      timestamp: data.timestamp ?? Date.now(),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error('[bitcoin] Upstream timeout');
      return NextResponse.json(
        { error: 'Upstream timeout' },
        { status: 504 }
      );
    }
    console.error('[bitcoin] Failed to fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bitcoin,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

interface BitcoinTx {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  status: string;
  amount: number;
  currency: string;
  description: string;
  time: string;
  fees: number;
}

interface BitcoinData {
  wallet: {
    balanceSats: number;
    balanceLightningSats: number;
    balanceUnconfirmedSats: number;
    lightningAddress: string | null;
    totalReceived: number;
    totalSent: number;
    recentTxCount: number;
    recentTx: BitcoinTx[];
  };
  node: { reachable: boolean };
  price: {
    usd: number;
    chf: number;
    eur: number;
    satsPerDollar: number;
    change24h: number;
  };
  timestamp: number;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function formatSats(sats: number): string {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(2)}M`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}k`;
  return String(sats);
}

function formatFiat(value: number): string {
  return value.toLocaleString('de-CH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function satsToFiat(sats: number, priceUsd: number): string {
  const btc = sats / 100_000_000;
  return (btc * priceUsd).toFixed(2);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Refresh interval ──────────────────────────────────────────── */

const REFRESH_MS = 60_000; // 1 minute

/* ── Component ─────────────────────────────────────────────────── */

export function BitcoinWidget() {
  const [data, setData] = useState<BitcoinData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/bitcoin');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: BitcoinData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ── Loading / Error states ───────────────────────────────── */

  if (loading) {
    return (
      <div className="rounded-lg border border-mc-border bg-mc-bg-secondary p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-mc-bg-tertiary" />
          <div className="h-4 w-20 rounded bg-mc-bg-tertiary" />
        </div>
        <div className="h-8 w-32 rounded bg-mc-bg-tertiary mb-2" />
        <div className="h-3 w-24 rounded bg-mc-bg-tertiary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-mc-accent-red/30 bg-mc-accent-red/5 p-4">
        <div className="flex items-center gap-2 text-mc-accent-red text-sm">
          <WifiOff className="w-4 h-4" />
          <span>Bitcoin API offline</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { wallet, node, price } = data;
  const totalSats = wallet.balanceSats + wallet.balanceLightningSats;
  const change24h = price.change24h;
  const isPositive = change24h >= 0;

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="rounded-lg border border-mc-border bg-mc-bg-secondary overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-mc-bg-tertiary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bitcoin className="w-5 h-5 text-[#F7931A]" />
          <span className="font-semibold text-sm">Bitcoin</span>
          {node.reachable ? (
            <Wifi className="w-3 h-3 text-mc-accent-green" />
          ) : (
            <WifiOff className="w-3 h-3 text-mc-accent-red" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isPositive
                ? 'bg-mc-accent-green/20 text-mc-accent-green'
                : 'bg-mc-accent-red/20 text-mc-accent-red'
            }`}
          >
            {isPositive ? '+' : ''}
            {change24h.toFixed(1)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchData(true);
            }}
            className="p-1 rounded hover:bg-mc-bg text-mc-text-secondary"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </button>

      {/* Price Ticker */}
      <div className="px-4 pb-3 border-b border-mc-border">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono">
            ${formatFiat(price.usd)}
          </span>
          <span className="text-mc-text-secondary text-xs">
            CHF {formatFiat(price.chf)}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-mc-accent-green" />
          ) : (
            <TrendingDown className="w-3 h-3 text-mc-accent-red" />
          )}
          <span className="text-xs text-mc-text-secondary">
            {price.satsPerDollar} sats/$
          </span>
        </div>
      </div>

      {/* Wallet Balance */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-mc-text-secondary uppercase tracking-wider">
            Wallet
          </span>
          <span className="text-xs text-mc-text-secondary">
            ≈ ${satsToFiat(totalSats, price.usd)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* On-chain */}
          <div className="rounded border border-mc-border bg-mc-bg-tertiary p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Bitcoin className="w-3 h-3 text-[#F7931A]" />
              <span className="text-[10px] text-mc-text-secondary uppercase">
                On-chain
              </span>
            </div>
            <span className="text-sm font-mono font-semibold">
              {formatSats(wallet.balanceSats)}
            </span>
            <span className="text-[10px] text-mc-text-secondary ml-1">sats</span>
          </div>

          {/* Lightning */}
          <div className="rounded border border-mc-border bg-mc-bg-tertiary p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3 h-3 text-mc-accent-yellow" />
              <span className="text-[10px] text-mc-text-secondary uppercase">
                Lightning
              </span>
            </div>
            <span className="text-sm font-mono font-semibold">
              {formatSats(wallet.balanceLightningSats)}
            </span>
            <span className="text-[10px] text-mc-text-secondary ml-1">sats</span>
          </div>
        </div>

        {wallet.balanceUnconfirmedSats > 0 && (
          <div className="mt-1.5 text-[10px] text-mc-accent-yellow">
            ⏳ {formatSats(wallet.balanceUnconfirmedSats)} sats unconfirmed
          </div>
        )}
      </div>

      {/* Expanded: Recent TXs */}
      {expanded && (
        <div className="border-t border-mc-border">
          <div className="px-4 py-2">
            <span className="text-xs text-mc-text-secondary uppercase tracking-wider">
              Recent Transactions
            </span>
          </div>

          {wallet.recentTx.length === 0 ? (
            <div className="px-4 pb-3 text-xs text-mc-text-secondary">
              No recent transactions
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {wallet.recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-2 hover:bg-mc-bg-tertiary border-t border-mc-border/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {tx.type === 'CREDIT' ? (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-mc-accent-green shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 text-mc-accent-red shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs truncate">
                        {tx.description || (tx.type === 'CREDIT' ? 'Received' : 'Sent')}
                      </div>
                      <div className="text-[10px] text-mc-text-secondary">
                        {timeAgo(tx.time)} · {tx.status.toLowerCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div
                      className={`text-xs font-mono font-medium ${
                        tx.type === 'CREDIT' ? 'text-mc-accent-green' : 'text-mc-accent-red'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}
                      {formatSats(Math.round(tx.amount * 100_000_000))}
                    </div>
                    <div className="text-[10px] text-mc-text-secondary">
                      {tx.currency === 'LIGHTNING' ? '⚡' : '⛓️'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="px-4 py-2 border-t border-mc-border bg-mc-bg-tertiary/50 flex justify-between text-[10px] text-mc-text-secondary">
            <span>↓ {formatSats(wallet.totalReceived)} received</span>
            <span>↑ {formatSats(wallet.totalSent)} sent</span>
          </div>
        </div>
      )}
    </div>
  );
}

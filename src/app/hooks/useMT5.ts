/**
 * useMT5 — React hook for MetaTrader 5 backend integration via MetaAPI.cloud.
 * Connects to the Django REST backend at localhost:8000.
 * account_id is obtained during connect (MetaAPI provisioning) and persisted in localStorage.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { TradeErrorInfo } from "../components/TradeErrorPopup/types";
import { playTradeExecuted, playTradeFailed, playPositionClosed, playConnected } from "../utils/tradeSounds";
const MT5_API_BASE = "https://seashell-app-cq4ql.ondigitalocean.app/api/mt5";
/* ─── Types ─── */
export interface MT5Credentials {
    login: string;
    password: string;
    server: string;
}

export interface MT5Account {
    login: number;
    name: string;
    server: string;
    balance: number;
    equity: number;
    margin: number;
    free_margin: number;
    profit: number;
    leverage: number;
    currency: string;
    trade_mode: number;
    limit_orders: number;
    margin_level: number;
}

export interface MT5Position {
    ticket: number;
    symbol: string;
    type: "BUY" | "SELL";
    volume: number;
    open_price: number;
    current_price: number;
    sl: number | null;
    tp: number | null;
    profit: number;
    swap: number;
    commission: number;
    magic: number;
    comment: string;
    time_open: string;
    time_update: string | null;
}

export interface MT5Deal {
    ticket: string;
    order: string;
    position: string;
    symbol: string;
    type: string;
    entry: string;
    volume: number;
    price: number;
    profit: number;
    swap: number;
    commission: number;
    comment: string;
    time: string;
}

export interface MT5TradeResult {
    ticket: number;
    deal: number;
    symbol: string;
    action: string;
    volume: number;
    price: number;
    sl: number | null;
    tp: number | null;
    comment: string;
}

export interface UseMT5Result {
    // Connection
    connected: boolean;
    connecting: boolean;
    connectStatus: string;
    connectMT5: (credentials: MT5Credentials) => Promise<void>;
    disconnectMT5: () => Promise<void>;
    accountId: string;
    // Account
    account: MT5Account | null;
    accountLoading: boolean;
    // Positions
    positions: MT5Position[];
    positionsLoading: boolean;
    // History
    history: MT5Deal[];
    historyLoading: boolean;
    // Error
    error: string | null;
    tradeError: TradeErrorInfo | null;
    clearTradeError: () => void;
    // Refresh
    refreshAccount: () => Promise<void>;
    refreshPositions: () => Promise<void>;
    refreshHistory: (days?: number) => Promise<void>;
    // Trade Execution
    executeTrade: (symbol: string, action: string, volume: number, sl?: number, tp?: number, comment?: string) => Promise<MT5TradeResult | null>;
    bulkExecuteTrades: (trades: Array<{symbol: string, action: string, volume: number, sl?: number, tp?: number, comment?: string}>) => Promise<{orders: any[], errors: any[]}>;
    closePosition: (ticket: number) => Promise<boolean>;
    closeAllPositions: () => Promise<boolean>;
    // Symbol Overrides
    symbolOverrides: Record<string, string>;
    setSymbolOverride: (dashboardName: string, brokerName: string) => Promise<boolean>;
    deleteSymbolOverride: (dashboardName: string) => Promise<boolean>;
    // Server-side Trade History
    serverTradeHistory: any[];
    fetchTradeHistory: () => Promise<void>;
    addTradeToHistory: (entry: any) => Promise<boolean>;
    clearServerHistory: () => Promise<boolean>;
    // Auto-Trade
    autoTrades: any[];
    autoTradeWorker: any;
    autoTradeHistory: any[];
    autoTradeSubscribe: (trades: Array<{symbol: string, main_tf: string, sub_tf: string, window_size: number, direction: string, lot_size: number, sl?: number, comment: string}>) => Promise<{subscribed: any[], errors: any[]}>;
    autoTradeUnsubscribe: (comments: string[]) => Promise<void>;
    stopAllAutoTrades: () => Promise<boolean>;
    fetchAutoTradeStatus: () => Promise<void>;
    fetchAutoTradeHistory: (limit?: number) => Promise<void>;
    autoFlipCounts: Record<string, number>;
}

/* ─── Hook ─── */
export function useMT5(): UseMT5Result {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [accountId, setAccountId] = useState<string>(() => {
        try { return localStorage.getItem('phasex_account_id') || ''; } catch { return ''; }
    });
    const [sessionToken, setSessionToken] = useState<string>(() => {
        try { return localStorage.getItem('phasex_session_token') || ''; } catch { return ''; }
    });
    const [account, setAccount] = useState<MT5Account | null>(null);
    const [accountLoading, setAccountLoading] = useState(false);
    const [positions, setPositions] = useState<MT5Position[]>([]);
    const [positionsLoading, setPositionsLoading] = useState(false);
    const [history, setHistory] = useState<MT5Deal[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tradeError, setTradeError] = useState<TradeErrorInfo | null>(null);
    const clearTradeError = useCallback(() => setTradeError(null), []);
    const [connectStatus, setConnectStatus] = useState<string>('');
    const [symbolOverrides, setSymbolOverrides] = useState<Record<string, string>>({});

    // ─── Auto Flips Tracking ───
    const [autoFlipCounts, setAutoFlipCountsState] = useState<Record<string, number>>(() => {
        try { return JSON.parse(localStorage.getItem('phasex_auto_flips') || '{}'); } catch { return {}; }
    });
    const autoFlipCountsRef = useRef(autoFlipCounts);
    const setAutoFlipCounts = useCallback((newCounts: Record<string, number>) => {
        autoFlipCountsRef.current = newCounts;
        setAutoFlipCountsState(newCounts);
        try { localStorage.setItem('phasex_auto_flips', JSON.stringify(newCounts)); } catch {}
    }, []);
    const prevAutoPositionsRef = useRef<Record<string, { ticket: number, type: string }>>({});

    const mountedRef = useRef(true);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const accountIdRef = useRef(accountId);
    accountIdRef.current = accountId;
    const sessionTokenRef = useRef(sessionToken);
    sessionTokenRef.current = sessionToken;

    // Save account_id and session_token to localStorage
    useEffect(() => {
        try {
            if (accountId) localStorage.setItem('phasex_account_id', accountId);
            else localStorage.removeItem('phasex_account_id');
        } catch { /* ignore */ }
    }, [accountId]);

    useEffect(() => {
        try {
            if (sessionToken) localStorage.setItem('phasex_session_token', sessionToken);
            else localStorage.removeItem('phasex_session_token');
        } catch { /* ignore */ }
    }, [sessionToken]);

    // ─── Helper: get headers with session token ───
    const getHeaders = useCallback((extra?: Record<string, string>) => {
        const headers: Record<string, string> = { ...extra };
        const tok = sessionTokenRef.current;
        if (tok) headers['X-Session-Token'] = tok;
        return headers;
    }, []);

    // ─── Helper: handle session expired response ───
    const handleSessionExpired = useCallback((data: any, res: Response) => {
        if (res.status === 403 && data?.code === 'SESSION_EXPIRED') {
            if (mountedRef.current) {
                setConnected(false);
                setAccount(null);
                setPositions([]);
                setError('تم فصل الجلسة — تم الاتصال من جهاز آخر');
                setSessionToken('');
            }
            return true;
        }
        return false;
    }, []);

    // ─── Helper: safely parse JSON response (handles HTML error pages) ───
    const safeJson = useCallback(async (res: Response): Promise<any> => {
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            const text = await res.text();
            console.error(`[MT5] Server returned non-JSON (${res.status}):`, text.slice(0, 200));
            if (res.status === 504) {
                throw new Error('TIMEOUT_504');
            }
            if (res.status === 502 || res.status === 503) {
                throw new Error(`السيرفر غير متاح حالياً (${res.status}). حاول مرة أخرى بعد قليل.`);
            }
            throw new Error(`خطأ من السيرفر (${res.status}). تأكد أن الباك اند شغال.`);
        }
        return res.json();
    }, []);

    // ─── Connect to MT5 via MetaAPI provisioning ───
    const connectMT5 = useCallback(async (credentials: MT5Credentials) => {
        setConnecting(true);
        setError(null);
        setConnectStatus('جاري الاتصال بالخادم...');

        // AbortController with 120s timeout (MetaAPI provisioning can be slow)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120_000);

        // Status messages that rotate while waiting
        const statusMessages = [
            'جاري تهيئة حساب MetaAPI...',
            'جاري نشر الحساب على السحابة...',
            'جاري الاتصال بخادم البروكر...',
            'جاري المزامنة مع MT5...',
            'الرجاء الانتظار، قد يستغرق هذا دقيقة...',
            'لا يزال قيد الاتصال، جاري الانتظار...',
        ];
        let statusIdx = 0;
        const statusTimer = setInterval(() => {
            if (statusIdx < statusMessages.length) {
                setConnectStatus(statusMessages[statusIdx]);
                statusIdx++;
            }
        }, 8000);

        try {
            const res = await fetch(`${MT5_API_BASE}/connect/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            clearInterval(statusTimer);
            const data = await safeJson(res);
            if (!mountedRef.current) return;

            if (data.connected && data.account_id) {
                setConnected(true);
                setAccountId(data.account_id);
                if (data.session_token) setSessionToken(data.session_token);
                if (data.account) setAccount(data.account);
                setConnectStatus('');
                playConnected();
            } else {
                setConnected(false);
                setError(data.error || "Failed to connect / provision account");
                setConnectStatus('');
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            clearInterval(statusTimer);
            if (mountedRef.current) {
                setConnected(false);
                if (err.name === 'AbortError') {
                    setError('انتهت مهلة الاتصال (120 ثانية). حاول مرة أخرى.');
                } else {
                    setError("Cannot reach MT5 backend. Check server status or CORS settings.");
                }
                setConnectStatus('');
            }
        } finally {
            if (mountedRef.current) setConnecting(false);
        }
    }, []);

    // ─── Disconnect ───
    const disconnectMT5 = useCallback(async () => {
        const aid = accountIdRef.current;
        try {
            await fetch(`${MT5_API_BASE}/disconnect/?account_id=${aid}`);
        } catch { /* ignore */ }
        if (mountedRef.current) {
            setConnected(false);
            setAccount(null);
            setPositions([]);
            setHistory([]);
            setSessionToken('');
            // Keep accountId in localStorage so re-connect is faster
        }
    }, []);

    // ─── Auto-reconnect if accountId exists ───
    useEffect(() => {
        if (accountId && !connected && !connecting) {
            // Verify the account is still valid by fetching account info
            // Server allows through if no session exists (e.g. server restarted)
            (async () => {
                try {
                    const headers: Record<string, string> = {};
                    if (sessionToken) headers['X-Session-Token'] = sessionToken;
                    const res = await fetch(`${MT5_API_BASE}/account/?account_id=${accountId}`, {
                        headers,
                    });
                    const data = await safeJson(res);
                    if (handleSessionExpired(data, res)) return;
                    if (mountedRef.current && data.account) {
                        setConnected(true);
                        setAccount(data.account);
                    }
                } catch { /* ignore — user will need to reconnect */ }
            })();
        }
    }, []); // Only on mount

    // ─── Refresh Account Info (with 1 retry) ───
    const refreshAccount = useCallback(async () => {
        const aid = accountIdRef.current;
        if (!connected || !aid) return;
        setAccountLoading(true);
        try {
            const res = await fetch(`${MT5_API_BASE}/account/?account_id=${aid}`, {
                headers: getHeaders(),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return;
            if (mountedRef.current && data.account) {
                setAccount(data.account);
            }
        } catch {
            // Retry once after 2s — backend may be auto-reconnecting
            try {
                await new Promise(r => setTimeout(r, 2000));
                const res = await fetch(`${MT5_API_BASE}/account/?account_id=${aid}`, { headers: getHeaders() });
                const data = await safeJson(res);
                if (mountedRef.current && data.account) setAccount(data.account);
            } catch { /* ignore retry failure */ }
        }
        finally { if (mountedRef.current) setAccountLoading(false); }
    }, [connected, getHeaders, handleSessionExpired]);

    // ─── Refresh Positions (with 1 retry) ───
    const refreshPositions = useCallback(async () => {
        const aid = accountIdRef.current;
        if (!connected || !aid) return;
        setPositionsLoading(true);
        try {
            const res = await fetch(`${MT5_API_BASE}/positions/?account_id=${aid}`, {
                headers: getHeaders(),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return;
            if (data.syncing) {
                // Do not overwrite positions if the server is temporarily syncing
                return;
            }
            if (mountedRef.current && data.positions) {
                setPositions(data.positions);
            }
        } catch {
            // Retry once after 2s — backend may be auto-reconnecting
            try {
                await new Promise(r => setTimeout(r, 2000));
                const res = await fetch(`${MT5_API_BASE}/positions/?account_id=${aid}`, { headers: getHeaders() });
                const data = await safeJson(res);
                if (mountedRef.current && data.positions) setPositions(data.positions);
            } catch { /* ignore retry failure */ }
        }
        finally { if (mountedRef.current) setPositionsLoading(false); }
    }, [connected, getHeaders, handleSessionExpired]);

    // ─── Refresh History ───
    const refreshHistory = useCallback(async (days: number = 30) => {
        const aid = accountIdRef.current;
        if (!connected || !aid) return;
        setHistoryLoading(true);
        try {
            const res = await fetch(`${MT5_API_BASE}/history/?account_id=${aid}&days=${days}`, {
                headers: getHeaders(),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return;
            if (mountedRef.current && data.deals) {
                setHistory(data.deals);
            }
        } catch { /* ignore */ }
        finally { if (mountedRef.current) setHistoryLoading(false); }
    }, [connected, getHeaders, handleSessionExpired]);

    // ─── Auto-poll when connected (every 5s) ───
    useEffect(() => {
        let isActive = true;
        if (!connected) {
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
                pollTimerRef.current = null;
            }
            return;
        }

        const runPoll = async () => {
            if (!isActive) return;
            // Initial fetch sequentially and safely to prevent starvation
            await refreshAccount();
            if (!isActive) return;
            await refreshPositions();
            if (!isActive) return;
            await refreshHistory();

            const pollLoop = async () => {
                if (!isActive) return;
                pollTimerRef.current = setTimeout(async () => {
                    if (!isActive) return;
                    await refreshAccount();
                    if (!isActive) return;
                    await refreshPositions();
                    pollLoop();
                }, 5000);
            };
            pollLoop();
        };

        runPoll();

        return () => {
            isActive = false;
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
    }, [connected, refreshAccount, refreshPositions, refreshHistory]);

    // ─── Cleanup on unmount ───
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, []);

    // ─── Execute Trade (with account_id + session token) ───
    const executeTrade = useCallback(async (
        symbol: string, action: string, volume: number, sl?: number, tp?: number, comment?: string
    ): Promise<MT5TradeResult | null> => {
        const aid = accountIdRef.current;
        if (!connected || !aid) {
            setError('Not connected to MT5');
            return null;
        }
        try {
            // ── Safeguard: clamp volume to 0.01–10 ──
            const safeVolume = Math.max(0.01, Math.min(10, Number(volume) || 0.01));
            if (safeVolume !== volume) {
                console.warn(`[MT5] ⚠️ Volume was ${volume}, clamped to ${safeVolume}`);
            }
            console.log(`[MT5] Trade request: ${action} ${symbol} vol=${safeVolume} sl=${sl} tp=${tp} comment=${comment}`);
            const res = await fetch(`${MT5_API_BASE}/trade/`, {
                method: 'POST',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    account_id: aid,
                    symbol, action, volume: safeVolume,
                    sl: sl || undefined,
                    tp: tp || undefined,
                    comment: comment || 'PhaseX',
                }),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return null;
            if (data.success && data.order) {
                playTradeExecuted();
                // Delay refresh to let MetaAPI sync new positions
                setTimeout(() => { refreshPositions(); refreshAccount(); }, 1500);
                return data.order as MT5TradeResult;
            } else {
                const errMsg = data.error || 'Trade execution failed';
                console.error('[MT5] Trade failed:', errMsg);
                setError(errMsg);
                setTradeError({ message: errMsg, symbol, action });
                playTradeFailed();
                throw new Error(errMsg);
            }
        } catch (e: any) {
            // Handle 504 Gateway Timeout — trade might have gone through
            if (e?.message === 'TIMEOUT_504') {
                console.warn('[MT5] 504 timeout on trade — checking if trade went through...');
                setError('⏳ السيرفر أخذ وقت طويل. جاري التحقق من الصفقة...');
                // Wait a moment then check positions
                await new Promise(r => setTimeout(r, 3000));
                try {
                    const posRes = await fetch(`${MT5_API_BASE}/positions/?account_id=${aid}`, {
                        headers: getHeaders(),
                    });
                    const posData = await safeJson(posRes);
                    if (posData.positions) {
                        setPositions(posData.positions);
                        // Check if a new position appeared for this symbol
                        const hasNewPos = posData.positions.some(
                            (p: any) => p.symbol.toUpperCase().includes(symbol.toUpperCase().replace(/[.\-_]/g, ''))
                        );
                        if (hasNewPos) {
                            setError(null);
                            refreshAccount();
                            return null; // Trade likely succeeded
                        }
                    }
                } catch { /* ignore check failure */ }
                setError('⚠️ انتهت مهلة السيرفر (504). تحقق من الصفقات يدوياً في MT5.');
                return null;
            }
            if (e?.message && e.message !== 'Failed to fetch') {
                throw e;
            }
            setError('Failed to reach MT5 backend for trade execution');
            throw new Error('Failed to reach MT5 backend for trade execution');
        }
    }, [connected, refreshPositions, refreshAccount, getHeaders, handleSessionExpired, safeJson]);

    // ─── Bulk Execute Trades (Socket-Like: fire → poll for results) ───
    const bulkExecuteTrades = useCallback(async (
        trades: Array<{symbol: string, action: string, volume: number, sl?: number, tp?: number, comment?: string}>
    ): Promise<{orders: any[], errors: any[]}> => {
        const aid = accountIdRef.current;
        if (!connected || !aid) {
            setError('Not connected to MT5');
            return { orders: [], errors: [{error: 'Not connected'}] };
        }
        try {
            const safeTrades = trades.map(t => ({
                ...t,
                volume: Math.max(0.01, Math.min(10, Number(t.volume) || 0.01)),
                comment: t.comment || 'PhaseX',
            }));
            console.log(`[MT5] 🚀 FIRE: ${safeTrades.length} trades`);

            // 1. FIRE — instant return (~20ms)
            const res = await fetch(`${MT5_API_BASE}/trade-bulk/`, {
                method: 'POST',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ account_id: aid, trades: safeTrades }),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return { orders: [], errors: [{error: 'Session expired'}] };

            if (!data.success) {
                const errMsg = data.error || 'Bulk execution failed';
                setError(errMsg);
                setTradeError({ message: errMsg, title: 'Bulk Execution Failed' });
                return { orders: [], errors: [{error: errMsg}] };
            }

            // Direct execution (Redis fallback) — results already here
            if (!data.queued) {
                if (data.orders?.length > 0) playTradeExecuted();
                if (data.errors?.length > 0) {
                    const errMsgs = data.errors.map((e: any) => e.error || e.message || 'Unknown error');
                    setTradeError({ message: errMsgs.join('\n'), title: 'Trade Execution Errors', details: errMsgs });
                }
                // Delay refresh to let MetaAPI sync new positions
                setTimeout(() => { refreshPositions(); refreshAccount(); }, 1500);
                return { orders: data.orders || [], errors: data.errors || [] };
            }

            // 2. POLL — check for results (Redis queue mode)
            const jobId = data.job_id;
            console.log(`[MT5] ⏳ Job ${jobId} queued, polling...`);
            const pollStart = Date.now();
            while (Date.now() - pollStart < 25000) {
                await new Promise(r => setTimeout(r, 200));
                try {
                    const pollRes = await fetch(`${MT5_API_BASE}/trade-result/${jobId}/`, { headers: getHeaders() });
                    const pollData = await safeJson(pollRes);
                    if (!pollData.pending) {
                        console.log(`[MT5] ✅ Job ${jobId}: ${pollData.executed || 0} executed`);
                        if (pollData.orders?.length > 0) playTradeExecuted();
                        if (pollData.errors?.length > 0) {
                            const errMsgs = pollData.errors.map((e: any) => e.error || e.message || 'Unknown error');
                            setTradeError({ message: errMsgs.join('\n'), title: 'Trade Execution Errors', details: errMsgs });
                        }
                        setTimeout(() => { refreshPositions(); refreshAccount(); }, 1500);
                        return { orders: pollData.orders || [], errors: pollData.errors || [] };
                    }
                } catch { /* retry */ }
            }
            refreshPositions();
            return { orders: [], errors: [{error: 'Execution in progress, check positions'}] };
        } catch (e: any) {
            console.error('[MT5] Bulk execution error:', e);
            setError('Bulk execution failed');
            return { orders: [], errors: [{error: e?.message || 'Unknown'}] };
        }
    }, [connected, refreshPositions, refreshAccount, getHeaders, handleSessionExpired, safeJson]);

    // ─── Close Position (with account_id + session token) ───
    const closePosition = useCallback(async (ticket: number): Promise<boolean> => {
        const aid = accountIdRef.current;
        if (!connected || !aid) {
            setError('Not connected to MT5');
            return false;
        }
        try {
            const res = await fetch(`${MT5_API_BASE}/close-position/`, {
                method: 'POST',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ account_id: aid, ticket }),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return false;
            if (data.success) {
                playPositionClosed();
                refreshPositions();
                refreshAccount();
                return true;
            } else {
                setError(data.error || 'Failed to close position');
                return false;
            }
        } catch {
            setError('Failed to reach MT5 backend');
            return false;
        }
    }, [connected, refreshPositions, refreshAccount, getHeaders, handleSessionExpired]);

    // ─── Close All Positions (with account_id + session token) ───
    const closeAllPositions = useCallback(async (): Promise<boolean> => {
        const aid = accountIdRef.current;
        if (!connected || !aid) {
            setError('Not connected to MT5');
            return false;
        }
        try {
            const res = await fetch(`${MT5_API_BASE}/close-all-positions/`, {
                method: 'POST',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ account_id: aid }),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return false;
            if (data.success) {
                refreshPositions();
                refreshAccount();
                return true;
            } else {
                setError(data.error || 'Failed to close all positions');
                return false;
            }
        } catch {
            setError('Failed to reach MT5 backend');
            return false;
        }
    }, [connected, refreshPositions, refreshAccount, getHeaders, handleSessionExpired]);

    // ─── Symbol Overrides ───
    const fetchOverrides = useCallback(async () => {
        try {
            const res = await fetch(`${MT5_API_BASE}/symbol-overrides/`);
            const data = await safeJson(res);
            if (data.overrides) setSymbolOverrides(data.overrides);
        } catch { /* ignore */ }
    }, []);

    const setSymbolOverride = useCallback(async (dashboardName: string, brokerName: string): Promise<boolean> => {
        try {
            const res = await fetch(`${MT5_API_BASE}/symbol-overrides/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dashboard_name: dashboardName, broker_name: brokerName }),
            });
            const data = await safeJson(res);
            if (data.success && data.overrides) {
                setSymbolOverrides(data.overrides);
                return true;
            }
            return false;
        } catch { return false; }
    }, []);

    const deleteSymbolOverride = useCallback(async (dashboardName: string): Promise<boolean> => {
        try {
            const res = await fetch(`${MT5_API_BASE}/symbol-overrides/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dashboard_name: dashboardName, delete: true }),
            });
            const data = await safeJson(res);
            if (data.success) {
                setSymbolOverrides(prev => { const n = { ...prev }; delete n[dashboardName.toUpperCase()]; return n; });
                return true;
            }
            return false;
        } catch { return false; }
    }, []);

    // Fetch overrides when connected
    useEffect(() => {
        if (connected) fetchOverrides();
    }, [connected, fetchOverrides]);

    // ─── Trade History API (server-side, with account_id) ───
    const [serverTradeHistory, setServerTradeHistory] = useState<any[]>([]);




    const fetchTradeHistory = useCallback(async () => {
        const aid = accountIdRef.current;
        if (!aid) return;
        try {
            const res = await fetch(`${MT5_API_BASE}/trade-history/?account_id=${aid}`, {
                headers: getHeaders()
            });
            const data = await safeJson(res);
            if (data.success) setServerTradeHistory(data.history || []);
        } catch { /* ignore */ }
    }, [getHeaders, safeJson]);



    const addTradeToHistory = useCallback(async (entry: any): Promise<boolean> => {
        const aid = accountIdRef.current;
        if (!aid) return false;
        try {
            const res = await fetch(`${MT5_API_BASE}/trade-history/add/`, {
                method: 'POST',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ ...entry, account_id: aid }),
            });
            const data = await safeJson(res);
            if (data.success) {
                fetchTradeHistory();
                return true;
            }
            return false;
        } catch { return false; }
    }, [fetchTradeHistory, getHeaders, safeJson]);

    const clearServerHistory = useCallback(async (): Promise<boolean> => {
        const aid = accountIdRef.current;
        if (!aid) return false;
        try {
            const res = await fetch(`${MT5_API_BASE}/trade-history/clear/`, {
                method: 'POST',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ account_id: aid }),
            });
            const data = await safeJson(res);
            if (data.success) {
                setServerTradeHistory([]);
                return true;
            }
            return false;
        } catch { return false; }
    }, [getHeaders, safeJson]);

    // Poll trade history when connected
    useEffect(() => {
        if (!connected) return;
        let isActive = true;
        let timer: ReturnType<typeof setTimeout> | null = null;
        
        const poll = async () => {
            if (!isActive) return;
            await fetchTradeHistory();
            
            if (isActive) {
                timer = setTimeout(poll, 10000);
            }
        };
        
        poll();
        
        return () => {
            isActive = false;
            if (timer) clearTimeout(timer);
        };
    }, [connected, fetchTradeHistory]);

    // ─── Auto-Trade State ───
    const [autoTrades, setAutoTrades] = useState<any[]>([]);
    const [autoTradeWorker, setAutoTradeWorker] = useState<any>(null);
    const [autoTradeHistory, setAutoTradeHistory] = useState<any[]>([]);

    const fetchAutoTradeStatus = useCallback(async () => {
        const aid = accountIdRef.current;
        if (!connected || !aid) return;
        try {
            const res = await fetch(`${MT5_API_BASE}/auto-trade/status/?account_id=${aid}`, { headers: getHeaders() });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return;
            if (data?.success) {
                setAutoTrades(data.auto_trades || []);
                setAutoTradeWorker(data.worker || null);
            }
        } catch { /* ignore */ }
    }, [connected, getHeaders, handleSessionExpired, safeJson]);

    const fetchAutoTradeHistory = useCallback(async (limit = 50) => {
        const aid = accountIdRef.current;
        if (!connected || !aid) return;
        try {
            const res = await fetch(`${MT5_API_BASE}/auto-trade/history/?account_id=${aid}&limit=${limit}`, { headers: getHeaders() });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return;
            if (data?.success) {
                setAutoTradeHistory(data.logs || []);
            }
        } catch { /* ignore */ }
    }, [connected, getHeaders, handleSessionExpired, safeJson]);

    const autoTradeSubscribe = useCallback(async (
        trades: Array<{symbol: string, main_tf: string, sub_tf: string, window_size: number, direction: string, lot_size: number, sl?: number, comment: string}>
    ) => {
        const aid = accountIdRef.current;
        if (!connected || !aid) {
            setError('Not connected to MT5');
            return { subscribed: [], errors: [{ error: 'Not connected' }] };
        }
        try {
            const res = await fetch(`${MT5_API_BASE}/auto-trade/subscribe/`, {
                method: 'POST',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: aid, trades }),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return { subscribed: [], errors: [{ error: 'Session expired' }] };
            if (data?.success) {
                await fetchAutoTradeStatus();
                await fetchAutoTradeHistory();
                await refreshPositions();
            } else if (data?.errors && data.errors.length > 0) {
                const errMsgs = data.errors.map((e: any) => e.error || e.message || 'Unknown error');
                setTradeError({ message: errMsgs.join('\n'), title: 'Auto-Trade Execution Failed', details: errMsgs });
            }
            return { subscribed: data?.subscribed || [], errors: data?.errors || [] };
        } catch (e: any) {
            setError(e.message);
            setTradeError({ message: e.message, title: 'Auto-Trade Error' });
            return { subscribed: [], errors: [{ error: e.message }] };
        }
    }, [connected, getHeaders, handleSessionExpired, safeJson, fetchAutoTradeStatus, fetchAutoTradeHistory, refreshPositions]);

    const autoTradeUnsubscribe = useCallback(async (comments: string[]) => {
        const aid = accountIdRef.current;
        if (!connected || !aid) return;
        try {
            const res = await fetch(`${MT5_API_BASE}/auto-trade/unsubscribe/`, {
                method: 'POST',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: aid, comments }),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return;
            await fetchAutoTradeStatus();
            await fetchAutoTradeHistory();
        } catch { /* ignore */ }
    }, [connected, getHeaders, handleSessionExpired, fetchAutoTradeStatus, fetchAutoTradeHistory]);

    const stopAllAutoTrades = useCallback(async () => {
        if (!autoTrades || autoTrades.length === 0) return true;
        const comments = autoTrades.map((at: any) => at.comment).filter(Boolean);
        if (comments.length === 0) return true;
        
        const aid = accountIdRef.current;
        if (!connected || !aid) return false;
        try {
            const res = await fetch(`${MT5_API_BASE}/auto-trade/unsubscribe/`, {
                method: 'POST',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: aid, comments }),
            });
            const data = await safeJson(res);
            if (handleSessionExpired(data, res)) return false;
            await fetchAutoTradeStatus();
            await fetchAutoTradeHistory();
            return data?.success || false;
        } catch { return false; }
    }, [connected, autoTrades, getHeaders, handleSessionExpired, fetchAutoTradeStatus, fetchAutoTradeHistory]);

    // Poll auto-trade status every 30s
    useEffect(() => {
        if (!connected) return;
        fetchAutoTradeStatus();
        const interval = setInterval(fetchAutoTradeStatus, 30000);
        return () => clearInterval(interval);
    }, [connected, fetchAutoTradeStatus]);

    // Track Auto Trade Flips from live positions
    useEffect(() => {
        if (!connected || positions.length === 0 || autoTrades.length === 0) return;

        const activeComments = new Set(autoTrades.map((at: any) => at.comment).filter(Boolean));
        if (activeComments.size === 0) return;

        const currentPositionMap: Record<string, { ticket: number, type: string }> = {};
        
        positions.forEach(pos => {
            if (pos.comment && activeComments.has(pos.comment)) {
                currentPositionMap[pos.symbol] = { ticket: pos.ticket, type: pos.type };
            }
        });

        let changed = false;
        const newFlipCounts = { ...autoFlipCountsRef.current };

        for (const [sym, curr] of Object.entries(currentPositionMap)) {
            const prev = prevAutoPositionsRef.current[sym];
            if (prev && (prev.ticket !== curr.ticket || prev.type !== curr.type)) {
                newFlipCounts[sym] = (newFlipCounts[sym] || 0) + 1;
                changed = true;
            }
        }

        prevAutoPositionsRef.current = currentPositionMap;

        if (changed) {
            setAutoFlipCounts(newFlipCounts);
        }
    }, [positions, autoTrades, connected, setAutoFlipCounts]);

    return {
        connected,
        connecting,
        connectStatus,
        connectMT5,
        disconnectMT5,
        accountId,
        account,
        accountLoading,
        positions,
        positionsLoading,
        history,
        historyLoading,
        error,
        tradeError,
        clearTradeError,
        refreshAccount,
        refreshPositions,
        refreshHistory,
        executeTrade,
        bulkExecuteTrades,
        closePosition,
        closeAllPositions,
        symbolOverrides,
        setSymbolOverride,
        deleteSymbolOverride,
        // Server-side trade history
        serverTradeHistory,
        fetchTradeHistory,
        addTradeToHistory,
        clearServerHistory,
        // Auto-Trade
        autoTrades,
        autoTradeWorker,
        autoTradeHistory: autoTradeHistory,
        autoTradeSubscribe,
        autoTradeUnsubscribe,
        fetchAutoTradeStatus,
        fetchAutoTradeHistory,
        stopAllAutoTrades,
        autoFlipCounts,
    };
}

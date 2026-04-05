import type { MT5Account, MT5Position } from "../../hooks/useMT5";

/** Minimal shape used by modal for auto-trade rows */
export interface ServerAutoTrade {
    symbol?: string;
    is_active?: boolean;
    comment?: string;
    last_ticket?: unknown;
}

export interface AggregatedSymbolRow {
    symbol: string;
    totalPos: number;
    buyCount: number;
    sellCount: number;
    autoCount: number;
    manualCount: number;
    flipCount: number;
    profit: number;
    autoTickets: number[];
    allTickets: number[];
}

export interface MarketWatchSummary {
    totalProfit: number;
    bestSymbol: AggregatedSymbolRow | null;
    worstSymbol: AggregatedSymbolRow | null;
}

export interface MarketWatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    mt5Positions: MT5Position[];
    serverAutoTrades: ServerAutoTrade[];
    autoFlipCounts: Record<string, number>;
    closePosition: (ticket: number) => Promise<boolean>;
    autoTradeUnsubscribe?: (comments: string[]) => Promise<void>;
    mt5Account?: MT5Account | null;
    addTradeToHistory?: (entry: any) => Promise<boolean>;
}

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useThemeTokens } from "../hooks/useThemeTokens";
import { MarketWatchModalAccountStats } from "./MarketWatchModal/MarketWatchModalAccountStats";
import { MarketWatchModalHeader } from "./MarketWatchModal/MarketWatchModalHeader";
import { MarketWatchModalPositionsTable } from "./MarketWatchModal/MarketWatchModalPositionsTable";
import { MarketWatchModalSummaryCards } from "./MarketWatchModal/MarketWatchModalSummaryCards";
import type { MarketWatchModalProps, ServerAutoTrade } from "./MarketWatchModal/types";
import { useMarketWatchAggregation } from "./MarketWatchModal/useMarketWatchAggregation";

export type { MarketWatchModalProps, ServerAutoTrade } from "./MarketWatchModal/types";

export function MarketWatchModal({
    isOpen,
    onClose,
    mt5Positions,
    serverAutoTrades,
    autoFlipCounts,
    closePosition,
    autoTradeUnsubscribe,
    mt5Account,
    addTradeToHistory,
}: MarketWatchModalProps) {
    const tk = useThemeTokens();
    const [closingSymbols, setClosingSymbols] = useState<Set<string>>(new Set());
    const [closingAutoSymbols, setClosingAutoSymbols] = useState<Set<string>>(new Set());

    const { summary, aggregated } = useMarketWatchAggregation(
        mt5Positions,
        serverAutoTrades,
        autoFlipCounts,
        mt5Account
    );

    const handleCloseAuto = async (symbol: string) => {
        setClosingAutoSymbols((prev) => new Set(prev).add(symbol));
        
        const normSymbol = symbol.toUpperCase().replace(/\.(raw|p|sd|lv)|micro|m$/i, "");
        
        const commentsToStop = serverAutoTrades
            .filter((at) => {
                if (!at.symbol) return false;
                const atNorm = at.symbol.toUpperCase().replace(/\.(raw|p|sd|lv)|micro|m$/i, "");
                return atNorm.includes(normSymbol) || normSymbol.includes(atNorm);
            })
            .map((at) => at.comment)
            .filter(Boolean) as string[];

        const rowData = aggregated.find((r) => r.symbol === symbol);
        if (rowData && rowData.autoTickets.length > 0) {
            rowData.autoTickets.forEach((t) => {
                const p = mt5Positions.find((pos) => pos.ticket === t);
                if (p?.comment) {
                    commentsToStop.push(p.comment);
                }
            });
        }

        const uniqueComments = Array.from(new Set(commentsToStop));

        if (uniqueComments.length > 0 && autoTradeUnsubscribe) {
            try {
                await autoTradeUnsubscribe(uniqueComments);
            } catch (error) {
                console.error("Error stopping auto trade:", error);
            }
        }

        setClosingAutoSymbols((prev) => {
            const n = new Set(prev);
            n.delete(symbol);
            return n;
        });
    };

    const handleCloseAll = async (symbol: string, tickets: number[]) => {
        setClosingSymbols((prev) => new Set(prev).add(symbol));
        try {
            for (const t of tickets) {
                const pos = mt5Positions.find((p) => p.ticket === t);
                if (!pos) continue;
                
                try {
                    const success = await closePosition(t);
                    if (success && addTradeToHistory) {
                        try {
                            await addTradeToHistory({
                                id: `close-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                symbol: pos.symbol,
                                tf: "-",
                                action: pos.type === "BUY" ? "Buy" : "Sell",
                                volume: pos.volume,
                                entryPrice: pos.open_price,
                                sl: pos.sl || null,
                                tp: pos.tp || null,
                                ticket: pos.ticket,
                                status: "closed",
                                executedAt: pos.time_open || new Date().toISOString(),
                                signalPrice: pos.open_price,
                                profit: pos.profit,
                                closePrice: pos.current_price,
                                closedAt: new Date().toISOString(),
                            });
                        } catch (historyErr) {
                            console.error("History logging failed:", historyErr);
                        }
                    }
                } catch (posErr) {
                    console.error(`Failed to close position ${t}:`, posErr);
                }
            }
        } finally {
            setClosingSymbols((prev) => {
                const n = new Set(prev);
                n.delete(symbol);
                return n;
            });
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-[1200px] overflow-hidden rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                    style={{
                        background: tk.isDark ? "#0b0e14" : "#ffffff",
                        border: `1px solid ${tk.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    }}
                >
                    <MarketWatchModalHeader tk={tk} onClose={onClose} />
                    <MarketWatchModalSummaryCards tk={tk} summary={summary} />
                    {mt5Account && <MarketWatchModalAccountStats tk={tk} mt5Account={mt5Account} />}
                    <MarketWatchModalPositionsTable
                        tk={tk}
                        aggregated={aggregated}
                        closingAutoSymbols={closingAutoSymbols}
                        closingSymbols={closingSymbols}
                        onCloseAuto={handleCloseAuto}
                        onCloseAll={handleCloseAll}
                    />
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

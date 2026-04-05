import React from "react";
import { motion } from "motion/react";
import { Maximize2, Minimize2, Rocket, Zap, Activity } from "lucide-react";
import type { ThemeTokens } from "../../hooks/useThemeTokens";
import { SciFiClock } from "../SciFiClock";

export function TradingSignalsTableCardHeader({
    tk,
    t,
    isRTL,
    isFetching,
    lastSystemUpdate,
    allAssetNames,
    totalBuy,
    totalSell,
    expandAll,
    collapseAll,
    mt5Connected,
    globalLot,
    setGlobalLot,
    applyGlobalLot,
    isExecutingAll,
    isAutoExecutingAll,
    handleExecuteAll,
    handleAutoAll,
}: {
    tk: ThemeTokens;
    t: (k: string) => string;
    isRTL: boolean;
    isFetching: boolean;
    lastSystemUpdate: number | null;
    allAssetNames: string[];
    totalBuy: number;
    totalSell: number;
    expandAll: () => void;
    collapseAll: () => void;
    mt5Connected: boolean;
    globalLot?: number;
    setGlobalLot?: React.Dispatch<React.SetStateAction<number>>;
    applyGlobalLot?: (val: number) => void;
    isExecutingAll?: boolean;
    isAutoExecutingAll?: boolean;
    handleExecuteAll?: () => Promise<void>;
    handleAutoAll?: () => Promise<void>;
}) {
    return (
        <div className="overflow-visible" style={{ borderBottom: "1px solid rgba(99,102,241,0.06)" }}>
            <div className="px-4 sm:px-6 pt-4 pb-2 flex flex-col gap-4 max-[800px]:items-stretch min-[801px]:flex-row min-[801px]:items-center min-[801px]:justify-between overflow-visible">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-11 h-11 rounded-xl flex items-center justify-center relative"
                        style={{
                            background: "linear-gradient(135deg, #ef4444 0%, #6366f1 50%, #a855f7 100%)",
                            boxShadow: "0 4px 20px rgba(239,68,68,0.2), 0 0 30px rgba(99,102,241,0.1)",
                        }}
                    >
                        <Rocket className="w-5 h-5 text-white" />
                    </motion.div>
                    <div className="min-w-0">
                        <h3
                            className="text-base sm:text-lg font-black tracking-wider flex flex-wrap items-center gap-1 gap-y-1"
                            style={{ color: tk.textPrimary, letterSpacing: "0.05em" }}
                        >
                            PHASE{" "}
                            <span
                                className="text-xl"
                                style={{ color: "#ef4444", textShadow: "0 0 20px rgba(239,68,68,0.5)" }}
                            >
                                X
                            </span>
                            <span
                                className="text-[10px] font-bold tracking-widest uppercase ml-2 px-2 py-0.5 rounded-md"
                                style={{
                                    color: "#818cf8",
                                    background: "rgba(99,102,241,0.08)",
                                    border: "1px solid rgba(99,102,241,0.12)",
                                }}
                            >
                                Trading Dashboard
                            </span>
                        </h3>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 max-[800px]:w-full max-[800px]:justify-center min-[801px]:justify-end overflow-visible">
                    <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0"
                        style={{
                            background: "rgba(99,102,241,0.05)",
                            border: "1px solid rgba(99,102,241,0.08)",
                        }}
                    >
                        <Zap className="w-3 h-3" style={{ color: "#818cf8" }} />
                        <span className="text-[11px] font-black" style={{ color: "#818cf8" }}>
                            {allAssetNames.length}
                        </span>
                        <span className="text-[10px]" style={{ color: tk.textDim }}>
                            {t("assetsStr")}
                        </span>
                    </div>
                    <div
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                        style={{
                            background: "rgba(74,222,128,0.06)",
                            border: "1px solid rgba(74,222,128,0.1)",
                        }}
                    >
                        <span className="text-[10px]" style={{ color: "#4ade80" }}>
                            ▲
                        </span>
                        <span className="text-[11px] font-black" style={{ color: "#4ade80" }}>
                            {totalBuy}
                        </span>
                    </div>
                    <div
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                        style={{
                            background: "rgba(248,113,113,0.06)",
                            border: "1px solid rgba(248,113,113,0.1)",
                        }}
                    >
                        <span className="text-[10px]" style={{ color: "#f87171" }}>
                            ▼
                        </span>
                        <span className="text-[11px] font-black" style={{ color: "#f87171" }}>
                            {totalSell}
                        </span>
                    </div>
                    <div className="w-px h-5 mx-1" style={{ background: "rgba(99,102,241,0.08)" }} />
                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{
                            background:
                                "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)",
                            border: "1px solid rgba(16,185,129,0.15)",
                        }}
                    >
                        <div className="relative">
                            <div
                                className="w-2 h-2 rounded-full bg-emerald-500"
                                style={{ boxShadow: "0 0 8px rgba(16,185,129,0.6)" }}
                            />
                            {isFetching && (
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            )}
                        </div>
                        <span
                            className="text-[10px] font-black tracking-wider uppercase"
                            style={{ color: "#10b981" }}
                        >
                            {isFetching ? t("syncingStr") : t("live")}
                        </span>
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-6 pb-3 flex flex-col gap-4 max-[800px]:items-stretch min-[801px]:flex-row min-[801px]:items-center min-[801px]:justify-between overflow-visible">
                <div className="flex flex-wrap items-center gap-2 min-w-0 justify-center min-[801px]:justify-start">
                    <SciFiClock
                        label={t("lastUpdateStr")}
                        timeMs={lastSystemUpdate}
                        isLive={true}
                        isRTL={isRTL}
                        size="sm"
                    />
                    <SciFiClock
                        label={t("currentTimeStr")}
                        mode="currentTime"
                        isLive={true}
                        isRTL={isRTL}
                        size="sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-center min-[801px]:justify-end overflow-visible">
                    {mt5Connected && globalLot !== undefined && setGlobalLot && applyGlobalLot && handleExecuteAll && handleAutoAll && (
                        <>
                            <div className="flex items-center gap-1 md:gap-1.5 px-1.5 py-1 rounded-lg" style={{ background: tk.isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)", border: `1px solid ${tk.border}` }}>
                                <span className="text-[9px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">{isRTL ? "لوت الجميع:" : "All Lots:"}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); const newVal = Math.max(0.01, Number((globalLot - 0.01).toFixed(2))); setGlobalLot(newVal); applyGlobalLot(newVal); }} className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded text-[10px] md:text-sm font-bold bg-slate-700/50 hover:bg-slate-700 text-white transition-colors cursor-pointer">-</button>
                                <input type="number" step="0.01" min="0.01" value={globalLot} onChange={(e) => { const newVal = Math.max(0.01, parseFloat(e.target.value) || 0.01); setGlobalLot(newVal); applyGlobalLot(newVal); }} className="w-10 md:w-12 text-center text-[10px] md:text-[11px] font-black font-mono bg-transparent outline-none" style={{ color: "#fbbf24" }} />
                                <button type="button" onClick={(e) => { e.stopPropagation(); const newVal = Number((globalLot + 0.01).toFixed(2)); setGlobalLot(newVal); applyGlobalLot(newVal); }} className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded text-[10px] md:text-sm font-bold bg-slate-700/50 hover:bg-slate-700 text-white transition-colors cursor-pointer">+</button>
                            </div>
                            <button type="button" onClick={handleExecuteAll} disabled={isExecutingAll || !allAssetNames.length} className="px-3 py-1.5 flex items-center gap-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: tk.isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)", color: tk.isDark ? "#34d399" : "#059669", border: `1px solid ${tk.isDark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.3)"}` }}>
                                {isExecutingAll ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                        <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </motion.div>
                                ) : (
                                    <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                )}
                                {isRTL ? "تنفيذ الكل" : "Execute All"}
                            </button>
                            <button type="button" onClick={handleAutoAll} disabled={isAutoExecutingAll || !allAssetNames.length} className="px-3 py-1.5 flex items-center gap-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: tk.isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)", color: tk.isDark ? "#a78bfa" : "#8b5cf6", border: `1px solid ${tk.isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}` }}>
                                {isAutoExecutingAll ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                        <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </motion.div>
                                ) : (
                                    <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                )}
                                {isRTL ? "اوتو للكل" : "Auto All"}
                            </button>
                            <div className="w-px h-6 mx-1" style={{ background: "rgba(99,102,241,0.1)" }} />
                        </>
                    )}

                    <motion.button
                        type="button"
                        onClick={expandAll}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{
                            color: "#818cf8",
                            background: "rgba(99,102,241,0.06)",
                            border: "1px solid rgba(99,102,241,0.1)",
                        }}
                        title={t("expandAllStr")}
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                        type="button"
                        onClick={collapseAll}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{
                            color: "#818cf8",
                            background: "rgba(99,102,241,0.06)",
                            border: "1px solid rgba(99,102,241,0.1)",
                        }}
                        title={t("collapseAllStr")}
                    >
                        <Minimize2 className="w-3.5 h-3.5" />
                    </motion.button>

                    {mt5Connected && (
                        <>
                            <div className="w-px h-6 mx-1" style={{ background: "rgba(99,102,241,0.1)" }} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

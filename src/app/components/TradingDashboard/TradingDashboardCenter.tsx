import { motion, AnimatePresence } from "motion/react";
import {
    Lock, ChevronLeft, ChevronRight, AlertTriangle,
    TrendingUp, TrendingDown,
} from "lucide-react";
import { IndicatorChart } from "../IndicatorChart";
import { TradingSignalsTable } from "../TradingSignalsTable.tsx";
import { AITradeSignalWidget } from "../AITradeSignalWidget";
import { AdSpace } from "../AdSpace";
import { indicators, indicatorIcons } from "./indicatorsConfig";
import { generateCandlesFromReal } from "./chartGenerators";
import { TradingDashboardLockOverlay } from "./TradingDashboardLockOverlay";
import type { TradingDashboardCtx } from "./useTradingDashboard";

export function TradingDashboardCenter({ ctx }: { ctx: TradingDashboardCtx }) {
    const {
        tk, isRTL, language, t, ribbonRef,
        selectedAsset, selectedIndicator, chartData, liveChartData, setLiveChartData,
        timeframe, mtfEnabled, mtfSmallTimeframe, mtfLargeTimeframe,
        setMtfEnabled, setMtfSmallTimeframe, setMtfLargeTimeframe,
        pickAsset, pickIndicator, pickTimeframe, liveSelectedAsset, liveAssets,
        onOpenDynamics, accessToken,
        mt5Connected, mt5Connecting, mt5Error, mt5Positions,
        executeTrade, bulkExecuteTrades, addTradeToHistory, history,
        closePosition, closeAllPositions, symbolOverrides, setSymbolOverride, mt5Account,
        autoTrades, autoTradeWorker, autoTradeSubscribe, autoTradeUnsubscribe,
        stopAllAutoTrades, autoTradeHistory, fetchAutoTradeHistory, autoFlipCounts,
        clearServerHistory, fetchTradeHistory, formatTfStr,
        quickTradeModal, setQuickTradeModal, setQtSL, setQtTP, setQtSymbol, setQtError, setQtLot,
        aiMarketContext, setIsSubscriptionOpen,
    } = ctx;

    return (
        <div className="flex-1 flex flex-col gap-3 min-w-0 px-0 md:ml-3 max-md:mx-0">
          <div
            className="rounded-2xl overflow-hidden mb-1 flex-shrink-0 relative"
            style={{
              background: tk.isDark
                ? "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.04) 0%, rgba(6,10,16,0.95) 60%)"
                : tk.surface,
              border: `1px solid ${tk.isDark ? "rgba(99,102,241,0.1)" : tk.border}`,
              backdropFilter: tk.isDark ? "blur(16px)" : undefined,
              transition: "background 0.3s",
            }}
          >
            {/* Grid bg — dark only */}
            {tk.isDark && (
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(99,102,241,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.015) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
            )}
            {/* Left Arrow */}
            <button
              type="button"
              onClick={() =>
                ribbonRef.current?.scrollBy({ left: -200, behavior: "smooth" })
              }
              className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center w-6 md:w-7 cursor-pointer"
              style={{
                background: tk.isDark
                  ? "linear-gradient(90deg, rgba(6,10,16,0.9) 60%, transparent 100%)"
                  : `linear-gradient(90deg, ${tk.surface} 60%, transparent 100%)`,
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: tk.info }} />
            </button>
            {/* Right Arrow */}
            <button
              type="button"
              onClick={() =>
                ribbonRef.current?.scrollBy({ left: 200, behavior: "smooth" })
              }
              className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center w-6 md:w-7 cursor-pointer"
              style={{
                background: tk.isDark
                  ? "linear-gradient(270deg, rgba(6,10,16,0.9) 60%, transparent 100%)"
                  : `linear-gradient(270deg, ${tk.surface} 60%, transparent 100%)`,
              }}
            >
              <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: tk.info }} />
            </button>
            <div
              ref={ribbonRef}
              className="flex items-center p-0.5 gap-0.5 md:p-1 md:gap-1 overflow-x-auto hide-scrollbar mx-6 md:mx-7 relative z-10"
              style={{ scrollBehavior: "smooth" }}
            >
              {indicators.map((ind) => {
                const Icon = indicatorIcons[ind.icon] || Lock;
                const active = selectedIndicator?.id === ind.id;
                const isLocked = ind.locked === true;
                const activeColor = ind.color || tk.info;

                return (
                  <motion.button
                    key={ind.id}
                    type="button"
                    onClick={() => pickIndicator(ind)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-shrink-0 flex flex-row items-center justify-center gap-1.5 py-1.5 px-2 min-w-[88px] sm:min-w-[100px] md:min-w-[118px] xl:min-w-[140px] md:gap-2 md:py-2 md:px-3 rounded-lg md:rounded-xl cursor-pointer transition-all relative"
                    style={{
                      background: active
                        ? isLocked
                          ? "rgba(148,163,184,0.06)"
                          : `${activeColor}1a`
                        : "transparent",
                      border: `1px solid ${active ? (isLocked ? "rgba(148,163,184,0.15)" : `${activeColor}40`) : "transparent"}`,
                      boxShadow:
                        active && !isLocked && tk.isDark
                          ? `0 2px 12px ${activeColor}1a`
                          : "none",
                      opacity: isLocked ? 0.55 : 1,
                    }}
                  >
                    <div
                      className="w-6 h-6 md:w-7 md:h-7 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0 relative"
                      style={{
                        background: active
                          ? isLocked
                            ? "rgba(148,163,184,0.1)"
                            : `${activeColor}33`
                          : tk.surfaceHover,
                        border: `1px solid ${active && !isLocked ? `${activeColor}50` : tk.border}`,
                      }}
                    >
                      {isLocked ? (
                        <Lock
                          className="w-3 h-3 md:w-3.5 md:h-3.5"
                          style={{ color: tk.textMuted }}
                        />
                      ) : (
                        <Icon
                          className="w-3.5 h-3.5 md:w-4 md:h-4"
                          style={{ color: active ? activeColor : tk.textMuted }}
                          strokeWidth={active ? 2.5 : 2}
                        />
                      )}
                    </div>
                    <span
                      className="text-[9px] md:text-[10px] xl:text-[11px] font-bold tracking-wide whitespace-nowrap overflow-hidden text-ellipsis transition-colors max-w-[5.5rem] sm:max-w-[6.5rem] md:max-w-none"
                      style={{
                        color: active
                          ? isLocked
                            ? tk.textDim
                            : activeColor
                          : tk.textMuted,
                      }}
                    >
                      {isRTL ? ind.name : ind.nameEn}
                    </span>
                    {isLocked && (
                      <Lock
                        className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0"
                        style={{ color: tk.textDim }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Chart */}
          <div
            className="flex-shrink-0 relative px-0.5 sm:px-1 md:px-0 md:h-[calc(100vh-280px)] min-h-[420px]"
          >
            {/* Lock Overlay */}
            <TradingDashboardLockOverlay ctx={ctx} />
            <AnimatePresence mode="wait">
              <IndicatorChart
                key={`${selectedAsset?.id}-${selectedIndicator?.id}-${timeframe}`}
                currency={liveSelectedAsset}
                autoTrades={autoTrades}
                autoTradeWorker={autoTradeWorker}
                autoTradeSubscribe={autoTradeSubscribe}
                autoTradeUnsubscribe={autoTradeUnsubscribe}
                indicator={selectedIndicator}
                data={selectedIndicator?.locked ? [] : chartData}
                timeframe={timeframe}
                onTimeframeChange={pickTimeframe}
                onOpenDynamics={onOpenDynamics}
                mtfEnabled={mtfEnabled}
                mtfSmallTimeframe={mtfSmallTimeframe}
                mtfLargeTimeframe={mtfLargeTimeframe}
                onMtfEnabledChange={setMtfEnabled}
                onMtfSmallTimeframeChange={setMtfSmallTimeframe}
                onMtfLargeTimeframeChange={setMtfLargeTimeframe}
                generateCandlesFromReal={generateCandlesFromReal}
                onLiveChartData={setLiveChartData}
                accessToken={accessToken}
                mt5Connected={mt5Connected}
                executeTrade={executeTrade}
                bulkExecuteTrades={bulkExecuteTrades}
                mt5Positions={mt5Positions}
                addTradeToHistory={addTradeToHistory}
                serverTradeHistory={history}
                renderTradeButtons={
                  selectedAsset
                    ? () => {
                        const buyComment = `PX-Chart ${selectedAsset.symbol} ${timeframe} BUY`.slice(0, 31);
                        const sellComment = `PX-Chart ${selectedAsset.symbol} ${timeframe} SELL`.slice(0, 31);
                        const hasBuyPos = mt5Positions.some((p: any) => p.comment === buyComment);
                        const hasSellPos = mt5Positions.some((p: any) => p.comment === sellComment);

                        return (
                        <div className="flex items-center gap-1.5 ml-2">
                          <motion.button
                            whileHover={hasBuyPos ? {} : { scale: 1.06 }}
                            whileTap={hasBuyPos ? {} : { scale: 0.94 }}
                            disabled={hasBuyPos}
                            title={hasBuyPos ? '✅ صفقة منفذة على هذا التايم فريم' : undefined}
                            onClick={() => {
                              if (hasBuyPos) return;
                              setQuickTradeModal({
                                symbol: selectedAsset.symbol,
                                action: "BUY",
                                source: "Chart",
                              });
                              setQtSL("");
                              setQtTP("");
                              setQtSymbol(selectedAsset.symbol);
                              setQtError(null);
                            }}
                            className="px-3 py-1 rounded-lg text-[10px] font-black tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              background: hasBuyPos ? "rgba(100,116,139,0.08)" : "rgba(16,185,129,0.15)",
                              color: hasBuyPos ? "#64748b" : "#34d399",
                              border: hasBuyPos ? "1px solid rgba(100,116,139,0.2)" : "1px solid rgba(16,185,129,0.3)",
                            }}
                          >
                            {hasBuyPos ? '✅' : 'BUY'}
                          </motion.button>
                          <motion.button
                            whileHover={hasSellPos ? {} : { scale: 1.06 }}
                            whileTap={hasSellPos ? {} : { scale: 0.94 }}
                            disabled={hasSellPos}
                            title={hasSellPos ? '✅ صفقة منفذة على هذا التايم فريم' : undefined}
                            onClick={() => {
                              if (hasSellPos) return;
                              setQuickTradeModal({
                                symbol: selectedAsset.symbol,
                                action: "SELL",
                                source: "Chart",
                              });
                              setQtSL("");
                              setQtTP("");
                              setQtSymbol(selectedAsset.symbol);
                              setQtError(null);
                            }}
                            className="px-3 py-1 rounded-lg text-[10px] font-black tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              background: hasSellPos ? "rgba(100,116,139,0.08)" : "rgba(239,68,68,0.15)",
                              color: hasSellPos ? "#64748b" : "#f87171",
                              border: hasSellPos ? "1px solid rgba(100,116,139,0.2)" : "1px solid rgba(239,68,68,0.3)",
                            }}
                          >
                            {hasSellPos ? (language === 'ar' ? 'مُنفّذة' : 'Executed') : 'SELL'}
                          </motion.button>
                        </div>
                      );
                      }
                    : undefined
                }
              />
            </AnimatePresence>
          </div>

          {/* ═══ SIGNALS TABLE (Centered and Resized) ═══ */}
          <div className="flex justify-center w-full px-0 sm:px-1">
            <div className="w-full max-w-[1400px]">
              <TradingSignalsTable
                mt5Connected={mt5Connected}
                executeTrade={executeTrade}
                mt5Positions={mt5Positions}
                closePosition={closePosition}
                closeAllPositions={closeAllPositions}
                symbolOverrides={symbolOverrides}
                setSymbolOverride={setSymbolOverride}
                mt5Account={mt5Account}
                serverTradeHistory={history}
                serverAutoLogs={autoTradeHistory}
                fetchAutoLogs={fetchAutoTradeHistory}
                serverAutoTrades={autoTrades}
                removeAutoTrade={autoTradeUnsubscribe}
                stopAllAutoTrades={stopAllAutoTrades}
                autoTradeWorker={autoTradeWorker}
                addTradeToHistory={addTradeToHistory}
                clearServerHistory={clearServerHistory}
                fetchTradeHistory={fetchTradeHistory}
                addAutoTrade={async (key, symbol, tf, lot, direction, signalPrice, sl, tp, ticket) => {
                  const mapSubTf = (tfStr: string) => {
                    const m: Record<string, string> = { "1m": "M1", "5m": "M5", "15m": "M15", "30m": "M30", "1H": "H1", "4H": "H4", "1D": "D1", "1W": "W1", "1M": "MN1" };
                    return m[tfStr] || tfStr;
                  };
                  const res = await autoTradeSubscribe([{
                    symbol, main_tf: mtfEnabled ? formatTfStr(mtfLargeTimeframe) : formatTfStr(timeframe >= 60 ? timeframe : 60), sub_tf: mapSubTf(tf), window_size: 10, direction, lot_size: lot, sl: sl || undefined, comment: `PX-Dash ${symbol} ${tf}`.slice(0, 31)
                  }]);
                  return res.errors.length === 0;
                }}
                addAutoTradesBulk={async (trades) => {
                  const mapSubTf = (tfStr: string) => {
                    const m: Record<string, string> = { "1m": "M1", "5m": "M5", "15m": "M15", "30m": "M30", "1H": "H1", "4H": "H4", "1D": "D1", "1W": "W1", "1M": "MN1" };
                    return m[tfStr] || tfStr;
                  };
                  const res = await autoTradeSubscribe(trades.map(t => ({
                    symbol: t.symbol, main_tf: mtfEnabled ? formatTfStr(mtfLargeTimeframe) : formatTfStr(timeframe >= 60 ? timeframe : 60), sub_tf: mapSubTf(t.tf), window_size: 10, direction: t.direction, lot_size: t.lot, sl: t.sl || undefined, comment: `PX-Dash ${t.symbol} ${t.tf}`.slice(0, 31)
                  })));
                  return res.errors.length === 0;
                }}
              />
            </div>
          </div>
          {/* MT5 Error Display */}
          {mt5Error && !mt5Connected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-3 flex items-center gap-2 mt-2"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              <AlertTriangle
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "#ef4444" }}
              />
              <span
                className="text-[11px] font-bold"
                style={{ color: "#ef4444" }}
              >
                {mt5Error}
              </span>
            </motion.div>
          )}
        </div>
    );
}

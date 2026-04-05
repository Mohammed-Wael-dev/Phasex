import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MarketList } from "./MarketList";
import { BreakingNews } from "./BreakingNews";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { UserProfile } from "./UserProfile";
import { AITradeSignalWidget } from "./AITradeSignalWidget";
import { AdSpace } from "./AdSpace";
import { MarketWatchModal } from "./MarketWatchModal";
import { TradeErrorPopup } from "./TradeErrorPopup.tsx";
import { useTradingDashboard } from "./TradingDashboard/useTradingDashboard";
import { TradingDashboardHeader } from "./TradingDashboard/TradingDashboardHeader";
import { TradingDashboardCenter } from "./TradingDashboard/TradingDashboardCenter";
import { TradingDashboardQuickTradeModal } from "./TradingDashboard/TradingDashboardQuickTradeModal";
import { TradingDashboardMT5Modals } from "./TradingDashboard/TradingDashboardMT5Modals";
import { TradingDashboardMT5SubscribeModal } from "./TradingDashboard/TradingDashboardMT5SubscribeModal";
import type { TradingDashboardProps } from "./TradingDashboard/types";

export type { PhaseCandle, PhaseStateDataMap } from "./TradingDashboard/types";
export { generateCandlesFromReal } from "./TradingDashboard/chartGenerators";

export function TradingDashboard({ onLogout, onOpenDynamics }: TradingDashboardProps) {
    const ctx = useTradingDashboard(onLogout, onOpenDynamics);
  const {
        tk, isRTL, isNewsOpen, selectedAsset, selectedIndicator, timeframe,
        liveAssets, isMarketListNarrow, isMarketListCollapsed, setIsMarketListCollapsed,
        apiMarkets, marketsLoading, selectedMarket, setSelectedMarket, symbolsLoading,
        pickAsset, tradeError, clearTradeError,
        isSubscriptionOpen, setIsSubscriptionOpen, isProfileOpen, setIsProfileOpen,
        showMarketWatch, setShowMarketWatch,
        mt5Positions, autoTrades, autoFlipCounts, closePosition, autoTradeUnsubscribe, mt5Account, addTradeToHistory,
        aiMarketContext, mtfEnabled, mtfSmallTimeframe, mtfLargeTimeframe,
        setQuickTradeModal, setQtSL, setQtTP, setQtLot, setQtSymbol, setQtError,
    } = ctx;

    const marketListOverlayOpen = isMarketListNarrow && !isMarketListCollapsed;
    const marketRailTopPx = 64;

  useEffect(() => {
        if (!marketListOverlayOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsMarketListCollapsed(true);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [marketListOverlayOpen, setIsMarketListCollapsed]);

    const marketListProps = {
        assets: liveAssets,
        selectedAsset,
        onSelectAsset: pickAsset,
        isCollapsed: isMarketListCollapsed,
        onToggleCollapse: () => setIsMarketListCollapsed(!isMarketListCollapsed),
    markets: apiMarkets,
    marketsLoading,
    selectedMarket,
        onMarketSelect: setSelectedMarket,
    symbolsLoading,
    } as const;

  return (
    <>
    <TradeErrorPopup error={tradeError} onClose={clearTradeError} />
    <div
      className="min-h-screen overflow-x-hidden"
      dir={isRTL ? "rtl" : "ltr"}
            style={{ background: tk.bg, fontFamily: "'Inter', system-ui, sans-serif", transition: "background 0.3s" }}
        >
            <TradingDashboardHeader ctx={ctx} />

      <AnimatePresence>
        {isNewsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 8 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            style={{ overflow: "hidden" }}
                        className="w-full px-3 sm:px-5"
          >
            <BreakingNews selectedSymbol={selectedAsset?.symbol || "EURUSD"} />
          </motion.div>
        )}
      </AnimatePresence>

            <div className="relative z-0 flex gap-0 py-3 px-2 sm:px-3 md:px-3 lg:px-2" style={{ minHeight: "calc(100vh - 52px)" }}>
                <AnimatePresence>
                    {marketListOverlayOpen && (
                  <motion.button
                            key="market-list-backdrop"
                            type="button"
                            aria-label={isRTL ? "إغلاق قائمة الأسواق" : "Close market list"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-x-0 bottom-0 z-[35] cursor-pointer border-0 p-0"
                    style={{
                                top: marketRailTopPx,
                                background: tk.isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.35)",
                                backdropFilter: "blur(3px)",
                            }}
                            onClick={() => setIsMarketListCollapsed(true)}
                        />
                    )}
                </AnimatePresence>

                {/* Left: Market List — narrow + expanded uses fixed overlay; rail width 0 so chart uses full width */}
                    <motion.div
                    initial={false}
                    animate={{
                        width: isMarketListNarrow ? (isMarketListCollapsed ? 64 : 0) : isMarketListCollapsed ? 64 : 280,
                    }}
                    transition={{ type: "spring", damping: 26, stiffness: 220 }}
                    className={`flex-shrink-0 sticky top-0 self-start ${marketListOverlayOpen ? "z-[38] overflow-visible" : "overflow-hidden"}`}
                    style={{ height: "calc(100vh - 64px)" }}
                >
                    {marketListOverlayOpen ? (
                        <div
                            className="pointer-events-auto fixed z-[38] flex flex-col"
                      style={{
                                top: marketRailTopPx,
                                height: `calc(100vh - ${marketRailTopPx}px)`,
                                width: "min(280px, 92vw)",
                                insetInlineStart: 0,
                            }}
                        >
                            <MarketList {...marketListProps} layoutOverlay />
                    </div>
                    ) : (
                        <div className="h-full w-full min-h-0 min-w-[64px]">
                            <MarketList {...marketListProps} />
                    </div>
                    )}
                  </motion.div>

                <TradingDashboardCenter ctx={ctx} />

                {/* Right: AI Scanner & Ads */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-64 ml-4 flex-shrink-0 hidden xl:flex flex-col gap-4 sticky top-0 self-start"
          style={{ height: "calc(100vh - 64px)" }}
        >
          <AITradeSignalWidget
            marketContext={aiMarketContext}
            assetSymbol={selectedAsset?.symbol}
            timeframe={timeframe}
            mtfEnabled={mtfEnabled}
            mtfSmallTimeframe={mtfSmallTimeframe}
            mtfLargeTimeframe={mtfLargeTimeframe}
            indicatorName={selectedIndicator?.nameEn}
            onExecuteTrade={(action: string, sl?: number, tp?: number, lot?: number) => {
              if (!selectedAsset) return;
              setQuickTradeModal({ symbol: selectedAsset.symbol, action });
              setQtSL(sl ? String(sl) : "");
              setQtTP(tp ? String(tp) : "");
              if (lot) setQtLot(String(lot));
              setQtSymbol(selectedAsset.symbol);
              setQtError(null);
            }}
          />
          <AdSpace />
        </motion.div>
      </div>

            <SubscriptionPanel isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />

            <TradingDashboardQuickTradeModal ctx={ctx} />

      <AnimatePresence>
        {isProfileOpen && (
          <UserProfile
            onClose={() => setIsProfileOpen(false)}
                        onTopUp={() => { setIsProfileOpen(false); setIsSubscriptionOpen(true); }}
          />
        )}
      </AnimatePresence>

            <TradingDashboardMT5Modals ctx={ctx} />
            <TradingDashboardMT5SubscribeModal ctx={ctx} />

      <MarketWatchModal 
        isOpen={showMarketWatch} 
        onClose={() => setShowMarketWatch(false)} 
        mt5Positions={mt5Positions} 
        serverAutoTrades={autoTrades} 
        autoFlipCounts={autoFlipCounts}
        closePosition={closePosition} 
        autoTradeUnsubscribe={autoTradeUnsubscribe}
        mt5Account={mt5Account}
        addTradeToHistory={addTradeToHistory}
      />
    </div>
    </>
  );
}

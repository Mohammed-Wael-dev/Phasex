import React from "react";
import { TradingSignalsFiltersStrip } from "./TradingSignalsFiltersStrip";
import { TradingSignalsTableCardHeader } from "./TradingSignalsTableCardHeader";
import { TradingSignalsTableEmptyState } from "./TradingSignalsTableEmptyState";
import { TradingSignalsLivePositionsPanel } from "./TradingSignalsLivePositionsPanel";
import { TradingSignalsAutoBackgroundPanel } from "./TradingSignalsAutoBackgroundPanel";
import { TradingSignalsDealsHistoryPanel } from "./TradingSignalsDealsHistoryPanel";
import { TradingSignalsSignalsTable } from "./TradingSignalsSignalsTable";
import { TradingSignalsAutoLogsModal } from "./TradingSignalsAutoLogsModal";
import type { TradingSignalsTableProps } from "./types";
import { useTradingSignalsTableModel } from "./useTradingSignalsTableModel";

export function TradingSignalsTableShell(props: TradingSignalsTableProps) {
    const m = useTradingSignalsTableModel(props);
    const { tk, t, language, isFetching, fetchError, allAssetNames, isRTL, lastSystemUpdate, totalBuy, totalSell, expandAll, collapseAll, mt5Connected } = m;

    if (allAssetNames.length === 0) {
        return <TradingSignalsTableEmptyState tk={tk} t={t} language={language} isFetching={isFetching} fetchError={fetchError} />;
    }

    return (
        <>
            <div className="flex justify-center w-full mt-3 flex-shrink-0 px-1 sm:px-2 md:px-3">
                <div
                    className="rounded-2xl overflow-visible relative w-full max-w-[1400px] sm:w-[98%] md:w-[96%]"
                    style={{
                        background: tk.isDark
                            ? "linear-gradient(135deg, #080c15 0%, #0d1225 50%, #0a0f1a 100%)"
                            : `linear-gradient(135deg, ${tk.surface} 0%, ${tk.surfaceElevated} 50%, ${tk.surface} 100%)`,
                        border: `1px solid ${tk.accentGlow08}`,
                        boxShadow: `0 0 40px ${tk.accentGlow08}`,
                    }}
                >
                    <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{
                            background: "linear-gradient(90deg, transparent 0%, #6366f1 20%, #ef4444 50%, #6366f1 80%, transparent 100%)",
                            opacity: 0.6,
                        }}
                    />

                    <TradingSignalsTableCardHeader
                        tk={tk}
                        t={t}
                        isRTL={isRTL}
                        isFetching={isFetching}
                        lastSystemUpdate={lastSystemUpdate}
                        allAssetNames={allAssetNames}
                        totalBuy={totalBuy}
                        totalSell={totalSell}
                        expandAll={expandAll}
                        collapseAll={collapseAll}
                        mt5Connected={mt5Connected}
                        globalLot={m.globalLot}
                        setGlobalLot={m.setGlobalLot}
                        applyGlobalLot={m.applyGlobalLot}
                        isExecutingAll={m.isExecutingAll}
                        isAutoExecutingAll={m.isAutoExecutingAll}
                        handleExecuteAll={m.handleExecuteAll}
                        handleAutoAll={m.handleAutoAll}
                    />

                    <TradingSignalsLivePositionsPanel m={m} />
                    <TradingSignalsAutoBackgroundPanel m={m} />
                    <TradingSignalsDealsHistoryPanel m={m} />

                    <TradingSignalsFiltersStrip
                        tk={tk}
                        t={t}
                        language={language}
                        searchQuery={m.searchQuery}
                        setSearchQuery={m.setSearchQuery}
                        marketFilter={m.marketFilter}
                        setMarketFilter={m.setMarketFilter}
                        actionFilter={m.actionFilter}
                        setActionFilter={m.setActionFilter}
                        assetFilter={m.assetFilter}
                        setAssetFilter={m.setAssetFilter}
                        showAssetDropdown={m.showAssetDropdown}
                        setShowAssetDropdown={m.setShowAssetDropdown}
                        dropdownAssets={m.dropdownAssets}
                        tfFilter={m.tfFilter}
                        setTfFilter={m.setTfFilter}
                        allTimeframes={m.allTimeframes}
                        filteredAssets={m.filteredAssets}
                        allAssetNames={m.allAssetNames}
                    />

                    <TradingSignalsSignalsTable m={m} />
                </div>
            </div>

            <TradingSignalsAutoLogsModal m={m} />
        </>
    );
}

import { useState, useCallback, useMemo, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { useLivePrices } from "../../hooks/useLivePrices";
import { sortTF } from "./constants";
import type { AssetSignals, SignalEntry, TradeHistoryEntry, TradingSignalsTableProps } from "./types";
import { useEnvelopStatePolling } from "./useEnvelopStatePolling";

export function useTradingSignalsTableModel({
    mt5Connected = false,
    executeTrade,
    mt5Positions = [],
    closePosition,
    closeAllPositions,
    symbolOverrides = {},
    setSymbolOverride,
    mt5Account,
    stopAllAutoTrades,
    serverAutoTrades = [],
    addAutoTrade,
    addAutoTradesBulk,
    removeAutoTrade,
    serverTradeHistory = [],
    addTradeToHistory,
    clearServerHistory,
    serverAutoLogs = [],
    fetchAutoLogs,
}: TradingSignalsTableProps) {
    const { language, t } = useLanguage();
    const isRTL = language === "ar";
    const tk = useThemeTokens();

    const [signalData, setSignalData] = useState<AssetSignals>({});
    const [isFetching, setIsFetching] = useState(true);
    const [fetchError, setFetchError] = useState("");
    const [lastSystemUpdate, setLastSystemUpdate] = useState<number | null>(Date.now());

    const { prices: livePrices } = useLivePrices();

    const [collapsedAssets, setCollapsedAssets] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [marketFilter, setMarketFilter] = useState("ALL");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [assetFilter, setAssetFilter] = useState("ALL");
    const [tfFilter, setTfFilter] = useState("ALL");
    const [showAssetDropdown, setShowAssetDropdown] = useState(false);

    const [lotSizes, setLotSizes] = useState<Record<string, number>>({});
    const [executingTrades, setExecutingTrades] = useState<Set<string>>(new Set());
    const [executingAssetBulk, setExecutingAssetBulk] = useState<string | null>(null);
    const [globalAutoCooldown, setGlobalAutoCooldown] = useState(false);

    const [localAutoActive, setLocalAutoActive] = useState<Set<string>>(new Set());
    const [localPosActive, setLocalPosActive] = useState<Set<string>>(new Set());

    const tradeHistory = serverTradeHistory || [];
    const [showHistory, setShowHistory] = useState(false);
    const [historyLimit, setHistoryLimit] = useState(100);
    const [showPositions, setShowPositions] = useState(true);
    const [showAutoLogs, setShowAutoLogs] = useState(false);
    const [autoFilterSymbol, setAutoFilterSymbol] = useState("ALL");
    const [autoFilterDir, setAutoFilterDir] = useState("ALL");
    const [autoFilterSource, setAutoFilterSource] = useState("ALL");
    const [posFilterSymbol, setPosFilterSymbol] = useState("ALL");
    const [posFilterDir, setPosFilterDir] = useState("ALL");
    const [closingTickets, setClosingTickets] = useState<Set<number>>(new Set());
    const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
    const [editingBrokerName, setEditingBrokerName] = useState("");

    const autoTrades = useMemo(() => {
        const s = new Set<string>();
        serverAutoTrades.forEach((at) => s.add(`${at.symbol}-${at.sub_tf}`));
        return s;
    }, [serverAutoTrades]);

    const [globalLot, setGlobalLot] = useState(0.01);
    const [isExecutingAll, setIsExecutingAll] = useState(false);
    const [isAutoExecutingAll, setIsAutoExecutingAll] = useState(false);

    const applyGlobalLot = useCallback((val: number) => {
        setLotSizes((prev) => {
            const next = { ...prev };
            Object.keys(signalData).forEach((asset) => {
                const tfs = signalData[asset];
                if (tfs) {
                    Object.keys(tfs).forEach((tf) => {
                        next[`${asset}-${tf}`] = val;
                    });
                }
            });
            return next;
        });
    }, [signalData]);

    const handleExecuteAll = useCallback(async () => {
        if (!executeTrade || !mt5Connected || executingAssetBulk || isExecutingAll) return;
        setIsExecutingAll(true);
        try {
            const assetsToProcess =
                marketFilter !== "ALL"
                    ? allAssetNames.filter((a) => Object.values(signalData[a]).some((e) => e.market === marketFilter))
                    : allAssetNames;

            // We basically do what handleExecuteAsset does but for all filtered assets
            const assets = assetsToProcess.filter((a) => {
                if (assetFilter !== "ALL" && a !== assetFilter) return false;
                if (searchQuery && !a.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return true;
            });

            for (const asset of assets) {
                const tfs = signalData[asset];
                if (!tfs) continue;
                let tfKeys = Object.keys(tfs).sort(sortTF);
                if (actionFilter !== "ALL") tfKeys = tfKeys.filter((tf) => tfs[tf].net_signal === actionFilter);
                if (tfFilter !== "ALL") tfKeys = tfKeys.filter((tf) => tf === tfFilter);

                for (const tf of tfKeys) {
                    const entry = tfs[tf];
                    if (!entry.net_signal) continue;
                    // handleExecuteTrade sets its own state, but we'll wait for it
                    await handleExecuteTrade(asset, tf, entry, false);
                }
            }
        } finally {
            setIsExecutingAll(false);
        }
    }, [executeTrade, mt5Connected, executingAssetBulk, isExecutingAll, marketFilter, allAssetNames, signalData, assetFilter, searchQuery, actionFilter, tfFilter, handleExecuteTrade]);

    const handleAutoAll = useCallback(async () => {
        if (!addAutoTrade || !mt5Connected || executingAssetBulk || globalAutoCooldown || isAutoExecutingAll) return;
        setGlobalAutoCooldown(true);
        setTimeout(() => setGlobalAutoCooldown(false), 7000);
        setIsAutoExecutingAll(true);

        try {
            const assetsToProcess =
                marketFilter !== "ALL"
                    ? allAssetNames.filter((a) => Object.values(signalData[a]).some((e) => e.market === marketFilter))
                    : allAssetNames;

            const assets = assetsToProcess.filter((a) => {
                if (assetFilter !== "ALL" && a !== assetFilter) return false;
                if (searchQuery && !a.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return true;
            });

            const bulkTrades: Array<{
                key: string;
                symbol: string;
                tf: string;
                lot: number;
                direction: string;
                signalPrice: number;
                sl: number | null;
                tp: number | null;
                ticket: string;
            }> = [];

            for (const asset of assets) {
                const tfs = signalData[asset];
                if (!tfs) continue;
                let tfKeys = Object.keys(tfs).sort(sortTF);
                if (actionFilter !== "ALL") tfKeys = tfKeys.filter((tf) => tfs[tf].net_signal === actionFilter);
                if (tfFilter !== "ALL") tfKeys = tfKeys.filter((tf) => tf === tfFilter);

                for (const tf of tfKeys) {
                    const entry = tfs[tf];
                    if (!entry.net_signal) continue;
                    const key = `${asset}-${tf}`;

                    if (executingTrades.has(key)) continue;
                    if (autoTrades.has(key)) continue;

                    const lot = lotSizes[key] || 0.01;
                    const effectiveSymbol = symbolOverrides[asset] || asset;
                    const direction = entry.net_signal;

                    setExecutingTrades((prev) => new Set(prev).add(key));
                    setLocalAutoActive((prev) => new Set(prev).add(key));
                    let ticket = "";
                    const tradeComment = `PX-Dash ${asset} ${tf}`.slice(0, 31);
                    const existingManualPos = mt5Positions?.find((p) => p.comment === tradeComment);

                    if (existingManualPos) {
                        ticket = String(existingManualPos.ticket);
                    }

                    bulkTrades.push({
                        key,
                        symbol: effectiveSymbol,
                        tf,
                        lot,
                        direction,
                        signalPrice: entry.close,
                        sl: entry.stop_loss || null,
                        tp: entry.take_profit || null,
                        ticket,
                    });
                }
            }

            if (bulkTrades.length > 0) {
                if (addAutoTradesBulk) {
                    await addAutoTradesBulk(bulkTrades);
                } else {
                    for (const tr of bulkTrades) {
                        await addAutoTrade(
                            tr.key,
                            tr.symbol,
                            tr.tf,
                            tr.lot,
                            tr.direction,
                            tr.signalPrice,
                            tr.sl,
                            tr.tp,
                            tr.ticket,
                        );
                    }
                }
            }
        } finally {
            setIsAutoExecutingAll(false);
            // Don't just wipe out executingTrades, because bulk executes very fast, but let let them fade naturally. 
            // the state executingTrades is managed elsewhere for single assets. But here we just leave localAutoActive true.
        }
    }, [addAutoTrade, mt5Connected, executingAssetBulk, globalAutoCooldown, isAutoExecutingAll, marketFilter, allAssetNames, signalData, assetFilter, searchQuery, actionFilter, tfFilter, lotSizes, symbolOverrides, executingTrades, autoTrades, mt5Positions, addAutoTradesBulk]);

    const [showAutoHistoryModal, setShowAutoHistoryModal] = useState(false);
    const [nextCheckStr, setNextCheckStr] = useState<string>("");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            let targetMinute = Math.floor(minutes / 5) * 5;

            if (minutes % 5 === 0 && seconds >= 42) {
                targetMinute += 5;
            } else if (minutes % 5 !== 0) {
                targetMinute = Math.ceil(minutes / 5) * 5;
            }

            const targetDate = new Date(now);
            targetDate.setMinutes(targetMinute);
            targetDate.setSeconds(42);
            targetDate.setMilliseconds(0);

            const diff = Math.floor((targetDate.getTime() - now.getTime()) / 1000);

            if (diff <= 0) {
                setNextCheckStr("00:00");
            } else {
                const m = Math.floor(diff / 60);
                const s = Math.floor(diff % 60);
                setNextCheckStr(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEnvelopStatePolling(setSignalData, setFetchError, setIsFetching, setLastSystemUpdate);

    const toggleAsset = (asset: string) => {
        const next = new Set(collapsedAssets);
        next.has(asset) ? next.delete(asset) : next.add(asset);
        setCollapsedAssets(next);
    };

    const fmt = (val: number): string => {
        if (val === 0) return "—";
        if (val < 1) return val.toFixed(5);
        if (val < 100) return val.toFixed(4);
        if (val < 1000) return val.toFixed(2);
        return val.toFixed(1);
    };

    const calcProfit = (e: SignalEntry, mPrice: number): number => {
        if (!e.net_signal) return 0;
        return e.net_signal === "Buy" ? mPrice - e.close : e.net_signal === "Sell" ? e.close - mPrice : 0;
    };

    const handleExecuteTrade = useCallback(
        async (asset: string, tf: string, entry: SignalEntry, isAuto = false) => {
            if (!executeTrade || !mt5Connected) return;

            const tradeComment = `PX-Dash ${asset} ${tf}`.slice(0, 31);
            const hasPos = mt5Positions?.some((p) => p.comment === tradeComment) || false;
            if (hasPos) return;

            const key = `${asset}-${tf}`;
            const lot = lotSizes[key] || 0.01;
            const effectiveSL = entry.stop_loss || entry.close;

            setExecutingTrades((prev) => new Set(prev).add(key));
            setLocalPosActive((prev) => new Set(prev).add(key));

            const newEntry: TradeHistoryEntry = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                symbol: asset,
                tf,
                action: entry.net_signal,
                volume: lot,
                entryPrice: 0,
                sl: effectiveSL,
                tp: entry.take_profit || null,
                ticket: null,
                status: "pending",
                executedAt: new Date().toISOString(),
                signalPrice: entry.close,
                autoExecuted: isAuto,
            };

            try {
                const result = await executeTrade(
                    asset,
                    entry.net_signal.toUpperCase(),
                    lot,
                    effectiveSL,
                    entry.take_profit || undefined,
                    tradeComment,
                );

                if (result) {
                    newEntry.status = "filled";
                    newEntry.ticket = result.ticket;
                    newEntry.entryPrice = result.price;
                } else {
                    newEntry.status = "failed";
                    newEntry.error = "Execution returned null";
                    setLocalPosActive((prev) => {
                        const n = new Set(prev);
                        n.delete(key);
                        return n;
                    });
                }
            } catch (err: unknown) {
                newEntry.status = "failed";
                newEntry.error = err instanceof Error ? err.message : "Unknown error";
                setLocalPosActive((prev) => {
                    const n = new Set(prev);
                    n.delete(key);
                    return n;
                });
            }

            addTradeToHistory?.(newEntry);
            setExecutingTrades((prev) => {
                const n = new Set(prev);
                n.delete(key);
                return n;
            });
        },
        [executeTrade, mt5Connected, lotSizes, addTradeToHistory, mt5Positions],
    );

    const handleExecuteAsset = async (asset: string) => {
        if (!executeTrade || !mt5Connected || executingAssetBulk) return;
        setExecutingAssetBulk(asset);
        try {
            const tfs = signalData[asset];
            if (!tfs) return;
            let tfKeys = Object.keys(tfs).sort(sortTF);
            if (actionFilter !== "ALL") tfKeys = tfKeys.filter((tf) => tfs[tf].net_signal === actionFilter);
            if (tfFilter !== "ALL") tfKeys = tfKeys.filter((tf) => tf === tfFilter);

            for (const tf of tfKeys) {
                const entry = tfs[tf];
                if (!entry.net_signal) continue;
                await handleExecuteTrade(asset, tf, entry, false);
            }
        } finally {
            setExecutingAssetBulk(null);
        }
    };

    const handleAutoAsset = async (asset: string) => {
        if (!addAutoTrade || !mt5Connected || executingAssetBulk || globalAutoCooldown) return;
        setGlobalAutoCooldown(true);
        setTimeout(() => setGlobalAutoCooldown(false), 7000);
        setExecutingAssetBulk(asset);
        try {
            const tfs = signalData[asset];
            if (!tfs) return;
            let tfKeys = Object.keys(tfs).sort(sortTF);
            if (actionFilter !== "ALL") tfKeys = tfKeys.filter((tf) => tfs[tf].net_signal === actionFilter);
            if (tfFilter !== "ALL") tfKeys = tfKeys.filter((tf) => tf === tfFilter);

            const bulkTrades: Array<{
                key: string;
                symbol: string;
                tf: string;
                lot: number;
                direction: string;
                signalPrice: number;
                sl: number | null;
                tp: number | null;
                ticket: string;
            }> = [];

            for (const tf of tfKeys) {
                const entry = tfs[tf];
                if (!entry.net_signal) continue;
                const key = `${asset}-${tf}`;

                if (executingTrades.has(key)) continue;
                if (autoTrades.has(key)) continue;

                const lot = lotSizes[key] || 0.01;
                const effectiveSymbol = symbolOverrides[asset] || asset;
                const direction = entry.net_signal;

                setExecutingTrades((prev) => new Set(prev).add(key));
                setLocalAutoActive((prev) => new Set(prev).add(key));
                let ticket = "";
                const tradeComment = `PX-Dash ${asset} ${tf}`.slice(0, 31);
                const existingManualPos = mt5Positions?.find((p) => p.comment === tradeComment);

                if (existingManualPos) {
                    ticket = String(existingManualPos.ticket);
                }

                bulkTrades.push({
                    key,
                    symbol: effectiveSymbol,
                    tf,
                    lot,
                    direction,
                    signalPrice: entry.close,
                    sl: entry.stop_loss || null,
                    tp: entry.take_profit || null,
                    ticket,
                });
            }

            if (bulkTrades.length > 0) {
                if (addAutoTradesBulk) {
                    await addAutoTradesBulk(bulkTrades);
                } else {
                    for (const tr of bulkTrades) {
                        await addAutoTrade(
                            tr.key,
                            tr.symbol,
                            tr.tf,
                            tr.lot,
                            tr.direction,
                            tr.signalPrice,
                            tr.sl,
                            tr.tp,
                            tr.ticket,
                        );
                    }
                }
            }
        } finally {
            setExecutingAssetBulk(null);
            setExecutingTrades((prev) => new Set([...prev].filter((k) => !k.startsWith(`${asset}-`))));
        }
    };

    const [closingAllPositions, setClosingAllPositions] = useState(false);
    const handleCloseAllPositions = async () => {
        if (!closeAllPositions || mt5Positions.length === 0) return;
        setClosingAllPositions(true);
        await closeAllPositions();
        setClosingAllPositions(false);
    };

    const allAssetNames = useMemo(() => Object.keys(signalData).sort(), [signalData]);

    const expandAll = () => setCollapsedAssets(new Set());
    const collapseAll = () => setCollapsedAssets(new Set(allAssetNames));

    const filteredAssets = useMemo(() => {
        return allAssetNames.filter((asset) => {
            if (searchQuery && !asset.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (assetFilter !== "ALL" && asset !== assetFilter) return false;
            const tfs = signalData[asset];
            const entries = Object.values(tfs);
            if (entries.length === 0) return false;
            if (marketFilter !== "ALL" && !entries.some((e) => e.market === marketFilter)) return false;
            if (actionFilter !== "ALL" && !entries.some((e) => e.net_signal === actionFilter)) return false;
            return true;
        });
    }, [signalData, searchQuery, marketFilter, actionFilter, assetFilter, allAssetNames]);

    const totalBuy = useMemo(() => {
        let c = 0;
        for (const tfs of Object.values(signalData)) for (const e of Object.values(tfs)) if (e.net_signal === "Buy") c++;
        return c;
    }, [signalData]);

    const totalSell = useMemo(() => {
        let c = 0;
        for (const tfs of Object.values(signalData)) for (const e of Object.values(tfs)) if (e.net_signal === "Sell") c++;
        return c;
    }, [signalData]);

    const dropdownAssets = useMemo(() => {
        if (marketFilter === "ALL") return allAssetNames;
        return allAssetNames.filter((a) => Object.values(signalData[a]).some((e) => e.market === marketFilter));
    }, [allAssetNames, signalData, marketFilter]);

    const allTimeframes = useMemo(() => {
        const set = new Set<string>();
        for (const tfs of Object.values(signalData)) for (const tf of Object.keys(tfs)) set.add(tf);
        return Array.from(set).sort(sortTF);
    }, [signalData]);

    return {
        language,
        t,
        isRTL,
        tk,
        signalData,
        isFetching,
        fetchError,
        lastSystemUpdate,
        livePrices,
        collapsedAssets,
        searchQuery,
        setSearchQuery,
        marketFilter,
        setMarketFilter,
        actionFilter,
        setActionFilter,
        assetFilter,
        setAssetFilter,
        tfFilter,
        setTfFilter,
        showAssetDropdown,
        setShowAssetDropdown,
        lotSizes,
        setLotSizes,
        executingTrades,
        executingAssetBulk,
        globalAutoCooldown,
        localAutoActive,
        setLocalAutoActive,
        localPosActive,
        tradeHistory,
        showHistory,
        setShowHistory,
        historyLimit,
        setHistoryLimit,
        showPositions,
        setShowPositions,
        showAutoLogs,
        setShowAutoLogs,
        autoFilterSymbol,
        setAutoFilterSymbol,
        autoFilterDir,
        setAutoFilterDir,
        autoFilterSource,
        setAutoFilterSource,
        posFilterSymbol,
        setPosFilterSymbol,
        posFilterDir,
        setPosFilterDir,
        closingTickets,
        setClosingTickets,
        editingSymbol,
        setEditingSymbol,
        editingBrokerName,
        setEditingBrokerName,
        autoTrades,
        showAutoHistoryModal,
        setShowAutoHistoryModal,
        nextCheckStr,
        mt5Connected,
        executeTrade,
        mt5Positions,
        closePosition,
        closeAllPositions,
        symbolOverrides,
        setSymbolOverride,
        mt5Account,
        stopAllAutoTrades,
        serverAutoTrades,
        addAutoTrade,
        addAutoTradesBulk,
        removeAutoTrade,
        addTradeToHistory,
        clearServerHistory,
        serverAutoLogs,
        fetchAutoLogs,
        toggleAsset,
        expandAll,
        collapseAll,
        fmt,
        calcProfit,
        handleExecuteTrade,
        handleExecuteAsset,
        handleAutoAsset,
        closingAllPositions,
        setClosingAllPositions,
        handleCloseAllPositions,
        allAssetNames,
        filteredAssets,
        totalBuy,
        totalSell,
        dropdownAssets,
        allTimeframes,
        globalLot,
        setGlobalLot,
        applyGlobalLot,
        isExecutingAll,
        isAutoExecutingAll,
        handleExecuteAll,
        handleAutoAll,
    };
}

export type TradingSignalsTableModel = ReturnType<typeof useTradingSignalsTableModel>;

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'ethers';
import { useEthersProvider, useEthersSigner } from '../hooks/useEthers';
import { useBalances } from '../hooks/useBalances';
import { useNotifications } from './NotificationProvider';
import { TOKENS } from '../constants/tokens';
import { getPoolReserves, addLiquidity, removeLiquidity, approveToken, getPoolTotalSupply } from '../services/poolService';
import { formatTokenAmount, formatUSD, formatCompactNumber, formatCompactUSD } from '../utils/formatters';
import { Plus, Minus, RefreshCw, Info, AlertTriangle, Droplets, ArrowUpRight, Wallet, Library, X } from 'lucide-react';
import TransactionModal from './TransactionModal';

const PoolCard = ({ token, pair, provider, signer, balances, fetchBalances, showTransaction, refreshing, isExpanded, onEnter, onClose, mode, setMode, setIsTxModalOpen }) => {
    const [reserves, setReserves] = useState({ resToken: 0n, resPair: 0n });
    const [totalLPSupply, setTotalLPSupply] = useState(0n);
    const [loading, setLoading] = useState(true);
    // mode and setMode are now passed from parent to sync UI positioning
    const [amountToken, setAmountToken] = useState('');
    const [amountPair, setAmountPair] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [focusedField, setFocusedField] = useState(null); // 'pair', 'token', or 'lp'
    const [amountLP, setAmountLP] = useState('');
    const [lpBalance, setLpBalance] = useState('0.00');

    // Update lpBalance when balances state changes
    useEffect(() => {
        const key = `LP_${pair.symbol}_${token.symbol}`;
        if (balances[key]) {
            setLpBalance(balances[key]);
        }
    }, [balances, token.symbol, pair.symbol]);

    const fetchReserves = useCallback(async () => {
        if (!provider) return;
        setLoading(true);
        try {
            const data = await getPoolReserves(provider, pair, token);
            if (data) {
                if (data.token0.toLowerCase() === token.address.toLowerCase()) {
                    setReserves({ resToken: data.reserve0, resPair: data.reserve1 });
                } else {
                    setReserves({ resToken: data.reserve1, resPair: data.reserve0 });
                }
            }
            const supply = await getPoolTotalSupply(provider, pair, token);
            setTotalLPSupply(supply);
        } catch (error) {
            console.error(`Error fetching reserves for ${token.symbol}/${pair.symbol}:`, error);
        } finally {
            setLoading(false);
        }
    }, [provider, token, pair]);

    useEffect(() => {
        fetchReserves();
    }, [fetchReserves]);

    useEffect(() => {
        if (refreshing) fetchReserves();
    }, [refreshing, fetchReserves]);

    const calculateEquivalent = (value, isPairInput) => {
        if (!reserves.resToken || !reserves.resPair || !value || isNaN(parseFloat(value))) return '';

        const amount = parseFloat(value);
        // We MUST format the reserves into human-readable numbers before calculating ratio
        // because USDC has 6 decimals while others have 18.
        const resTokenNum = parseFloat(formatUnits(reserves.resToken, token.decimals));
        const resPairNum = parseFloat(formatUnits(reserves.resPair, pair.decimals));

        if (resTokenNum === 0 || resPairNum === 0) return '';

        if (isPairInput) {
            // ΔToken = ΔPair * (resToken / resPair)
            const ratio = resTokenNum / resPairNum;
            return (amount * ratio).toFixed(6).replace(/\.?0+$/, '');
        } else {
            // ΔPair = ΔToken * (resPair / resToken)
            const ratio = resPairNum / resTokenNum;
            return (amount * ratio).toFixed(2).replace(/\.?0+$/, '');
        }
    };

    const handlePairChange = (val) => {
        setAmountPair(val);
        if (mode === 'add' && reserves.resToken > 0n && reserves.resPair > 0n) {
            setAmountToken(calculateEquivalent(val, true));
        }
    };

    const handleTokenChange = (val) => {
        setAmountToken(val);
        if (mode === 'add' && reserves.resToken > 0n && reserves.resPair > 0n) {
            setAmountPair(calculateEquivalent(val, false));
        }
    };

    const handleAction = () => {
        if (!amountToken || !amountPair) return;
        setShowModal(true);
        if (setIsTxModalOpen) setIsTxModalOpen(true);
    };

    const handleExecute = async () => {
        if (!signer || !amountToken || !amountPair) return;
        setIsProcessing(true);
        try {
            let tx;
            if (mode === 'add') {
                tx = await addLiquidity(signer, pair, token, amountPair, amountToken);
                showTransaction('add_liquidity', Promise.resolve(tx), {
                    pendingMessage: `Adding ${amountToken} ${token.symbol} and ${amountPair} ${pair.symbol} to pool...`,
                    successMessage: `Successfully added liquidity to ${token.symbol}/${pair.symbol} pool`,
                });
            } else {
                // For remove, we use the LP amount (shares) directly.
                // We use floor logic implicitly by passing the exact string the user typed (amountLP).
                // If the user selected MAX, amountLP comes from the balance.
                // We need to ensure we don't pass '0' or undefined if empty.
                const sharesToBurn = amountLP || '0';

                tx = await removeLiquidity(signer, pair, token, sharesToBurn);

                showTransaction('remove_liquidity', Promise.resolve(tx), {
                    pendingMessage: `Removing liquidity from ${token.symbol}/${pair.symbol} pool...`,
                    successMessage: `Successfully removed liquidity from ${token.symbol}/${pair.symbol} pool`,
                });
            }

            // Wait for confirmation before updating balances
            await tx.wait();

            fetchBalances();
            fetchReserves();
            setAmountToken('');
            setAmountPair('');

            return tx;
        } catch (error) {
            console.error('Liquidity error:', error); // Let modal handle error state
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    const checkInsufficient = () => {
        if (mode === 'remove') return null;
        const balToken = parseFloat((balances[token.symbol] || '0').replace(/,/g, ''));
        const balPair = parseFloat((balances[pair.symbol] || '0').replace(/,/g, ''));
        if (parseFloat(amountPair || 0) > balPair) return pair.symbol;
        if (parseFloat(amountToken || 0) > balToken) return token.symbol;
        return null;
    };

    const insufficientToken = checkInsufficient();


    return (
        <div
            id={`pool-${token.symbol}-${pair.symbol}`}
            className={`glass-card flex flex-col border-[#5cb849]/20 hover:border-[#5cb849]/12 transition-all duration-700 group relative overflow-hidden scroll-mt-24 ${isExpanded ? 'p-5 w-full shadow-[0_0_50px_rgba(92,184,73,0.15)] bg-black/60 backdrop-blur-2xl ring-1 ring-[#5cb849]/30' : 'p-6 h-full cursor-pointer hover:shadow-[0_0_25px_rgba(92,184,73,0.005)]'
                }`}
            onClick={!isExpanded ? onEnter : undefined}
        >
            {/* Refreshing Overlay */}
            {refreshing && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300">
                    <div className="w-12 h-12 border-4 border-[#5cb849]/20 border-t-[#5cb849] rounded-full animate-spin"></div>
                </div>
            )}


            {/* Close Button UI */}
            {isExpanded && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-3 left-3 z-[60] p-2 rounded-full bg-[#1a1a1a] text-gray-400 hover:text-white transition-all border border-[#2a2a2a] hover:border-[#5cb849]/40 shadow-xl hover:scale-110 active:scale-95"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Pair Header (Compact/Expanded) */}
            <div className={`flex items-center justify-between px-1 transition-all duration-700 ${isExpanded ? 'mb-4' : 'mb-2'}`}>
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-4">
                        <div className={`${isExpanded ? 'w-14 h-14' : 'w-12 h-12'} rounded-full border-2 border-[#1a1a1a] bg-[#111] p-1.5 z-10 shadow-2xl transition-all`}>
                            <img src={pair.icon} alt={pair.symbol} className="w-full h-full object-contain" />
                        </div>
                        <div className={`${isExpanded ? 'w-14 h-14' : 'w-12 h-12'} rounded-full border-2 border-[#1a1a1a] bg-[#111] p-1.5 shadow-2xl transition-all`}>
                            <img src={token.icon} alt={token.symbol} className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <div>
                        <h3 className={`font-black text-white group-hover:text-[#5cb849] transition-colors tracking-tight uppercase ${isExpanded ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
                            {pair.symbol}/{token.symbol}
                        </h3>
                        {isExpanded && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#5cb849] animate-pulse"></span>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">0.3% Fee Tier Verified</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-gray-500 font-black uppercase tracking-[0.2em] mb-0.5 ${isExpanded ? 'text-[9px]' : 'text-[8px]'}`}>TOTAL LIQ</p>
                    <p className={`font-black text-[#5cb849] tracking-tighter ${isExpanded ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>
                        {loading ? '...' : formatCompactUSD((parseFloat(formatUnits(reserves.resToken, token.decimals)) * (token.symbol === 'CAT' ? 0.015 : token.symbol === 'DARC' ? 0.04 : 0.02)) + (parseFloat(formatUnits(reserves.resPair, pair.decimals)) * 1.0))}
                    </p>
                </div>
            </div>

            {/* Reserves Info (ONLY FOR COMPACT VIEW HERE) */}
            {!isExpanded && (
                <div className="bg-black/60 rounded-xl py-2.5 px-4 space-y-2 border border-[#2a2a2a] mb-5 relative overflow-hidden group/reserves transition-all hover:bg-black/80">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Pooled {pair.symbol}</span>
                        <span className="text-white font-black text-[11px]">{loading ? '...' : formatCompactNumber(parseFloat(formatUnits(reserves.resPair, pair.decimals)))}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Pooled {token.symbol}</span>
                        <span className="text-white font-black text-[11px]">{loading ? '...' : formatCompactNumber(parseFloat(formatUnits(reserves.resToken, token.decimals)))}</span>
                    </div>
                </div>
            )}

            {/* CONDITIONAL CONTENT */}
            {!isExpanded ? (
                <div className="mt-auto flex justify-center pt-2 pb-1">
                    <div className="relative group/enter-btn">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEnter();
                            }}
                            className="relative py-4 px-14 rounded-2xl bg-[#0a0a0a] border-2 border-[#1a1a1a] text-[#5cb849] font-black text-xs uppercase tracking-[0.2em] hover:border-[#2a2a2a] hover:bg-[#111] transition-all flex items-center gap-3 shadow-2xl overflow-hidden active:scale-95"
                        >
                            <span className="relative z-10">Enter Pool</span>
                            <ArrowUpRight className="relative z-10 w-4 h-4 text-[#5cb849] transition-all group-hover/enter-btn:-translate-y-1 group-hover/enter-btn:translate-x-1" />
                            <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-all duration-1000 group-hover:left-full"></div>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col h-full">
                    {/* Mode Switcher */}
                    <div className="flex p-1.5 bg-[#050505] rounded-[20px] mb-4 border border-[#1a1a1a] shadow-inner">
                        <button
                            onClick={() => {
                                setMode('add');
                                setAmountToken('');
                                setAmountPair('');
                                setAmountLP('');
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[15px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'add' ? 'bg-[#5cb849] text-white shadow-[0_5px_15px_rgba(92,184,73,0.3)]' : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                        <button
                            onClick={() => {
                                setMode('remove');
                                setAmountToken('');
                                setAmountPair('');
                                setAmountLP('');
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[15px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'remove' ? 'bg-[#ef4444] text-white shadow-[0_5px_15px_rgba(239,68,68,0.3)]' : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            <Minus className="w-4 h-4" /> Remove
                        </button>
                    </div>

                    {/* Inputs */}
                    {/* Inputs */}
                    <div className="space-y-2 mb-4">
                        {mode === 'add' ? (
                            <>
                                <div>
                                    <div className="flex justify-between text-[10px] text-gray-500 mb-2 px-2 uppercase font-black tracking-[0.15em]">
                                        <span>{pair.symbol} Amount</span>
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-3.5 h-3.5 text-[#5cb849]/60" />
                                            <span className="text-gray-400">{balances[pair.symbol] || '0.00'}</span>
                                        </div>
                                    </div>
                                    <div className="relative group/input">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={amountPair}
                                            onFocus={() => setFocusedField('pair')}
                                            onBlur={() => setFocusedField(null)}
                                            onChange={(e) => handlePairChange(e.target.value.replace(/[^0-9.]/g, ''))}
                                            placeholder="0.00"
                                            className="w-full bg-[#0a0a0a] border-2 border-[#1a1a1a] rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 text-white outline-none focus:border-[#5cb849]/40 transition-all caret-[#5cb849] text-lg sm:text-xl font-black placeholder:text-gray-800"
                                        />
                                        <button
                                            onClick={() => {
                                                const bal = (balances[pair.symbol] || '0').replace(/,/g, '');
                                                handlePairChange(parseFloat(bal).toString());
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#5cb849] hover:text-white transition-all bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#2a2a2a] hover:border-[#5cb849]/50 shadow-xl"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                    {/* Percentage Buttons for Pair */}
                                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${focusedField === 'pair' ? 'max-h-16 opacity-100 mt-5' : 'max-h-0 opacity-0 mt-0'}`}>
                                        <div className="flex items-center gap-3 px-1">
                                            {[25, 50, 75, 100].map((percent) => (
                                                <button
                                                    key={percent}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        const bal = parseFloat((balances[pair.symbol] || '0').replace(/,/g, ''));
                                                        if (bal > 0) {
                                                            handlePairChange(((bal * percent) / 100).toFixed(2).replace(/\.?0+$/, ''));
                                                        }
                                                    }}
                                                    className="px-4 py-2 text-[10px] font-black rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-gray-500 hover:text-[#5cb849] hover:border-[#5cb849]/40 transition-all min-w-[60px] uppercase tracking-wider"
                                                >
                                                    {percent === 100 ? 'MAX' : `${percent}%`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center -my-2 relative z-10">
                                    <div className="bg-[#111] border-2 border-[#1a1a1a] rounded-full p-2 shadow-[0_0_20px_rgba(0,0,0,0.8)] ring-2 ring-black/40 flex items-center gap-2 min-w-[70px] justify-center">
                                        <Plus className="w-3.5 h-3.5 text-gray-500" />
                                        <span className="text-[7px] text-gray-600 font-black uppercase tracking-[0.2em]">Pairing</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] text-gray-500 mb-2 px-2 uppercase font-black tracking-[0.15em]">
                                        <span>{token.symbol} Amount</span>
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-3 h-3 text-[#5cb849]/60" />
                                            <span className="text-gray-400">{balances[token.symbol] || '0.00'}</span>
                                        </div>
                                    </div>
                                    <div className="relative group/input">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={amountToken}
                                            onFocus={() => setFocusedField('token')}
                                            onBlur={() => setFocusedField(null)}
                                            onChange={(e) => handleTokenChange(e.target.value.replace(/[^0-9.]/g, ''))}
                                            placeholder="0.00"
                                            className="w-full bg-[#0a0a0a] border-2 border-[#1a1a1a] rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 text-white outline-none focus:border-[#5cb849]/40 transition-all caret-[#5cb849] text-lg sm:text-xl font-black placeholder:text-gray-800"
                                        />
                                        <button
                                            onClick={() => {
                                                const bal = (balances[token.symbol] || '0').replace(/,/g, '');
                                                handleTokenChange(parseFloat(bal).toString());
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#5cb849] hover:text-white transition-all bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#2a2a2a] hover:border-[#5cb849]/50 shadow-xl"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                    {/* Percentage Buttons for Token */}
                                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${focusedField === 'token' ? 'max-h-16 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                                        <div className="flex items-center gap-3 px-1">
                                            {[25, 50, 75, 100].map((percent) => (
                                                <button
                                                    key={percent}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        const bal = parseFloat((balances[token.symbol] || '0').replace(/,/g, ''));
                                                        if (bal > 0) {
                                                            handleTokenChange(((bal * percent) / 100).toFixed(6).replace(/\.?0+$/, ''));
                                                        }
                                                    }}
                                                    className="px-4 py-2 text-[10px] font-black rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-gray-500 hover:text-[#5cb849] hover:border-[#5cb849]/40 transition-all min-w-[60px] uppercase tracking-wider"
                                                >
                                                    {percent === 100 ? 'MAX' : `${percent}%`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="animate-in fade-in zoom-in duration-500">
                                <div className="flex justify-between text-[10px] text-gray-500 mb-2 px-2 uppercase font-black tracking-[0.15em]">
                                    <span>LP TOKENS</span>
                                    <div className="flex items-center gap-2">
                                        <Library className="w-3.5 h-3.5 text-[#ef4444]/60" />
                                        <span className="text-gray-400">Balance: {lpBalance}</span>
                                        {totalLPSupply > 0n && lpBalance && parseFloat(lpBalance.replace(/,/g, '')) > 0 && (
                                            <span className="text-gray-500 border-l border-gray-800 pl-2 ml-1">
                                                Share: {((parseFloat(lpBalance.replace(/,/g, '')) / parseFloat(formatUnits(totalLPSupply, 18))) * 100).toFixed(4)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="relative group/input">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amountLP}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                            setAmountLP(val);
                                            // Derive amountPair/amountToken based on LP amount relative to Total Supply
                                            if (val !== '' && totalLPSupply > 0n) {
                                                const supplyNum = parseFloat(formatUnits(totalLPSupply, 18));
                                                // ratio = amountLP / totalLPSupply
                                                // But simplistic float division might lose precision, but good enough for UI estimate
                                                const ratio = parseFloat(val) / supplyNum;

                                                const resTokenNum = parseFloat(formatUnits(reserves.resToken, token.decimals));
                                                const resPairNum = parseFloat(formatUnits(reserves.resPair, pair.decimals));

                                                // Estimate amounts (no slippage factor for "You'll Receive" display, raw estimate)
                                                setAmountToken((resTokenNum * ratio).toFixed(6));
                                                setAmountPair((resPairNum * ratio).toFixed(6));
                                            } else {
                                                setAmountToken('');
                                                setAmountPair('');
                                            }
                                        }}
                                        onFocus={() => setFocusedField('lp')}
                                        placeholder="0.00"
                                        className="w-full bg-[#0a0a0a] border-2 border-[#1a1a1a] rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 text-white outline-none focus:border-[#ef4444]/40 transition-all caret-[#ef4444] text-lg sm:text-xl font-black placeholder:text-gray-800"
                                    />
                                    <button
                                        onClick={() => {
                                            const bal = lpBalance.replace(/,/g, '');
                                            setAmountLP(bal);
                                            setFocusedField('lp');
                                            // Calculate max using the correct ratio against Total Supply
                                            const balNum = parseFloat(bal);
                                            const supplyNum = parseFloat(formatUnits(totalLPSupply, 18));

                                            if (supplyNum > 0) {
                                                const ratio = balNum / supplyNum;
                                                const resTokenNum = parseFloat(formatUnits(reserves.resToken, token.decimals));
                                                const resPairNum = parseFloat(formatUnits(reserves.resPair, pair.decimals));

                                                setAmountToken((resTokenNum * ratio).toFixed(6));
                                                setAmountPair((resPairNum * ratio).toFixed(6));
                                            }
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#ef4444] hover:text-white transition-all bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#2a2a2a] hover:border-[#ef4444]/50 shadow-xl"
                                    >
                                        MAX
                                    </button>
                                </div>
                                {/* Percentage Pop-out Row */}
                                <div className={`overflow-hidden transition-all duration-700 ease-in-out ${focusedField === 'lp' ? 'max-h-24 opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
                                    <div className="flex items-center justify-between gap-3 px-1">
                                        {[25, 50, 75, 100].map((percent) => (
                                            <button
                                                key={percent}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    const bal = parseFloat(lpBalance.replace(/,/g, ''));
                                                    const amount = ((bal * percent) / 100).toFixed(4);
                                                    setAmountLP(amount);
                                                    // Derive amounts
                                                    if (amount > 0 && totalLPSupply > 0n) {
                                                        const supplyNum = parseFloat(formatUnits(totalLPSupply, 18));
                                                        const ratio = parseFloat(amount) / supplyNum;

                                                        const resTokenNum = parseFloat(formatUnits(reserves.resToken, token.decimals));
                                                        const resPairNum = parseFloat(formatUnits(reserves.resPair, pair.decimals));

                                                        setAmountToken((resTokenNum * ratio).toFixed(6));
                                                        setAmountPair((resPairNum * ratio).toFixed(6));
                                                    }
                                                }}
                                                className={`flex-1 py-3 text-[11px] font-black rounded-xl border transition-all uppercase tracking-widest ${amountLP && (parseFloat(amountLP) / parseFloat(lpBalance.replace(/,/g, ''))) * 100 === percent ? 'bg-[#ef4444] border-[#ef4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-[#0a0a0a] border-[#1a1a1a] text-gray-500 hover:text-white hover:border-[#ef4444]/40'}`}
                                            >
                                                {percent}%
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* "You'll Receive" Preview Section */}
                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${amountLP ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                                    <div className="bg-[#111] rounded-xl p-3 border border-[#2a2a2a] flex items-center justify-between shadow-inner">
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">You'll Receive:</span>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <img src={pair.icon} alt="" className="w-3.5 h-3.5" />
                                                <span className="text-white font-bold text-xs">{formatCompactNumber(parseFloat(amountPair || 0))} {pair.symbol}</span>
                                            </div>
                                            <span className="text-gray-600 font-black">+</span>
                                            <div className="flex items-center gap-1.5">
                                                <img src={token.icon} alt="" className="w-3.5 h-3.5" />
                                                <span className="text-white font-bold text-xs">{formatCompactNumber(parseFloat(amountToken || 0))} {token.symbol}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleAction}
                        disabled={(mode === 'add' ? (!amountToken || !amountPair) : !amountLP) || (mode === 'add' && insufficientToken) || isProcessing}
                        className={`w-full py-4 rounded-[20px] font-black transition-all shadow-2xl min-h-[56px] text-[11px] uppercase tracking-[0.3em] mt-4 ${mode === 'add'
                            ? 'gradient-bg text-white hover:opacity-90 shadow-[0_10px_30px_rgba(92,184,73,0.4)]'
                            : 'bg-[#ef4444] text-white hover:bg-[#dc2626] shadow-[0_10px_30px_rgba(239,68,68,0.4)]'
                            } disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-[0.98]`}
                    >
                        {isProcessing
                            ? 'Processing...'
                            : mode === 'add' && insufficientToken
                                ? `Insufficient ${insufficientToken}`
                                : (mode === 'add' ? (!amountToken || !amountPair) : !amountLP)
                                    ? 'Enter Amount'
                                    : `${mode === 'add' ? 'Add' : 'Remove'} Liquidity`
                        }
                    </button>

                    {/* EXPANDED CONTENT FOOTER (STATS) */}
                    <div className="mt-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 bg-[#050505] rounded-[24px] p-3 sm:p-4 border border-[#1a1a1a] shadow-inner mb-2">
                            <div className="space-y-3">
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Pool Reserves</p>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center group/stat">
                                        <span className="text-[11px] text-gray-400 font-black group-hover/stat:text-[#5cb849] transition-colors">{pair.symbol}</span>
                                        <span className="text-white font-black text-sm">{loading ? '...' : formatCompactNumber(parseFloat(formatUnits(reserves.resPair, pair.decimals)))}</span>
                                    </div>
                                    <div className="flex justify-between items-center group/stat border-t border-[#1a1a1a] pt-2">
                                        <span className="text-[11px] text-gray-400 font-black group-hover/stat:text-[#5cb849] transition-colors">{token.symbol}</span>
                                        <span className="text-white font-black text-sm">{loading ? '...' : formatCompactNumber(parseFloat(formatUnits(reserves.resToken, token.decimals)))}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 border-l border-[#1a1a1a] pl-4 sm:pl-6">
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Metrics</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-[#5cb849]"></div>
                                        <p className="text-white font-black text-[11px]">0.3% Fee</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                        <p className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">Auto-Rebalance</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 px-2">
                        <p className="text-[9px] text-gray-500 text-center leading-relaxed italic opacity-60">
                            Notice: Added liquidity is subject to contract exchange rates. Unbalanced deposits may result in partial value adjustment.
                        </p>
                    </div>
                </div>
            )}

            {/* Transaction Modal */}
            {showModal && (
                <TransactionModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        if (setIsTxModalOpen) setIsTxModalOpen(false);
                    }}
                    transactionType={mode === 'add' ? 'add_liquidity' : 'remove_liquidity'}
                    fromToken={pair}
                    toToken={token}
                    fromAmount={amountPair}
                    toAmount={amountToken}
                    onApproveA={async () => approveToken(signer, pair, amountPair)}
                    onApproveB={async () => approveToken(signer, token, amountToken)}
                    onExecute={handleExecute}
                    requiresApproval={mode === 'add'}
                    transactionParams={{
                        title: mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity',
                        pair: `${pair.symbol}/${token.symbol}`,
                    }}
                />
            )}
        </div >
    );
};

const LPInfoModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-black/20 backdrop-blur-[6px]">
            <div className="glass-card w-full max-w-lg border-[#5cb849]/30 relative overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#1a1a1a]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#5cb849]/10">
                            <Library className="w-5 h-5 text-[#5cb849]" />
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight">About LP Tokens</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-[#1a1a1a] text-gray-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    <section className="space-y-3 border-l-2 border-[#5cb849]/20 pl-4">
                        <h3 className="text-[#5cb849] font-black text-xs uppercase tracking-widest">What are LP Tokens?</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Liquidity Provider (LP) tokens represent your ownership share of the pool. When you deposit tokens, you get LP tokens back as a receipt.
                        </p>
                    </section>

                    <section className="space-y-3 border-l-2 border-[#5cb849]/20 pl-4">
                        <h3 className="text-[#5cb849] font-black text-xs uppercase tracking-widest">Why does my Balance look like that?</h3>
                        <div className="bg-[#111] p-4 rounded-xl border border-[#2a2a2a] space-y-4">
                            <div>
                                <p className="text-gray-300 text-sm font-bold mb-1">Decimal Domination</p>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    This contract calculates your share by purely adding the raw amounts of both tokens:
                                </p>
                                <div className="font-mono text-[10px] text-[#5cb849] bg-black/50 p-2 rounded border border-[#5cb849]/20 text-center my-2">
                                    Share = Token A (Raw) + Token B (Raw)
                                </div>
                            </div>

                            <div>
                                <p className="text-gray-300 text-sm font-bold mb-1">The 18 vs 6 Decimal Difference</p>
                                <p className="text-gray-400 text-xs leading-relaxed mb-2">
                                    Tokens like <strong>Dark/Cat have 18 decimals</strong> (1 token = 1,000,000,000,000,000,000 units), while <strong>USDC has 6 decimals</strong> (1 token = 1,000,000 units).
                                </p>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    Because the 18-decimal number is <strong>1 trillion times larger</strong> in raw terms, it completely "dominates" the sum. The USDC portion is so small in comparison it becomes negligible in the display.
                                </p>
                                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#333] mt-2">
                                    <p className="text-[10px] text-gray-500 font-mono">Example:</p>
                                    <p className="text-[10px] text-gray-300 font-mono">100 USDC (10^8) + 2000 DARK (2 * 10^21)</p>
                                    <p className="text-[10px] text-[#5cb849] font-mono font-bold mt-1">Result ≈ 2000.00... (Shares)</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3 border-l-2 border-[#c5a122] pl-4">
                        <h3 className="text-[#c5a122] font-black text-xs uppercase tracking-widest">Why did my value change?</h3>
                        <div className="bg-[#111] p-4 rounded-xl border border-[#2a2a2a] space-y-3">
                            <p className="text-gray-300 text-sm font-bold">"Impermanent Loss" & Rebalancing</p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                An AMM pool always maintains a 50/50 value ratio. If the price of one token changes, the pool automatically sells the winner and buys the loser to stay balanced.
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-400 text-xs">
                                <li>If you deposited 100 USDC and now see 89 USDC, it means the pool rebalanced.</li>
                                <li>You now likely own <strong>more</strong> of the other token to compensate.</li>
                                <li>This fluctuation is normal for liquidity providers and represents the cost of earning trading fees.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-3 border-l-2 border-[#ef4444] pl-4">
                        <h3 className="text-[#ef4444] font-black text-xs uppercase tracking-widest">Redeeming Liquidity</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            When you remove liquidity, you are burning your "Shares". The contract calculates your portion of the <strong>current</strong> pool reserves (which may be different from what you deposited) and sends it to your wallet.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

const Pool = () => {
    const { address, isConnected } = useAccount();
    const provider = useEthersProvider();
    const signer = useEthersSigner();
    const { balances, fetchBalances } = useBalances(provider, address);
    const { showTransaction, isBlurActive, setIsBlurActive } = useNotifications();
    const [refreshing, setRefreshing] = useState(false);
    const [isLPModalOpen, setIsLPModalOpen] = useState(false);

    const [expandedIndex, setExpandedIndex] = useState(null);
    const [mode, setMode] = useState('add'); // Track mode at parent level for dynamic positioning

    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await fetchBalances();
            // The PoolCard handles its own reserves refresh via the `refreshing` effect
            await new Promise(resolve => setTimeout(resolve, 1500)); // Visual feedback
        } finally {
            setRefreshing(false);
        }
    };

    const pools = [
        { token: TOKENS.CAT, pair: TOKENS.USDC },
        { token: TOKENS.DARC, pair: TOKENS.USDC },
        { token: TOKENS.PANDA, pair: TOKENS.USDC },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Header Section */}
            <div className={`flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 transition-all duration-500 ${expandedIndex !== null ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-[#5cb849]/10 border border-[#5cb849]/30">
                            <Droplets className="w-6 h-6 text-[#5cb849]" />
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">Liquidity Pools</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full bg-[#5cb849]/10 text-[#5cb849] text-[10px] font-bold uppercase tracking-wider border border-[#5cb849]/20">
                            Testnet Only
                        </span>
                        <p className="text-gray-400 text-xs sm:text-sm">Provision liquidity to earn trading fees and reduce slippage.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#5cb849]/50 rounded-xl transition-all disabled:opacity-50 min-w-[100px] sm:min-w-[120px] justify-center"
                    >
                        <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className={`mb-8 p-4 sm:p-6 rounded-2xl bg-black/40 border border-[#5cb849]/10 flex items-start gap-4 transition-all duration-500 ${expandedIndex !== null ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                <Info className="w-5 h-5 text-[#5cb849] mt-0.5 shrink-0" />
                <div className="text-[11px] sm:text-sm text-gray-400 leading-relaxed sm:leading-relaxed">
                    <p><strong className="text-white">AMM LIQUIDITY:</strong> When you add liquidity, you MUST provide both tokens in the exact pool ratio. <strong className="text-[#c51e3a]">WARNING:</strong> Due to linear math, adding unbalanced liquidity may lead to value loss. Add with caution.</p>
                </div>
            </div>

            {/* Pools Grid */}
            <div className="relative flex justify-center w-full">
                {/* Compact Grid View with Unified Directional Transitions */}
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full transition-all duration-1000 ease-in-out ${expandedIndex !== null ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {pools.map((pool, idx) => {
                        // Unified logic: congregating in the middle background
                        let displacement = '';
                        if (expandedIndex !== null) {
                            if (idx === expandedIndex) {
                                displacement = 'opacity-0 scale-110 pointer-events-none';
                            } else {
                                // All non-selected cards move to the center column (idx 1)
                                if (idx === 0) displacement = 'translate-x-[calc(100%+24px)] opacity-0 scale-90'; // Move Right to center
                                else if (idx === 2) displacement = '-translate-x-[calc(100%+24px)] opacity-0 scale-90'; // Move Left to center
                                else displacement = 'opacity-0 scale-90'; // Middle card just fades/scales
                            }
                        }

                        return (
                            <div key={idx} className={`h-full transition-all duration-1000 ease-in-out transform ${displacement}`}>
                                <PoolCard
                                    token={pool.token}
                                    pair={pool.pair}
                                    provider={provider}
                                    signer={signer}
                                    balances={balances}
                                    fetchBalances={fetchBalances}
                                    showTransaction={showTransaction}
                                    refreshing={refreshing}
                                    isExpanded={false}
                                    setIsTxModalOpen={setIsBlurActive}
                                    onEnter={() => {
                                        setMode('add');
                                        setExpandedIndex(idx);
                                    }}
                                    onClose={() => setExpandedIndex(null)}
                                    mode={mode}
                                    setMode={setMode}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Expanded Focus View */}
                {expandedIndex !== null && (
                    <div className={`absolute inset-x-0 z-50 flex justify-center items-start pt-0 animate-in fade-in zoom-in duration-1000 transition-all ${mode === 'add' ? 'md:-top-64 -top-12' : 'md:-top-60 -top-8'}`}>
                        {/* Background Cards (The "Disappearing Behind" Effect) */}
                        <div className="absolute inset-0 flex justify-center items-start pt-0 pointer-events-none opacity-20 overflow-hidden h-full">
                            {pools.map((p, i) => i !== expandedIndex && (
                                <div key={i} className={`transform transition-all duration-[2000ms] absolute top-0 ${i < expandedIndex ? '-translate-x-[25%] -rotate-12 scale-75' : 'translate-x-[25%] rotate-12 scale-75'}`}>
                                    <div className="glass-card w-[350px] h-[500px] border-[#5cb849]/10 bg-black/40 blur-md shadow-2xl"></div>
                                </div>
                            ))}
                        </div>

                        {/* Foreground Expanded Card */}
                        <div className="w-full max-w-lg relative z-10 p-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <PoolCard
                                token={pools[expandedIndex].token}
                                pair={pools[expandedIndex].pair}
                                provider={provider}
                                signer={signer}
                                balances={balances}
                                fetchBalances={fetchBalances}
                                showTransaction={showTransaction}
                                refreshing={refreshing}
                                isExpanded={true}
                                setIsTxModalOpen={setIsBlurActive}
                                onEnter={() => { }}
                                onClose={() => setExpandedIndex(null)}
                                mode={mode}
                                setMode={setMode}
                            />
                        </div>
                    </div>
                )}
            </div>



            {/* My Liquidity Section */}
            <div className={`mt-16 transition-all duration-500 ${expandedIndex !== null ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                <div className="flex items-center justify-between mb-8 border-b border-[#1a1a1a] pb-4 gap-4">
                    <h2 className="text-2xl font-black text-white tracking-tight">Your Liquidity</h2>
                    <button
                        onClick={() => setIsLPModalOpen(true)}
                        className="group flex items-center gap-2 text-xs sm:text-sm text-[#5cb849] font-black uppercase tracking-wider hover:text-[#6bc956] transition-all w-fit"
                    >
                        <span className="sm:hidden">Learn</span>
                        <span className="hidden sm:inline">Learn about LP tokens</span>
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </button>
                </div>

                {!isConnected ? (
                    <div className="glass-card p-16 text-center border-dashed border-[#2a2a2a] bg-black/20">
                        <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-40" />
                        <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto text-sm">Connect your wallet to view your active liquidity positions and earned fees.</p>
                    </div>
                ) : (
                    <>
                        {pools.some(pool => {
                            const key = `LP_${pool.pair.symbol}_${pool.token.symbol}`;
                            const bal = parseFloat((balances[key] || '0').replace(/,/g, ''));
                            return bal > 0;
                        }) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pools.map((pool, idx) => {
                                    const key = `LP_${pool.pair.symbol}_${pool.token.symbol}`;
                                    const balString = balances[key] || '0.00';
                                    const bal = parseFloat(balString.replace(/,/g, ''));

                                    if (bal <= 0) return null;

                                    return (
                                        <div key={idx} className="glass-card p-5 border-[#5cb849]/20 bg-[#0a0a0a] flex items-center justify-between group hover:border-[#5cb849]/40 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="flex -space-x-3">
                                                    <div className="w-10 h-10 rounded-full bg-black border border-[#2a2a2a] p-1 z-10">
                                                        <img src={pool.pair.icon} alt="" className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-black border border-[#2a2a2a] p-1">
                                                        <img src={pool.token.icon} alt="" className="w-full h-full object-contain" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-sm">{pool.pair.symbol}/{pool.token.symbol}</h3>
                                                    <p className="text-[#5cb849] font-mono text-xs font-medium">{balString} LP</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setExpandedIndex(idx);
                                                    setMode('remove');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-white hover:bg-[#222] hover:border-[#5cb849]/30 transition-all"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="glass-card p-16 text-center bg-[#5cb849]/5 border-[#5cb849]/20 relative overflow-hidden group">
                                <Droplets className="w-12 h-12 text-[#5cb849]/30 mx-auto mb-4" />
                                <p className="text-gray-400 font-medium">Your active liquidity positions will appear here once you have deposited tokens into a pool above.</p>
                                <p className="text-gray-500 text-xs mt-4">Positions are updated every time you add/remove liquidity or refresh the page.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* LP Info Modal */}
            <LPInfoModal
                isOpen={isLPModalOpen}
                onClose={() => setIsLPModalOpen(false)}
            />
        </div>
    );
};

export default Pool;

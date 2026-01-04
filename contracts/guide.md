# Flow On Arc - Complete Deployment & Setup Guide

This guide covers the step-by-step process to deploy and configure your DeFi ecosystem on the Arc Testnet using Remix IDE.

---

## Order of Operations (DO NOT SKIP)
1. Deploy Tokens (CAT, DARC, PANDA)
2. Deploy FlowSwapAMM
3. Approve Swap & Lending Pool on all tokens
4. Add Liquidity (Set initial prices)
5. Deploy FlowFaucet (and fund it)
6. Deploy FlowLendingPool
7. Update Frontend `contracts.js`

---

## 1. Deploy Tokens (CAT, DARC, PANDA)
*   **File**: `CATToken.sol`, `DARCToken.sol`, `PANDAToken.sol`
*   **Deployment**: Deploy each one individually.
*   **Result**: You now have your three asset addresses. Total supply (100M) is automatically minted to your wallet.

---

## 2. Deploy Swap (FlowSwapAMM)
*   **File**: `FlowSwapAMM.sol`
*   **Deployment**: Deploy this contract once.
*   **Address to save**: This is your `SWAP_ROUTER` address.
*   **Note**: Once deployed, the contract is empty. You must create pools and add liquidity (Step 5) for it to function.

---

## 3. Official Arc USDC Interaction
*   **Official Address**: `0x3600000000000000000000000000000000000000`
*   **Decimals**: 6
*   To interact with it in Remix, use the `IERC20.sol` interface and the "At Address" button.

---

## 4. Token Approvals (CRITICAL)
Before the contracts can take tokens from your wallet to create pools or supply collateral, you must approve them.

1.  **For EACH token (CAT, DARC, PANDA, USDC)**:
    *   Call `approve(spender, amount)` on the token contract.
    *   **Spender 1**: Your `FlowSwapAMM` address.
    *   **Spender 2**: Your `FlowLendingPool` address.
    *   **Amount**: Use a huge number like `1000000000000000000000000000` (for 18 decimals) or `1000000000000` (for USDC 6 decimals).

---

## 5. Create Liquidity Pools & Set Prices
Go to your **FlowSwapAMM** contract in Remix. You now have two ways to set up pools:

### Method A: Manual Setup (Recommended for new pairs)
1.  **Create Pool**: Call `createPool(tokenA, tokenB)`. 
    *   Example: Use `CAT_ADDR` and `USDC_ADDR`.
    *   This "registers" the pair in the system.
2.  **Add Liquidity**: Call `addLiquidity(tokenA, tokenB, amountA, amountB)`.
    *   The ratio you deposit sets the initial price.

### Method B: Quick Setup
Simply call `addLiquidity`. The contract will automatically create the pool for you if it doesn't exist.

### Target Liquidity Ratios:
*   **CAT / USDC (Price: $0.015)**
    *   Amount CAT: `30000000000000000000000000` (30M)
    *   Amount USDC: `450000000000` (450k)
*   **DARC / USDC (Price: $0.04)**
    *   Amount DARC: `20000000000000000000000000` (20M)
    *   Amount USDC: `800000000000` (800k)
*   **PANDA / USDC (Price: $0.02)**
    *   Amount PANDA: `25000000000000000000000000` (25M)
    *   Amount USDC: `500000000000` (500k)

### Discontinuing a Pool:
If you want to pull your funds back and stop a pool:
1.  Check your `userLiquidity` for that `poolId`.
2.  Call `removeLiquidity(tokenA, tokenB, shares)` with your total shares.

---

## 6. Deploy Faucet (FlowFaucet)
*   **File**: `FlowFaucet.sol`
*   **Constructor Args**: `_cat`, `_darc`, `_panda`, `_usdc` (Use your deployed addresses and the official USDC address).
*   **FUND IT**: After deployment, send 1,000,000 of CAT, DARC, and PANDA to the Faucet contract address so it has tokens to distribute to users.

---

## 7. Deploy Lending Pool (FlowLendingPool)
*   **File**: `FlowLendingPool.sol`
*   **Constructor Args**:
    *   `_tokens`: `["CAT_ADDR", "DARC_ADDR", "PANDA_ADDR", "0x3600..."]`
    *   `_prices`: `[15000000000000000, 40000000000000000, 20000000000000000, 1000000000000000000]` 
    *   **CRITICAL NOTE ON DECIMALS**:
        *   **Token Decimals**: CAT/DARC/PANDA use 18; USDC uses 6. (This is handled automatically by the contract logic).
        *   **Price Precision**: ALL prices in this array must be in **18 decimals** (e.g., $1.00 = `1e18`) so the contract can sum your total account value correctly.

---

## 8. Final Frontend Setup
Open `src/constants/contracts.js` and paste all your new addresses:
*   `CAT`, `DARC`, `PANDA`
*   `FAUCET`
*   `SWAP_ROUTER`
*   `LENDING_POOL`

**Your Dapp is now live and fully synced!**

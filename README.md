# Flow On Arc

A DeFi dApp on Arc Network featuring token swapping, lending/borrowing, and a tier-based faucet system.

## Features

- **Dashboard**: View your portfolio and token balances
- **Swap**: Swap between USDC, CAT, DARC, and PANDA tokens
- **Lend/Borrow**: Supply collateral, withdraw, borrow, and repay tokens
- **Faucet**: Claim test tokens based on your USDC balance tier
- **Activity**: View your transaction history

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update contract addresses in `src/constants/contracts.js`:
   - Update `CAT`, `DARC`, `PANDA`, `USDC` token addresses
   - Update `FAUCET`, `SWAP_ROUTER`, `LENDING_POOL` contract addresses

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Contract Integration

The dApp integrates with three main contracts:

1. **FlowOnArcFaucet**: Tier-based token faucet with cooldown periods
2. **SwapRouter**: AMM-style token swap router
3. **ImprovedLendingPool**: Lending and borrowing protocol

## Network

- **Chain**: Arc Testnet
- **Chain ID**: 5042002
- **RPC**: https://arc-testnet.drpc.org

## Tokens

- **CAT**: CAT Token (18 decimals)
- **DARC**: DARC Token (18 decimals)
- **PANDA**: PANDA Token (18 decimals)
- **USDC**: USDC (6 decimals) - used for faucet tier system

## License

MIT


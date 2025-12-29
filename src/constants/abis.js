// ERC20 ABI (simplified)
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
];

// Faucet ABI
export const FAUCET_ABI = [
  'function claim() external',
  'function getUserTier(address user) public view returns (uint256)',
  'function getClaimableAmounts(address user) public view returns (uint256 catAmount, uint256 darcAmount, uint256 pandaAmount, uint256 tierIndex)',
  'function getNextClaimTime(address user) public view returns (uint256)',
  'function canClaim(address user) public view returns (bool)',
  'event TokensClaimed(address indexed user, uint256 catAmount, uint256 darcAmount, uint256 pandaAmount, uint256 tier)',
];

// Swap Router ABI
export const SWAP_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  'function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts)',
  'function getPoolId(address tokenA, address tokenB) public pure returns (bytes32)',
  'event Swap(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)',
];

// Lending Pool ABI
export const LENDING_POOL_ABI = [
  'function supplyCollateral(address token, uint256 amount) external',
  'function withdrawCollateral(address token, uint256 amount) external',
  'function borrow(address token, uint256 amount) external',
  'function repay(address token, uint256 amount) external',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralUSD, uint256 totalDebtUSD, uint256 availableBorrowsUSD, uint256 healthFactor)',
  'function getUserCollateral(address user, address token) external view returns (uint256)',
  'function getUserDebt(address user, address token) external view returns (uint256)',
  'function getReserveData(address token) external view returns (uint256 availableLiquidity, uint256 totalSupplied, uint256 totalBorrowed, uint256 ltv, uint256 priceUSD)',
  'event CollateralSupplied(address indexed user, address indexed token, uint256 amount)',
  'event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount)',
  'event TokenBorrowed(address indexed user, address indexed token, uint256 amount, uint256 interestRate)',
  'event TokenRepaid(address indexed user, address indexed token, uint256 amount)',
];


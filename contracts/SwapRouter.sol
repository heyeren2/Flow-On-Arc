// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title Simple Swap Router
 * @dev Basic AMM-style token swap with liquidity pools
 */
contract SwapRouter {
    address public owner;
    uint256 public constant FEE_PERCENT = 3; // 0.3% fee
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        bool exists;
    }
    
    // poolId => Pool
    mapping(bytes32 => Pool) public pools;
    
    // User liquidity: poolId => user => liquidity
    mapping(bytes32 => mapping(address => uint256)) public userLiquidity;
    
    // Total liquidity per pool
    mapping(bytes32 => uint256) public totalLiquidity;
    
    event PoolCreated(bytes32 indexed poolId, address tokenA, address tokenB);
    event LiquidityAdded(bytes32 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(bytes32 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB);
    event Swap(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Get pool ID from token pair
     */
    function getPoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        // Ensure consistent ordering
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(token0, token1));
    }
    
    /**
     * @dev Create a new liquidity pool
     */
    function createPool(address tokenA, address tokenB) external onlyOwner {
        require(tokenA != tokenB, "Identical tokens");
        bytes32 poolId = getPoolId(tokenA, tokenB);
        require(!pools[poolId].exists, "Pool exists");
        
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        pools[poolId] = Pool({
            tokenA: token0,
            tokenB: token1,
            reserveA: 0,
            reserveB: 0,
            exists: true
        });
        
        emit PoolCreated(poolId, token0, token1);
    }
    
    /**
     * @dev Add liquidity to pool
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool does not exist");
        
        // Transfer tokens from user
        require(IERC20(pool.tokenA).transferFrom(msg.sender, address(this), amountA), "Transfer A failed");
        require(IERC20(pool.tokenB).transferFrom(msg.sender, address(this), amountB), "Transfer B failed");
        
        // Calculate liquidity shares
        uint256 liquidity;
        if (totalLiquidity[poolId] == 0) {
            liquidity = sqrt(amountA * amountB);
        } else {
            liquidity = min(
                (amountA * totalLiquidity[poolId]) / pool.reserveA,
                (amountB * totalLiquidity[poolId]) / pool.reserveB
            );
        }
        
        require(liquidity > 0, "Insufficient liquidity");
        
        // Update pool reserves
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        
        // Update user liquidity
        userLiquidity[poolId][msg.sender] += liquidity;
        totalLiquidity[poolId] += liquidity;
        
        emit LiquidityAdded(poolId, msg.sender, amountA, amountB);
    }
    
    /**
     * @dev Remove liquidity from pool
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity
    ) external {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool does not exist");
        require(userLiquidity[poolId][msg.sender] >= liquidity, "Insufficient liquidity");
        
        uint256 amountA = (liquidity * pool.reserveA) / totalLiquidity[poolId];
        uint256 amountB = (liquidity * pool.reserveB) / totalLiquidity[poolId];
        
        // Update state
        userLiquidity[poolId][msg.sender] -= liquidity;
        totalLiquidity[poolId] -= liquidity;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        
        // Transfer tokens
        require(IERC20(pool.tokenA).transfer(msg.sender, amountA), "Transfer A failed");
        require(IERC20(pool.tokenB).transfer(msg.sender, amountB), "Transfer B failed");
        
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB);
    }
    
    /**
     * @dev Get amounts out for given input
     */
    function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint i = 0; i < path.length - 1; i++) {
            bytes32 poolId = getPoolId(path[i], path[i + 1]);
            Pool memory pool = pools[poolId];
            require(pool.exists, "Pool does not exist");
            
            uint256 reserveIn;
            uint256 reserveOut;
            
            if (path[i] == pool.tokenA) {
                reserveIn = pool.reserveA;
                reserveOut = pool.reserveB;
            } else {
                reserveIn = pool.reserveB;
                reserveOut = pool.reserveA;
            }
            
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
        
        return amounts;
    }
    
    /**
     * @dev Swap exact tokens for tokens
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "Expired");
        require(path.length >= 2, "Invalid path");
        
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient output");
        
        // Transfer input token from user
        require(
            IERC20(path[0]).transferFrom(msg.sender, address(this), amounts[0]),
            "Transfer failed"
        );
        
        // Execute swaps
        for (uint i = 0; i < path.length - 1; i++) {
            bytes32 poolId = getPoolId(path[i], path[i + 1]);
            Pool storage pool = pools[poolId];
            
            uint256 reserveIn;
            uint256 reserveOut;
            
            if (path[i] == pool.tokenA) {
                reserveIn = pool.reserveA;
                reserveOut = pool.reserveB;
            } else {
                reserveIn = pool.reserveB;
                reserveOut = pool.reserveA;
            }
            
            uint256 amountOut = amounts[i + 1];
            
            // Update reserves
            if (path[i] == pool.tokenA) {
                pool.reserveA += amounts[i];
                pool.reserveB -= amountOut;
            } else {
                pool.reserveB += amounts[i];
                pool.reserveA -= amountOut;
            }
            
            // Transfer output token
            address recipient = (i == path.length - 2) ? to : address(this);
            require(IERC20(path[i + 1]).transfer(recipient, amountOut), "Transfer failed");
        }
        
        emit Swap(msg.sender, path[0], path[path.length - 1], amounts[0], amounts[amounts.length - 1]);
        
        return amounts;
    }
    
    /**
     * @dev Calculate output amount with fee
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        public 
        pure 
        returns (uint256) 
    {
        require(amountIn > 0, "Insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_PERCENT);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        
        return numerator / denominator;
    }
    
    /**
     * @dev Square root function
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    /**
     * @dev Min function
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
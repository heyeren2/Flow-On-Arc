// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract FlowSwapAMM {
    struct Pool {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
    }

    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => uint256) public totalLiquidity;
    mapping(bytes32 => mapping(address => uint256)) public userLiquidity;
    
    event PoolCreated(address indexed token0, address indexed token1, bytes32 poolId);
    event LiquidityAdded(address indexed user, address token0, address token1, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(address indexed user, address token0, address token1, uint256 amount0, uint256 amount1);
    event Swap(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    function getPoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(t0, t1));
    }

    /**
     * @dev Explicitly create a pool before adding liquidity.
     */
    function createPool(address tokenA, address tokenB) external {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        require(pools[poolId].token0 == address(0), "Pool already exists");
        require(tokenA != tokenB, "Same token addresses");

        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pools[poolId] = Pool({
            token0: t0,
            token1: t1,
            reserve0: 0,
            reserve1: 0
        });
        
        emit PoolCreated(t0, t1, poolId);
    }

    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];

        // Auto-create pool if it doesn't exist (backup)
        if (pool.token0 == address(0)) {
            (pool.token0, pool.token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
            emit PoolCreated(pool.token0, pool.token1, poolId);
        }

        uint256 realAmount0 = tokenA == pool.token0 ? amountA : amountB;
        uint256 realAmount1 = tokenA == pool.token0 ? amountB : amountA;

        require(IERC20(pool.token0).transferFrom(msg.sender, address(this), realAmount0), "TF0");
        require(IERC20(pool.token1).transferFrom(msg.sender, address(this), realAmount1), "TF1");

        // Calculate shares (simplified: 1:1 ratio for this demo)
        uint256 shares = realAmount0 + realAmount1;
        
        pool.reserve0 += realAmount0;
        pool.reserve1 += realAmount1;
        
        userLiquidity[poolId][msg.sender] += shares;
        totalLiquidity[poolId] += shares;

        emit LiquidityAdded(msg.sender, pool.token0, pool.token1, realAmount0, realAmount1);
    }

    /**
     * @dev Allows creators to remove liquidity and discontinue the pool.
     */
    function removeLiquidity(address tokenA, address tokenB, uint256 shares) external {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];
        require(userLiquidity[poolId][msg.sender] >= shares, "Insufficient shares");
        require(totalLiquidity[poolId] > 0, "No total liquidity");

        uint256 amount0 = (shares * pool.reserve0) / totalLiquidity[poolId];
        uint256 amount1 = (shares * pool.reserve1) / totalLiquidity[poolId];

        userLiquidity[poolId][msg.sender] -= shares;
        totalLiquidity[poolId] -= shares;
        pool.reserve0 -= amount0;
        pool.reserve1 -= amount1;

        require(IERC20(pool.token0).transfer(msg.sender, amount0), "T0_FAIL");
        require(IERC20(pool.token1).transfer(msg.sender, amount1), "T1_FAIL");

        emit LiquidityRemoved(msg.sender, pool.token0, pool.token1, amount0, amount1);
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) public view returns (uint256[] memory) {
        require(path.length >= 2, "Invalid path");
        uint256[] memory amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        for (uint i = 0; i < path.length - 1; i++) {
            bytes32 poolId = getPoolId(path[i], path[i+1]);
            Pool memory pool = pools[poolId];
            require(pool.reserve0 > 0 && pool.reserve1 > 0, "No Liquidity");

            (uint256 resIn, uint256 resOut) = path[i] == pool.token0 ? (pool.reserve0, pool.reserve1) : (pool.reserve1, pool.reserve0);
            
            uint256 amountInWithFee = amounts[i] * 997;
            uint256 numerator = amountInWithFee * resOut;
            uint256 denominator = (resIn * 1000) + amountInWithFee;
            amounts[i+1] = numerator / denominator;
        }
        return amounts;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory) {
        require(block.timestamp <= deadline, "Expired");
        uint256[] memory amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "Slippage");

        require(IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn), "TF");

        for (uint i = 0; i < path.length - 1; i++) {
            bytes32 poolId = getPoolId(path[i], path[i+1]);
            Pool storage pool = pools[poolId];
            
            if (path[i] == pool.token0) {
                pool.reserve0 += amounts[i];
                pool.reserve1 -= amounts[i+1];
            } else {
                pool.reserve1 += amounts[i];
                pool.reserve0 -= amounts[i+1];
            }
        }

        require(IERC20(path[path.length - 1]).transfer(to, amounts[amounts.length - 1]), "T_FAIL");
        emit Swap(msg.sender, path[0], path[path.length - 1], amountIn, amounts[amounts.length - 1]);
        return amounts;
    }
}

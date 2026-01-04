// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Flow Lending Pool
 * @dev Simplified lending pool supporting multiple tokens including USDC (6 decimals).
 */
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract FlowLendingPool {
    struct ReserveData {
        uint256 totalSupplied;
        uint256 totalBorrowed;
        uint256 ltv; // 8000 = 80%
        uint256 priceUSD; // In 18 decimals (1e18 = $1)
    }

    mapping(address => ReserveData) public reserves;
    mapping(address => mapping(address => uint256)) public userCollateral;
    mapping(address => mapping(address => uint256)) public userDebt;
    address[] public tokens;

    event CollateralSupplied(address indexed user, address indexed token, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount);
    event TokenBorrowed(address indexed user, address indexed token, uint256 amount, uint256 interestRate);
    event TokenRepaid(address indexed user, address indexed token, uint256 amount);

    // Initial setup for supported tokens
    constructor(address[] memory _tokens, uint256[] memory _prices) {
        require(_tokens.length == _prices.length, "Arrays length mismatch");
        for (uint i = 0; i < _tokens.length; i++) {
            reserves[_tokens[i]] = ReserveData({
                totalSupplied: 0,
                totalBorrowed: 0,
                ltv: 8000, // Default 80%
                priceUSD: _prices[i]
            });
            tokens.push(_tokens[i]);
        }
    }

    function supplyCollateral(address token, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        userCollateral[msg.sender][token] += amount;
        reserves[token].totalSupplied += amount;
        
        emit CollateralSupplied(msg.sender, token, amount);
    }

    function withdrawCollateral(address token, uint256 amount) external {
        require(userCollateral[msg.sender][token] >= amount, "Insufficient collateral");
        
        userCollateral[msg.sender][token] -= amount;
        reserves[token].totalSupplied -= amount;
        
        // Health check after withdrawal
        (, uint256 totalDebtUSD, , uint256 healthFactor) = getUserAccountData(msg.sender);
        require(totalDebtUSD == 0 || healthFactor >= 1e18, "Withdrawal would lead to liquidation");
        
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        
        emit CollateralWithdrawn(msg.sender, token, amount);
    }

    function borrow(address token, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Check if user has enough available borrow power
        (,,uint256 availableBorrowsUSD,) = getUserAccountData(msg.sender);
        uint256 amountUSD = (amount * reserves[token].priceUSD) / (10**IERC20(token).decimals());
        require(availableBorrowsUSD >= amountUSD, "Insufficient collateral for borrow");
        
        reserves[token].totalBorrowed += amount;
        userDebt[msg.sender][token] += amount;
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        
        emit TokenBorrowed(msg.sender, token, amount, 500); // Fixed 5% rate for UI
    }

    function repay(address token, uint256 amount) external {
        require(userDebt[msg.sender][token] >= amount, "Repay exceeds debt");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        userDebt[msg.sender][token] -= amount;
        reserves[token].totalBorrowed -= amount;
        
        emit TokenRepaid(msg.sender, token, amount);
    }

    function getUserAccountData(address user) public view returns (
        uint256 totalCollateralUSD,
        uint256 totalDebtUSD,
        uint256 availableBorrowsUSD,
        uint256 healthFactor
    ) {
        uint256 totalLiquidationThresholdUSD = 0;
        
        for (uint i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            ReserveData memory reserve = reserves[token];
            uint256 decimals = IERC20(token).decimals();
            
            // Collateral
            uint256 collateral = userCollateral[user][token];
            if (collateral > 0) {
                uint256 collateralUSD = (collateral * reserve.priceUSD) / (10**decimals);
                totalCollateralUSD += collateralUSD;
                totalLiquidationThresholdUSD += (collateralUSD * reserve.ltv) / 10000;
            }
            
            // Debt
            uint256 debt = userDebt[user][token];
            if (debt > 0) {
                uint256 debtUSD = (debt * reserve.priceUSD) / (10**decimals);
                totalDebtUSD += debtUSD;
            }
        }
        
        if (totalDebtUSD > 0) {
            healthFactor = (totalLiquidationThresholdUSD * 1e18) / totalDebtUSD;
        } else {
            healthFactor = type(uint256).max;
        }
        
        if (totalLiquidationThresholdUSD > totalDebtUSD) {
            availableBorrowsUSD = totalLiquidationThresholdUSD - totalDebtUSD;
        } else {
            availableBorrowsUSD = 0;
        }
    }

    function getUserCollateral(address user, address token) external view returns (uint256) {
        return userCollateral[user][token];
    }

    function getUserDebt(address user, address token) external view returns (uint256) {
        return userDebt[user][token];
    }

    function getReserveData(address token) external view returns (
        uint256 availableLiquidity,
        uint256 totalSupplied,
        uint256 totalBorrowed,
        uint256 ltv,
        uint256 priceUSD
    ) {
        ReserveData memory data = reserves[token];
        uint256 balance = IERC20(token).balanceOf(address(this));
        return (balance, data.totalSupplied, data.totalBorrowed, data.ltv, data.priceUSD);
    }
}

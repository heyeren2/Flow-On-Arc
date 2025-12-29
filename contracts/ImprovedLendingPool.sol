// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Simplified ERC20 Interface
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// Simplified Reentrancy Guard
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// Simplified Ownable
abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(msg.sender);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// Main Improved Lending Pool Contract
contract ImprovedLendingPool is ReentrancyGuard, Ownable {
    // Struct to store user data
    struct UserAccount {
        // Collateral mapping (token => amount)
        mapping(address => uint256) collateral;
        // Debt mapping (token => amount)
        mapping(address => uint256) debt;
        // Total collateral value in USD (scaled by 1e18)
        uint256 totalCollateralUSD;
        // Total debt value in USD (scaled by 1e18)
        uint256 totalDebtUSD;
    }

    // Struct to store reserve data
    struct ReserveData {
        // Configuration
        uint256 ltv; // Loan to Value ratio (scaled by 1e18, e.g., 0.75e18 = 75%)
        uint256 liquidationThreshold; // Liquidation threshold (scaled by 1e18)
        uint256 liquidationBonus; // Liquidation bonus (scaled by 1e18)
        
        // State
        uint256 availableLiquidity;
        uint256 totalSupplied;
        uint256 totalBorrowed;
        
        // Price in USD (scaled by 1e18)
        uint256 priceUSD;
        
        // Flags
        bool isActive;
        bool isFrozen;
    }

    // Struct to store token configuration
    struct TokenConfiguration {
        uint8 decimals;
        string symbol;
    }

    // Mappings
    mapping(address => UserAccount) public userAccounts;
    mapping(address => ReserveData) public reserves;
    mapping(address => TokenConfiguration) public tokenConfigurations;
    
    // Supported tokens list
    address[] public supportedTokens;
    
    // Protocol parameters
    uint256 public constant PERCENTAGE_FACTOR = 1e18;
    uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18; // 1.0
    
    // Events
    event ReserveInitialized(
        address indexed token,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        uint256 priceUSD
    );
    
    event CollateralSupplied(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    
    event CollateralWithdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    
    event TokenBorrowed(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 interestRate
    );
    
    event TokenRepaid(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    
    event ReserveUpdated(
        address indexed token,
        uint256 availableLiquidity,
        uint256 totalSupplied,
        uint256 totalBorrowed
    );
    
    event LiquidationCall(
        address indexed collateralToken,
        address indexed debtToken,
        address indexed user,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        address liquidator,
        bool receiveAToken
    );

    // Modifiers
    modifier tokenSupported(address token) {
        require(token != address(0), "Invalid token address");
        require(reserves[token].isActive, "Token not supported");
        require(!reserves[token].isFrozen, "Token is frozen");
        _;
    }

    // Constructor
    constructor() {}

    // Initialize a reserve/token
    function initReserve(
        address token,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        uint256 priceUSD,
        uint8 decimals,
        string memory symbol
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!reserves[token].isActive, "Token already initialized");
        require(ltv <= PERCENTAGE_FACTOR, "Invalid LTV");
        require(liquidationThreshold <= PERCENTAGE_FACTOR, "Invalid liquidation threshold");
        require(liquidationBonus <= PERCENTAGE_FACTOR, "Invalid liquidation bonus");
        require(priceUSD > 0, "Invalid price");
        require(decimals <= 18, "Invalid decimals");
        
        reserves[token].ltv = ltv;
        reserves[token].liquidationThreshold = liquidationThreshold;
        reserves[token].liquidationBonus = liquidationBonus;
        reserves[token].priceUSD = priceUSD;
        reserves[token].isActive = true;
        reserves[token].isFrozen = false;
        
        // Ensure decimals are properly capped
        uint8 safeDecimals = decimals <= 18 ? decimals : 18;
        tokenConfigurations[token].decimals = safeDecimals;
        tokenConfigurations[token].symbol = symbol;
        
        supportedTokens.push(token);
        
        emit ReserveInitialized(token, ltv, liquidationThreshold, liquidationBonus, priceUSD);
    }

    // Update token price
    function updateTokenPrice(address token, uint256 priceUSD) external onlyOwner tokenSupported(token) {
        require(priceUSD > 0, "Invalid price");
        reserves[token].priceUSD = priceUSD;
    }

    // Freeze/unfreeze a reserve
    function setFreeze(address token, bool freeze) external onlyOwner tokenSupported(token) {
        reserves[token].isFrozen = freeze;
    }

    // Supply collateral
    function supplyCollateral(address token, uint256 amount) external nonReentrant tokenSupported(token) {
        require(amount > 0, "Amount must be greater than 0");
        
        UserAccount storage user = userAccounts[msg.sender];
        
        // Transfer tokens from user to contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Update user collateral
        user.collateral[token] += amount;
        
        // Update reserve data
        reserves[token].availableLiquidity += amount;
        reserves[token].totalSupplied += amount;
        
        // Check for overflow in reserve data
        require(reserves[token].availableLiquidity >= amount, "Overflow detected in availableLiquidity");
        require(reserves[token].totalSupplied >= amount, "Overflow detected in totalSupplied");
        
        // Update user's total collateral value
        uint256 tokenValueUSD = _getTokenValueUSD(token, amount);
        user.totalCollateralUSD += tokenValueUSD;
        
        // Check for overflow in user data
        require(user.totalCollateralUSD >= tokenValueUSD, "Overflow detected in totalCollateralUSD");
        
        emit CollateralSupplied(msg.sender, token, amount);
        emit ReserveUpdated(token, reserves[token].availableLiquidity, reserves[token].totalSupplied, reserves[token].totalBorrowed);
    }

    // Withdraw collateral
    function withdrawCollateral(address token, uint256 amount) external nonReentrant tokenSupported(token) {
        require(amount > 0, "Amount must be greater than 0");
        
        UserAccount storage user = userAccounts[msg.sender];
        require(user.collateral[token] >= amount, "Insufficient collateral");
        
        
        // Check if withdrawal would put user underwater
        _validateWithdrawal(msg.sender, token, amount);
        
        // Transfer tokens from contract to user
        IERC20(token).transfer(msg.sender, amount);
        
        // Update user collateral
        user.collateral[token] -= amount;
        
        // Update reserve data
        reserves[token].availableLiquidity -= amount;
        reserves[token].totalSupplied -= amount;
        
        // Update user's total collateral value
        uint256 tokenValueUSD = _getTokenValueUSD(token, amount);
        user.totalCollateralUSD -= tokenValueUSD;
        
        emit CollateralWithdrawn(msg.sender, token, amount);
        emit ReserveUpdated(token, reserves[token].availableLiquidity, reserves[token].totalSupplied, reserves[token].totalBorrowed);
    }

    // Borrow tokens
    function borrow(address token, uint256 amount) external nonReentrant tokenSupported(token) {
        UserAccount storage user = userAccounts[msg.sender];
        
        // Calculate borrow amount in USD
        uint256 borrowAmountUSD = _getTokenValueUSD(token, amount);
        
        // Check if user can borrow this amount
        _validateBorrow(msg.sender, token, amount, borrowAmountUSD);
        
        // Transfer tokens from contract to user
        IERC20(token).transfer(msg.sender, amount);
        
        // Update user debt
        user.debt[token] += amount;
        user.totalDebtUSD += borrowAmountUSD;
        
        // Check for overflow in user data
        require(user.debt[token] >= amount, "Overflow detected in user debt");
        require(user.totalDebtUSD >= borrowAmountUSD, "Overflow detected in totalDebtUSD");
        
        // Update reserve data
        reserves[token].availableLiquidity -= amount;
        reserves[token].totalBorrowed += amount;
        
        // Check for overflow in reserve data
        require(reserves[token].totalBorrowed >= amount, "Overflow detected in totalBorrowed");
        
        // For simplicity, we're using a fixed interest rate of 5%
        uint256 interestRate = 0.05e18; // 5% annual
        
        emit TokenBorrowed(msg.sender, token, amount, interestRate);
        emit ReserveUpdated(token, reserves[token].availableLiquidity, reserves[token].totalSupplied, reserves[token].totalBorrowed);
    }

    // Repay borrowed tokens
    function repay(address token, uint256 amount) external nonReentrant tokenSupported(token) {
        require(amount > 0, "Amount must be greater than 0");
        
        UserAccount storage user = userAccounts[msg.sender];
        require(user.debt[token] >= amount, "Repay amount exceeds borrowed amount");
        
        // Transfer tokens from user to contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Update user debt
        uint256 debtValueUSD = _getTokenValueUSD(token, amount);
        user.debt[token] -= amount;
        user.totalDebtUSD -= debtValueUSD;
        
        // Update reserve data
        reserves[token].availableLiquidity += amount;
        reserves[token].totalBorrowed -= amount;
        
        emit TokenRepaid(msg.sender, token, amount);
        emit ReserveUpdated(token, reserves[token].availableLiquidity, reserves[token].totalSupplied, reserves[token].totalBorrowed);
    }

    // Internal function to validate borrowing
    function _validateBorrow(
        address userAddress,
        address token,
        uint256 amount,
        uint256 amountUSD
    ) 
        internal 
        view 
    {
        UserAccount storage user = userAccounts[userAddress];
        
        // Validate that amount is greater than 0
        require(amount > 0, "Amount must be greater than 0");
        
        // Check if there's enough liquidity
        require(reserves[token].availableLiquidity >= amount, "Insufficient liquidity");
        
        // Calculate new total debt
        uint256 newTotalDebtUSD = user.totalDebtUSD + amountUSD;
        
        // Check for overflow
        require(newTotalDebtUSD >= user.totalDebtUSD, "Overflow detected");
        
        // Check if user has any collateral
        require(user.totalCollateralUSD > 0, "No collateral supplied");
        
        // Calculate available borrowing power
        uint256 availableBorrowsUSD = _calculateAvailableBorrowsUSD(userAddress);
        
        // Check if user can borrow this amount
        require(newTotalDebtUSD <= availableBorrowsUSD, "Insufficient collateral for borrow");
    }

    // Internal function to validate withdrawal
    function _validateWithdrawal(
        address userAddress,
        address token,
        uint256 amount
    ) internal view {
        UserAccount storage user = userAccounts[userAddress];
        
        // Calculate withdrawn value
        uint256 withdrawnValueUSD = _getTokenValueUSD(token, amount);
        
        // Check for underflow
        require(user.totalCollateralUSD >= withdrawnValueUSD, "Underflow detected");
        
        // Calculate new collateral value
        uint256 newCollateralUSD = user.totalCollateralUSD - withdrawnValueUSD;
        
        // If user has debt, check health factor after withdrawal
        if (user.totalDebtUSD > 0) {
            uint256 healthFactorAfter = _calculateHealthFactor(newCollateralUSD, user.totalDebtUSD);
            require(healthFactorAfter >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD, "Withdrawal would put account underwater");
        }
    }

    // Calculate available borrows in USD
    function _calculateAvailableBorrowsUSD(address userAddress) internal view returns (uint256) {
        UserAccount storage user = userAccounts[userAddress];
        
        // For simplicity, we'll use a fixed LTV of 75% for all calculations
        // In a real implementation, this would be calculated based on the specific tokens used as collateral
        uint256 ltv = 0.75e18; // 75%
        
        // Apply LTV to collateral
        uint256 availableBorrowsUSD = (user.totalCollateralUSD * ltv) / PERCENTAGE_FACTOR;
        
        // Subtract existing debt
        if (availableBorrowsUSD < user.totalDebtUSD) {
            return 0;
        }
        
        return availableBorrowsUSD - user.totalDebtUSD;
    }

    // Calculate health factor
    function _calculateHealthFactor(uint256 collateralUSD, uint256 debtUSD) internal pure returns (uint256) {
        // Prevent division by zero
        if (debtUSD == 0) return type(uint256).max;
        
        return (collateralUSD * PERCENTAGE_FACTOR) / debtUSD;
    }

    // Get token value in USD
    function _getTokenValueUSD(address token, uint256 amount) internal view returns (uint256) {
        ReserveData storage reserve = reserves[token];
        TokenConfiguration storage config = tokenConfigurations[token];
        
        // Handle potential issues with decimals
        uint256 decimals = config.decimals;
        if (decimals > 18) {
            decimals = 18; // Cap at 18 decimals
        }
        
        // Convert amount to match price decimals (18)
        uint256 scalingFactor = 10 ** (18 - decimals);
        uint256 normalizedAmount = amount * scalingFactor;
        
        // Prevent division by zero
        if (reserve.priceUSD == 0 || amount == 0) return 0;
        
        return (normalizedAmount * reserve.priceUSD) / 1e18;
    }

    // View functions
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralUSD,
        uint256 totalDebtUSD,
        uint256 availableBorrowsUSD,
        uint256 healthFactor
    ) {
        UserAccount storage userAccount = userAccounts[user];
        
        totalCollateralUSD = userAccount.totalCollateralUSD;
        totalDebtUSD = userAccount.totalDebtUSD;
        availableBorrowsUSD = _calculateAvailableBorrowsUSD(user);
        healthFactor = _calculateHealthFactor(totalCollateralUSD, totalDebtUSD);
    }

    function getUserCollateral(address user, address token) external view returns (uint256) {
        return userAccounts[user].collateral[token];
    }

    function getUserDebt(address user, address token) external view returns (uint256) {
        return userAccounts[user].debt[token];
    }

    function getReserveData(address token) external view returns (
        uint256 availableLiquidity,
        uint256 totalSupplied,
        uint256 totalBorrowed,
        uint256 ltv,
        uint256 priceUSD
    ) {
        ReserveData storage reserve = reserves[token];
        availableLiquidity = reserve.availableLiquidity;
        totalSupplied = reserve.totalSupplied;
        totalBorrowed = reserve.totalBorrowed;
        ltv = reserve.ltv;
        priceUSD = reserve.priceUSD;
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    // Fallback function to accept direct token transfers
    // This allows adding liquidity directly to the contract
    receive() external payable {
        // This contract doesn't accept ETH directly
        revert("ETH not accepted");
    }
}
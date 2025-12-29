// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title FlowOnArc Faucet
 * @dev Tier-based token faucet with cooldown periods
 */
contract FlowOnArcFaucet {
    address public owner;
    address public catToken;
    address public darcToken;
    address public pandaToken;
    address public usdcToken;
    
    // Tier thresholds (in USDC with 6 decimals)
    uint256 public constant BRONZE_THRESHOLD = 10 * 10**6;     // 10 USDC
    uint256 public constant SILVER_THRESHOLD = 100 * 10**6;    // 100 USDC
    uint256 public constant GOLD_THRESHOLD = 1000 * 10**6;     // 1,000 USDC
    uint256 public constant PLATINUM_THRESHOLD = 2000 * 10**6; // 2,000 USDC
    
    // Reward amounts (with 18 decimals)
    uint256 public constant BRONZE_REWARD = 1000 * 10**18;       // 1,000 tokens
    uint256 public constant SILVER_REWARD = 100000 * 10**18;     // 100,000 tokens
    uint256 public constant GOLD_REWARD = 1000000 * 10**18;      // 1,000,000 tokens
    uint256 public constant PLATINUM_REWARD = 10000000 * 10**18; // 10,000,000 tokens
    
    // Cooldown periods
    uint256 public constant BRONZE_COOLDOWN = 12 hours;
    uint256 public constant SILVER_COOLDOWN = 12 hours;
    uint256 public constant GOLD_COOLDOWN = 1 days;
    uint256 public constant PLATINUM_COOLDOWN = 7 days;
    
    mapping(address => uint256) public lastClaimTime;
    
    event TokensClaimed(address indexed user, uint256 catAmount, uint256 darcAmount, uint256 pandaAmount, uint256 tier);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _catToken, address _darcToken, address _pandaToken, address _usdcToken) {
        owner = msg.sender;
        catToken = _catToken;
        darcToken = _darcToken;
        pandaToken = _pandaToken;
        usdcToken = _usdcToken;
    }
    
    /**
     * @dev Get user tier based on USDC balance
     */
    function getUserTier(address user) public view returns (uint256) {
        uint256 usdcBalance = IERC20(usdcToken).balanceOf(user);
        
        if (usdcBalance >= PLATINUM_THRESHOLD) return 3;
        if (usdcBalance >= GOLD_THRESHOLD) return 2;
        if (usdcBalance >= SILVER_THRESHOLD) return 1;
        if (usdcBalance >= BRONZE_THRESHOLD) return 0;
        return 0; // Default to Bronze
    }
    
    /**
     * @dev Get claimable amounts for user
     */
    function getClaimableAmounts(address user) public view returns (
        uint256 catAmount,
        uint256 darcAmount,
        uint256 pandaAmount,
        uint256 tierIndex
    ) {
        tierIndex = getUserTier(user);
        
        if (tierIndex == 3) {
            catAmount = PLATINUM_REWARD;
            darcAmount = PLATINUM_REWARD;
            pandaAmount = PLATINUM_REWARD;
        } else if (tierIndex == 2) {
            catAmount = GOLD_REWARD;
            darcAmount = GOLD_REWARD;
            pandaAmount = GOLD_REWARD;
        } else if (tierIndex == 1) {
            catAmount = SILVER_REWARD;
            darcAmount = SILVER_REWARD;
            pandaAmount = SILVER_REWARD;
        } else {
            catAmount = BRONZE_REWARD;
            darcAmount = BRONZE_REWARD;
            pandaAmount = BRONZE_REWARD;
        }
        
        return (catAmount, darcAmount, pandaAmount, tierIndex);
    }
    
    /**
     * @dev Get next claim time for user
     */
    function getNextClaimTime(address user) public view returns (uint256) {
        uint256 tier = getUserTier(user);
        uint256 cooldown;
        
        if (tier == 3) {
            cooldown = PLATINUM_COOLDOWN;
        } else if (tier == 2) {
            cooldown = GOLD_COOLDOWN;
        } else if (tier == 1) {
            cooldown = SILVER_COOLDOWN;
        } else {
            cooldown = BRONZE_COOLDOWN;
        }
        
        uint256 lastClaim = lastClaimTime[user];
        if (lastClaim == 0) return 0; // Can claim now
        
        uint256 nextClaim = lastClaim + cooldown;
        if (block.timestamp >= nextClaim) return 0; // Can claim now
        
        return nextClaim;
    }
    
    /**
     * @dev Check if user can claim
     */
    function canClaim(address user) public view returns (bool) {
        return getNextClaimTime(user) == 0;
    }
    
    /**
     * @dev Claim tokens from faucet
     */
    function claim() external {
        require(canClaim(msg.sender), "Cooldown period not elapsed");
        
        (uint256 catAmount, uint256 darcAmount, uint256 pandaAmount, uint256 tier) = getClaimableAmounts(msg.sender);
        
        // Update last claim time
        lastClaimTime[msg.sender] = block.timestamp;
        
        // Transfer tokens
        require(IERC20(catToken).transfer(msg.sender, catAmount), "CAT transfer failed");
        require(IERC20(darcToken).transfer(msg.sender, darcAmount), "DARC transfer failed");
        require(IERC20(pandaToken).transfer(msg.sender, pandaAmount), "PANDA transfer failed");
        
        emit TokensClaimed(msg.sender, catAmount, darcAmount, pandaAmount, tier);
    }
    
    /**
     * @dev Withdraw tokens (owner only)
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner, amount), "Transfer failed");
    }
    
    /**
     * @dev Update token addresses (owner only)
     */
    function updateTokenAddresses(
        address _catToken,
        address _darcToken,
        address _pandaToken,
        address _usdcToken
    ) external onlyOwner {
        catToken = _catToken;
        darcToken = _darcToken;
        pandaToken = _pandaToken;
        usdcToken = _usdcToken;
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
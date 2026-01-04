// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Flow Faucet
 * @dev Distributes CAT, DARC, and PANDA based on USDC balance tiers.
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FlowFaucet {
    IERC20 public cat;
    IERC20 public darc;
    IERC20 public panda;
    IERC20 public usdc;

    mapping(address => uint256) public nextClaimTime;

    struct Tier {
        uint256 usdcThreshold;
        uint256 rewardAmount;
        uint256 cooldown;
    }

    Tier[] public tiers;

    event TokensClaimed(address indexed user, uint256 catAmount, uint256 darcAmount, uint256 pandaAmount, uint256 nextClaim);

    constructor(address _cat, address _darc, address _panda, address _usdc) {
        cat = IERC20(_cat);
        darc = IERC20(_darc);
        panda = IERC20(_panda);
        usdc = IERC20(_usdc);

        // Tier 0: 10-99 USDC -> 50 tokens -> 48h
        tiers.push(Tier(10 * 10**6, 50 * 10**18, 48 hours));
        // Tier 1: 100-999 USDC -> 300 tokens -> 88h
        tiers.push(Tier(100 * 10**6, 300 * 10**18, 88 hours));
        // Tier 2: 1000-1999 USDC -> 900 tokens -> 178h
        tiers.push(Tier(1000 * 10**6, 900 * 10**18, 178 hours));
        // Tier 3: 2000+ USDC -> 1800 tokens -> 228h
        tiers.push(Tier(2000 * 10**6, 1800 * 10**18, 228 hours));
    }

    function getUserTier(address user) public view returns (int256) {
        uint256 balance = usdc.balanceOf(user);
        for (int256 i = int256(tiers.length) - 1; i >= 0; i--) {
            if (balance >= tiers[uint256(i)].usdcThreshold) {
                return i;
            }
        }
        return -1; // No tier
    }

    function claim() external {
        int256 tierIdx = getUserTier(msg.sender);
        require(tierIdx >= 0, "Insufficient USDC balance for any tier");
        require(block.timestamp >= nextClaimTime[msg.sender], "Cooldown period active");

        Tier memory tier = tiers[uint256(tierIdx)];
        
        nextClaimTime[msg.sender] = block.timestamp + tier.cooldown;

        require(cat.transfer(msg.sender, tier.rewardAmount), "CAT transfer failed");
        require(darc.transfer(msg.sender, tier.rewardAmount), "DARC transfer failed");
        require(panda.transfer(msg.sender, tier.rewardAmount), "PANDA transfer failed");

        emit TokensClaimed(msg.sender, tier.rewardAmount, tier.rewardAmount, tier.rewardAmount, nextClaimTime[msg.sender]);
    }
}

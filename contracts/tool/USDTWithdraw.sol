// SPDX-License-Identifier: MIT
pragma solidity >=0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title Cyber Gear Withdraw Contract
 * @author FUNTOPIA-TEAM
 * @notice In this contract, players can withdraw UDST from the game Cyber Gear
 */
contract USDTWithdraw is AccessControlEnumerable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public treasury;
    address public verifier;
    IERC20 public usdt;

    uint256 public fee = 500;
    uint256 public withdrawInterval = 5 minutes;
    uint256 public minWithdrawAmount = 1e5 * 1e18;
    uint256 public maxWithdrawAmount = 1e8 * 1e18;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(address => mapping(uint256 => bool)) public usedNonces;
    mapping(address => uint256) public nextWithdrawTime;

    event SetAddrs(address treasury, address verifier, address usdtAddr);
    event SetData(
        uint256 fee,
        uint256 withdrawInterval,
        uint256 minWithdrawAmount,
        uint256 maxWithdrawAmount
    );
    event Withdraw(
        address indexed user,
        uint256 amount,
        uint256 nonce,
        bytes signature
    );

    /**
     * @param manager Initialize Manager Role
     */
    constructor(address manager) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, manager);
    }

    /**
     * @dev Set Addrs
     */
    function setAddrs(
        address _treasury,
        address _verifier,
        address usdtAddr
    ) external onlyRole(MANAGER_ROLE) {
        treasury = _treasury;
        verifier = _verifier;
        usdt = IERC20(usdtAddr);

        emit SetAddrs(_treasury, _verifier, usdtAddr);
    }

    /**
     * @dev Set Data
     */
    function setData(
        uint256 _fee,
        uint256 _withdrawInterval,
        uint256 _minWithdrawAmount,
        uint256 _maxWithdrawAmount
    ) external onlyRole(MANAGER_ROLE) {
        require(_fee <= 5000, "The fee ratio cannot exceed 50%");

        fee = _fee;
        withdrawInterval = _withdrawInterval;
        minWithdrawAmount = _minWithdrawAmount;
        maxWithdrawAmount = _maxWithdrawAmount;

        emit SetData(
            _fee,
            _withdrawInterval,
            _maxWithdrawAmount,
            _maxWithdrawAmount
        );
    }

    /**
     * @dev Claim Payment
     */
    function claimPayment(
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(
            amount >= minWithdrawAmount,
            "Amount must >= min withdraw amount"
        );
        require(
            amount <= maxWithdrawAmount,
            "Amount must <= max withdraw amount"
        );
        require(
            block.timestamp >= nextWithdrawTime[msg.sender],
            "Withdrawals are too frequent"
        );
        require(
            !usedNonces[msg.sender][nonce],
            "You have already withdrawn this payment"
        );
        usedNonces[msg.sender][nonce] = true;

        bytes32 message = ECDSA.toEthSignedMessageHash(
            keccak256(abi.encodePacked(msg.sender, amount, nonce, this))
        );
        (address _verifier, ECDSA.RecoverError recoverError) = ECDSA.tryRecover(
            message,
            signature
        );
        require(
            recoverError == ECDSA.RecoverError.NoError && _verifier == verifier,
            "Signature verification failed"
        );

        uint256 feeAmount = (amount * fee) / 1e4;
        usdt.safeTransfer(treasury, feeAmount);

        amount -= feeAmount;
        usdt.safeTransfer(msg.sender, amount);

        nextWithdrawTime[msg.sender] = block.timestamp + withdrawInterval;

        emit Withdraw(msg.sender, amount, nonce, signature);
    }

    /**
     * @dev Check Claimable
     */
    function checkClaimable(address user) external view returns (bool) {
        return block.timestamp >= nextWithdrawTime[user];
    }
}

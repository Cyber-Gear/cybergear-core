// SPDX-License-Identifier: MIT
pragma solidity >=0.8.12;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Guild Contract
 * @author CRYSTAL-LABS
 * @notice In this contract users can bind inviters
 */
contract Guild is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private users;
    mapping(address => address) public userInviter;

    EnumerableSet.AddressSet private inviters;
    mapping(address => EnumerableSet.AddressSet) private inviterUsers;

    event BindInviter(address indexed user, address inviter);

    constructor() {}

    /**
     * @dev Bind Inviter
     */
    function bindInviter(address inviter) external nonReentrant {
        require(inviter != address(0), "The inviter cannot be empty");
        require(
            userInviter[msg.sender] == address(0),
            "You have already bound the inviter"
        );
        require(inviter != msg.sender, "You cannot bind yourself");
        require(
            userInviter[inviter] != msg.sender,
            "Your inviter's inviter cannot be yourself"
        );

        userInviter[msg.sender] = inviter;

        inviters.add(inviter);
        users.add(msg.sender);
        inviterUsers[inviter].add(msg.sender);

        emit BindInviter(msg.sender, inviter);
    }

    /**
     * @dev Get Users Length
     */
    function getUsersLength() external view returns (uint256) {
        return users.length();
    }

    /**
     * @dev Get Users by Size
     */
    function getUsersBySize(
        uint256 cursor,
        uint256 size
    ) external view returns (address[] memory, uint256) {
        uint256 length = size;
        if (length > users.length() - cursor) {
            length = users.length() - cursor;
        }

        address[] memory values = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = users.at(cursor + i);
        }

        return (values, cursor + length);
    }

    /**
     * @dev Get Inviters Length
     */
    function getInvitersLength() external view returns (uint256) {
        return inviters.length();
    }

    /**
     * @dev Get Inviters by Size
     */
    function getInvitersBySize(
        uint256 cursor,
        uint256 size
    ) external view returns (address[] memory, uint256) {
        uint256 length = size;
        if (length > inviters.length() - cursor) {
            length = inviters.length() - cursor;
        }

        address[] memory values = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = inviters.at(cursor + i);
        }

        return (values, cursor + length);
    }

    /**
     * @dev Get Inviter Users Length
     */
    function getInviterUsersLength(
        address inviter
    ) external view returns (uint256) {
        return inviterUsers[inviter].length();
    }

    /**
     * @dev Get Inviter Users by Size
     */
    function getInviterUsersBySize(
        address inviter,
        uint256 cursor,
        uint256 size
    ) external view returns (address[] memory, uint256) {
        uint256 length = size;
        if (length > inviterUsers[inviter].length() - cursor) {
            length = inviterUsers[inviter].length() - cursor;
        }

        address[] memory values = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = inviterUsers[inviter].at(cursor + i);
        }

        return (values, cursor + length);
    }
}

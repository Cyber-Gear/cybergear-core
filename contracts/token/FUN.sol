// SPDX-License-Identifier: MIT
pragma solidity >=0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Fun Topia
 * @author FUNTOPIA-TEAM
 * @notice Contract to supply FUN
 */
contract FUN is ERC20 {
    constructor() ERC20("Fun Topia", "FUN") {
        _mint(msg.sender, 1e10 * 1e18);
    }
}

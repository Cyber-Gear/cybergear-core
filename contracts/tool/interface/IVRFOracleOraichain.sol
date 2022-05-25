// SPDX-License-Identifier: MIT
pragma solidity >=0.8.12;

interface IVRFOracleOraichain {
    function randomnessRequest(uint256 _seed, bytes calldata _data)
        external
        payable
        returns (bytes32 reqId);

    function getFee() external returns (uint256);
}

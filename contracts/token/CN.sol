// SPDX-License-Identifier: MIT
pragma solidity >=0.8.12;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Cyber Gear NFT
 * @author ISEKAI-TEAM
 * @notice Contract to supply CN
 */
contract CN is ERC721Enumerable, AccessControlEnumerable {
    using Strings for uint256;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant SPAWNER_ROLE = keccak256("SPAWNER_ROLE");
    bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");

    string public baseURI;

    mapping(uint256 => mapping(string => uint256)) public data;
    mapping(uint256 => mapping(string => uint256[])) public datas;

    event SetBaseURI(string uri);
    event SpawnCn(address indexed to, uint256 cnId, uint256 hero);
    event SetData(uint256 indexed cnId, string slot, uint256 data);
    event SetDatas(uint256 indexed cnId, string slot, uint256[] datas);

    /**
     * @param manager Initialize Manager Role
     */
    constructor(address manager) ERC721("Cyber Gear NFT", "CN") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, manager);
    }

    /**
     * @dev Allows the manager to set the base URI to be used for all token IDs
     */
    function setBaseURI(string memory uri) external onlyRole(MANAGER_ROLE) {
        baseURI = uri;

        emit SetBaseURI(uri);
    }

    /**
     * @dev Spawn a New Cn to an Address
     */
    function spawnCn(uint256 hero, address to)
        external
        onlyRole(SPAWNER_ROLE)
        returns (uint256)
    {
        uint256 newCnId = totalSupply();

        data[newCnId]["hero"] = hero;

        _safeMint(to, newCnId);

        emit SpawnCn(to, newCnId, hero);

        return newCnId;
    }

    /**
     * @dev Set Data
     */
    function setData(
        uint256 cnId,
        string memory slot,
        uint256 _data
    ) external onlyRole(SETTER_ROLE) {
        data[cnId][slot] = _data;

        emit SetData(cnId, slot, _data);
    }

    /**
     * @dev Set Datas
     */
    function setDatas(
        uint256 cnId,
        string memory slot,
        uint256[] memory _datas
    ) external onlyRole(SETTER_ROLE) {
        datas[cnId][slot] = _datas;

        emit SetDatas(cnId, slot, _datas);
    }

    /**
     * @dev Safe Transfer From Batch
     */
    function safeTransferFromBatch(
        address from,
        address to,
        uint256[] memory tokenIds
    ) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            safeTransferFrom(from, to, tokenIds[i]);
        }
    }

    /**
     * @dev Get Datas
     */
    function getDatas(uint256 cnId, string memory slot)
        external
        view
        returns (uint256[] memory)
    {
        return datas[cnId][slot];
    }

    /**
     * @dev Returns a list of token IDs owned by `user` given a `cursor` and `size` of its token list
     */
    function tokensOfOwnerBySize(
        address user,
        uint256 cursor,
        uint256 size
    ) external view returns (uint256[] memory, uint256) {
        uint256 length = size;
        if (length > balanceOf(user) - cursor) {
            length = balanceOf(user) - cursor;
        }

        uint256[] memory values = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = tokenOfOwnerByIndex(user, cursor + i);
        }

        return (values, cursor + length);
    }

    /**
     * @dev Get Random Number
     */
    function getRandomNumber(
        uint256 cnId,
        string memory slot,
        uint256 base,
        uint256 range
    ) external pure returns (uint256) {
        uint256 randomness = uint256(keccak256(abi.encodePacked(cnId, slot)));
        return base + (randomness % range);
    }

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for a token ID
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        return
            bytes(baseURI).length > 0
                ? string(
                    abi.encodePacked(
                        baseURI,
                        tokenId.toString(),
                        "-",
                        data[tokenId]["hero"].toString()
                    )
                )
                : "";
    }

    /**
     * @dev IERC165-supportsInterface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlEnumerable, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

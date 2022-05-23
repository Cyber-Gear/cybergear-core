// SPDX-License-Identifier: MIT
pragma solidity >=0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../token/interface/ICN.sol";

/**
 * @title Cyber Gear Shards
 * @author ISEKAI-TEAM
 * @notice Contract to supply CS
 */
contract CS is ERC721Enumerable, AccessControlEnumerable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant SPAWNER_ROLE = keccak256("SPAWNER_ROLE");
    bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");

    string public baseURI;

    IERC20 public kai;
    ICN public cn;

    uint256[15] public craftPrices = [
        100,
        100,
        100,
        100,
        200,
        200,
        200,
        300,
        300,
        300,
        300,
        400,
        400,
        400,
        400
    ];

    mapping(uint256 => mapping(string => uint256)) public data;
    mapping(uint256 => mapping(string => uint256[])) public datas;

    event SetBaseURI(string uri);
    event SetAddrs(address kaiAddr, address cnAddr);
    event SetPrices(uint256[15] prices);
    event SpawnCs(address indexed to, uint256 csId, uint256 hero);
    event SetData(uint256 indexed csId, string slot, uint256 data);
    event SetDatas(uint256 indexed csId, string slot, uint256[] datas);
    event Craft(
        address indexed user,
        uint256 hero,
        uint256 length,
        uint256[] cnIds
    );

    /**
     * @param manager Initialize Manager Role
     */
    constructor(address manager) ERC721("Cyber Gear Shards", "CS") {
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
     * @dev Set Addrs
     */
    function setAddrs(address kaiAddr, address cnAddr)
        external
        onlyRole(MANAGER_ROLE)
    {
        kai = IERC20(kaiAddr);
        cn = ICN(cnAddr);

        emit SetAddrs(kaiAddr, cnAddr);
    }

    /**
     * @dev Set Prices
     */
    function setPrices(uint256[15] memory prices)
        external
        onlyRole(MANAGER_ROLE)
    {
        craftPrices = prices;

        emit SetPrices(prices);
    }

    /**
     * @dev Spawn a New Cs to an Address
     */
    function spawnCs(uint256 hero, address to)
        external
        onlyRole(SPAWNER_ROLE)
        returns (uint256)
    {
        uint256 newCsId = totalSupply();

        data[newCsId]["hero"] = hero;

        _safeMint(to, newCsId);

        emit SpawnCs(to, newCsId, hero);

        return newCsId;
    }

    /**
     * @dev Set Data
     */
    function setData(
        uint256 csId,
        string memory slot,
        uint256 _data
    ) external onlyRole(SETTER_ROLE) {
        data[csId][slot] = _data;

        emit SetData(csId, slot, _data);
    }

    /**
     * @dev Set Datas
     */
    function setDatas(
        uint256 csId,
        string memory slot,
        uint256[] memory _datas
    ) external onlyRole(SETTER_ROLE) {
        datas[csId][slot] = _datas;

        emit SetDatas(csId, slot, _datas);
    }

    /**
     * @dev craft
     */
    function craft(uint256[] memory csIds) external nonReentrant {
        require(csIds.length > 0, "CsIds length must > 0");
        require(csIds.length <= 100, "CsIds length must <= 100");
        require(csIds.length % 10 == 0, "CsIds length % 10 must == 0");
        uint256 hero = data[csIds[0]]["hero"];
        require(hero < 100, "Hero must < 100");

        uint256 craftPrice = getCraftPrice(csIds);
        kai.safeTransferFrom(
            msg.sender,
            0x000000000000000000000000000000000000dEaD,
            craftPrice
        );

        uint256[] memory craftedCnIds = new uint256[](csIds.length / 10);
        for (uint256 index = 0; index < csIds.length; index += 10) {
            for (uint256 i = 0; i < 10; i++) {
                require(
                    data[csIds[index + i]]["hero"] == hero ||
                        data[csIds[index + i]]["hero"] == 100,
                    "Cs hero mismatch"
                );

                safeTransferFrom(
                    msg.sender,
                    0x000000000000000000000000000000000000dEaD,
                    csIds[index + i]
                );
            }

            craftedCnIds[index / 10] = cn.spawnCn(hero, msg.sender);
        }

        emit Craft(msg.sender, hero, craftedCnIds.length, craftedCnIds);
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
    function getDatas(uint256 csId, string memory slot)
        external
        view
        returns (uint256[] memory)
    {
        return datas[csId][slot];
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
        uint256 csId,
        string memory slot,
        uint256 base,
        uint256 range
    ) external pure returns (uint256) {
        uint256 randomness = uint256(keccak256(abi.encodePacked(csId, slot)));
        return base + (randomness % range);
    }

    /**
     * @dev Get Craft Price
     */
    function getCraftPrice(uint256[] memory csIds)
        public
        view
        returns (uint256)
    {
        uint256 hero = data[csIds[0]]["hero"];
        return craftPrices[hero - 1] * 1e18 * (csIds.length / 10);
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

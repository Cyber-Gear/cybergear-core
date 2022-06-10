// SPDX-License-Identifier: MIT
pragma solidity >=0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "../token/interface/ICN.sol";

/**
 * @title Cyber Gear Box
 * @author FUNTOPIA-TEAM
 * @notice Contract to supply CB
 */
contract CB is
    ERC721Enumerable,
    AccessControlEnumerable,
    ReentrancyGuard,
    VRFConsumerBaseV2
{
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;
    using Strings for uint256;

    VRFCoordinatorV2Interface public COORDINATOR;
    LinkTokenInterface public LINKTOKEN;

    // testnet: 0x2eD832Ba664535e5886b75D64C46EB9a228C2610
    address public vrfCoordinator = 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634;

    // testnet: 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846
    address public link_token_contract =
        0x5947BB275c521040051D82396192181b413227A3;

    // testnet: 0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61
    bytes32 public keyHash =
        0x83250c5584ffa93feb6ee082981c5ebe484c865196750b39835ad4f13780435d;

    uint32 public callbackGasLimit = 2500000;
    uint16 public requestConfirmations = 3;

    uint64 public subscriptionId;
    mapping(uint256 => address) public requestIdToUser;
    mapping(uint256 => uint256[]) public requestIdToTypes;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    ICN public cn;

    string public baseURI;

    mapping(uint256 => uint256) public cbIdToType;

    mapping(uint256 => uint256) public boxTokenPrices;
    mapping(uint256 => address) public tokenAddrs;
    mapping(uint256 => address) public receivingAddrs;
    mapping(uint256 => uint256) public hourlyBuyLimits;
    mapping(uint256 => bool) public whiteListFlags;
    mapping(uint256 => uint256[]) public heroProbabilities;

    mapping(uint256 => uint256) public boxesMaxSupply;
    mapping(uint256 => uint256) public totalBoxesLength;
    mapping(address => mapping(uint256 => mapping(uint256 => uint256)))
        public userHourlyBoxesLength;
    mapping(uint256 => EnumerableSet.AddressSet) private whiteList;

    event SetBaseURI(string uri);
    event SetAddrs(address cnAddr);
    event SetBoxInfo(
        uint256 boxType,
        uint256 boxTokenPrice,
        address tokenAddr,
        address receivingAddr,
        uint256 hourlyBuylimit,
        bool whiteListFlag,
        uint256[] heroProbability
    );
    event AddBoxesMaxSupply(uint256 supply, uint256 boxType);
    event AddWhiteList(uint256 boxType, address[] whiteUsers);
    event RemoveWhiteList(uint256 boxType, address[] whiteUsers);
    event BuyBoxes(
        address indexed user,
        uint256 amount,
        uint256[] cbIds,
        uint256 boxType
    );
    event OpenBoxes(
        address indexed user,
        uint256 amount,
        uint256[] cbIds,
        uint256[] boxTypes
    );
    event SpawnCns(address indexed user, uint256 amount, uint256[] cnIds);

    /**
     * @param manager Initialize Manager Role
     */
    constructor(address manager)
        ERC721("Cyber Gear Box", "CB")
        VRFConsumerBaseV2(vrfCoordinator)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, manager);

        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        LINKTOKEN = LinkTokenInterface(link_token_contract);
        subscriptionId = COORDINATOR.createSubscription();
        COORDINATOR.addConsumer(subscriptionId, address(this));
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
    function setAddrs(address cnAddr) external onlyRole(MANAGER_ROLE) {
        cn = ICN(cnAddr);

        emit SetAddrs(cnAddr);
    }

    /**
     * @dev Set Box Info
     */
    function setBoxInfo(
        uint256 boxType,
        uint256 boxTokenPrice,
        address tokenAddr,
        address receivingAddr,
        uint256 hourlyBuyLimit,
        bool whiteListFlag,
        uint256[] memory heroProbability
    ) external onlyRole(MANAGER_ROLE) {
        boxTokenPrices[boxType] = boxTokenPrice;
        tokenAddrs[boxType] = tokenAddr;
        receivingAddrs[boxType] = receivingAddr;
        hourlyBuyLimits[boxType] = hourlyBuyLimit;
        whiteListFlags[boxType] = whiteListFlag;
        heroProbabilities[boxType] = heroProbability;

        emit SetBoxInfo(
            boxType,
            boxTokenPrice,
            tokenAddr,
            receivingAddr,
            hourlyBuyLimit,
            whiteListFlag,
            heroProbability
        );
    }

    /**
     * @dev Add Boxes Max Supply
     */
    function addBoxesMaxSupply(uint256 supply, uint256 boxType)
        external
        onlyRole(MANAGER_ROLE)
    {
        boxesMaxSupply[boxType] += supply;

        emit AddBoxesMaxSupply(supply, boxType);
    }

    /**
     * @dev Add White List
     */
    function addWhiteList(uint256 boxType, address[] memory whiteUsers)
        external
        onlyRole(MANAGER_ROLE)
    {
        for (uint256 i = 0; i < whiteUsers.length; i++) {
            whiteList[boxType].add(whiteUsers[i]);
        }

        emit AddWhiteList(boxType, whiteUsers);
    }

    /**
     * @dev Remove White List
     */
    function removeWhiteList(uint256 boxType, address[] memory whiteUsers)
        external
        onlyRole(MANAGER_ROLE)
    {
        for (uint256 i = 0; i < whiteUsers.length; i++) {
            whiteList[boxType].remove(whiteUsers[i]);
        }

        emit RemoveWhiteList(boxType, whiteUsers);
    }

    /**
     * @dev Clear Native Coin
     */
    function clearNativeCoin(address payable to, uint256 amount)
        external
        onlyRole(MANAGER_ROLE)
    {
        to.transfer(amount);
    }

    /**
     * @dev Users buy the boxes
     */
    function buyBoxes(uint256 amount, uint256 boxType)
        external
        payable
        nonReentrant
    {
        require(amount > 0, "Amount must > 0");
        require(
            getUserHourlyBoxesLeftSupply(
                boxType,
                msg.sender,
                block.timestamp
            ) >= amount,
            "Amount exceeds the hourly buy limit"
        );
        require(
            getBoxesLeftSupply(boxType) >= amount,
            "Not enough boxes supply"
        );
        require(
            boxTokenPrices[boxType] > 0,
            "The box price of this box has not been set"
        );
        require(
            receivingAddrs[boxType] != address(0),
            "The receiving address of this box has not been set"
        );
        require(
            heroProbabilities[boxType].length > 0,
            "The hero probability of this box has not been set"
        );
        if (whiteListFlags[boxType]) {
            require(
                whiteList[boxType].contains(msg.sender),
                "Your address must be on the whitelist"
            );
        }

        uint256 price = amount * boxTokenPrices[boxType];
        if (tokenAddrs[boxType] == address(0)) {
            require(msg.value == price, "Price mismatch");
            payable(receivingAddrs[boxType]).transfer(price);
        } else {
            IERC20 token = IERC20(tokenAddrs[boxType]);
            token.safeTransferFrom(msg.sender, receivingAddrs[boxType], price);
        }

        uint256[] memory cbIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            cbIds[i] = totalSupply();
            cbIdToType[cbIds[i]] = boxType;

            _safeMint(msg.sender, cbIds[i]);
        }

        userHourlyBoxesLength[msg.sender][boxType][
            block.timestamp / 1 hours
        ] += amount;
        totalBoxesLength[boxType] += amount;

        emit BuyBoxes(msg.sender, amount, cbIds, boxType);
    }

    /**
     * @dev Users open the boxes
     */
    function openBoxes(uint256[] memory cbIds) external nonReentrant {
        require(cbIds.length > 0, "Amount must > 0");

        uint256[] memory boxTypes = new uint256[](cbIds.length);
        for (uint256 i = 0; i < cbIds.length; i++) {
            boxTypes[i] = cbIdToType[cbIds[i]];

            safeTransferFrom(
                msg.sender,
                0x000000000000000000000000000000000000dEaD,
                cbIds[i]
            );
        }

        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            uint32(cbIds.length)
        );
        requestIdToUser[requestId] = msg.sender;
        requestIdToTypes[requestId] = boxTypes;

        emit OpenBoxes(msg.sender, cbIds.length, cbIds, boxTypes);
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
     * @dev Get White List Existence
     */
    function getWhiteListExistence(uint256 boxType, address user)
        external
        view
        returns (bool)
    {
        return whiteList[boxType].contains(user);
    }

    /**
     * @dev Get Boxes Left Supply
     */
    function getBoxesLeftSupply(uint256 boxType) public view returns (uint256) {
        return boxesMaxSupply[boxType] - totalBoxesLength[boxType];
    }

    /**
     * @dev Get User Hourly Boxes Left Supply
     */
    function getUserHourlyBoxesLeftSupply(
        uint256 boxType,
        address user,
        uint256 timestamp
    ) public view returns (uint256) {
        return
            hourlyBuyLimits[boxType] -
            userHourlyBoxesLength[user][boxType][timestamp / 1 hours];
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
                        cbIdToType[tokenId].toString()
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

    /**
     * @dev Get Level
     */
    function getLevel(uint256[] memory array, uint256 _random)
        public
        pure
        returns (uint256)
    {
        uint256 accProbability;
        uint256 level;
        for (uint256 i = 0; i < array.length; i++) {
            accProbability += array[i];
            if (_random < accProbability) {
                level = i;
                break;
            }
        }
        return level + 1;
    }

    /**
     * @dev Spawn CN to User when get Randomness Response
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        uint256[] memory cnIds = new uint256[](randomWords.length);

        for (uint256 i = 0; i < randomWords.length; i++) {
            uint256 hero = getLevel(
                heroProbabilities[requestIdToTypes[requestId][i]],
                randomWords[i] % 1e4
            );

            cnIds[i] = cn.spawnCn(hero, requestIdToUser[requestId]);
        }

        emit SpawnCns(requestIdToUser[requestId], randomWords.length, cnIds);
    }

    receive() external payable {}
}

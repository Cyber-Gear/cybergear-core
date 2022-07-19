## Install Dependencies

```
npm i
```

## Build Contracts and Generate Typechain Typeings

```
npm run build
```

## Run Contract Tests

```
npm run test
```

## Run Coverage Report for Tests

```
npm run coverage
```

## Deploy and Verify to Rinkeby

Create a new `.env` file in the root directory, and put your PRIVATE_KEY and ETHERSCAN_API_KEY in it.

If you do not have ETHERSCAN_API_KEY, go to `https://etherscan.io/myapikey` and add one.

```
PRIVATE_KEY = <Your Private Key>
ETHERSCAN_API_KEY = <Your Etherscan Api Key>
```

And then run:

```
npm run deploy
```

## Generate Flattened Contract 

```
npm run flatten
```

## Run Scripts on Server

```
pm2 start
```

## Check Scripts Logs on Server

```
pm2 logs
```
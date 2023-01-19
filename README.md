# dApp Development with React Workshop

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![React.js](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-4E5EE4?logo=openzeppelin&logoColor=fff&style=for-the-badge)
[![Netlify Deployment](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://ata-token.netlify.app)

In this workshop we will be building a DeFi application with a custom ERC20 token and staking vault using [vite][vite] to bundle a [React.js][react] application and [ethers][ethers] library to connect to the blockchain. You can checkout the finished project [here][production]. The project is deployed on [Avalanche Fuji Testnet][fuji], you can receive funds from testnet's faucet [here][faucet].

## Initialize React Application with [`vite`][vite]

[`vite`][vite] next generation tooling for building frontend applications. Get started with [`vite`][vite] by running following command.

```bash
npm create vite@latest
```

We can run the development server using `npm run dev` and local server will start will start with automatic reloads!

> You can remove unnecessary markup and CSS that `vite` creates

## Connecting to MetaMask

MetaMask adds a global object `ethereum` that can be used to interact with MetaMask. This object can be accessed by `window.ethereum`.

We can send requests to MetaMask using `window.ethereum.request()` method, we ask the user to connect their account by sending the `eth_requestAccounts` request. Details of this request can be found in [MetaMask's documentation](https://docs.metamask.io/guide/rpc-api.html#eth-requestaccounts).

```js
const [account] = await window.ethereum.request({
  method: "eth_requestAccounts",
});
```

We can use `useEffect` and `useState` hooks to initialize `account` state when the component mounts.

> Providing `[]` (empty array) to dependency section of `useEffect(func, [])`
> runs `func` only once when the component mounts!

```js
const requestAccounts = async () => {
  if (!window.ethereum) {
    return null;
  }
  const [account] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  return account;
};

function App() {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    requestAccounts().then(setAccount).catch(console.error);
  }, []);

  //...
}
```

How ever there are two problems here! First the user gets prompted before they can see the app and if they change their account the app doesn't update!

### Listening to Account Changes

`ethereum` object is an `EventEmitter` so we can listen to `accountsChanged` event when we initialize our application.

```js
window.ethereum.on("accountsChanged", accounts => {
  setAccount(accounts[0]); // set new account state
});
```

### Accessing Accounts

There is an alternative method called `eth_accounts` that query MetaMask if the user has already connected their account to our application. If user has already connected their account MetaMask will simply return the account without prompting.

```js
const [account] = await window.ethereum.request({
  method: "eth_accounts",
});
```

## Interacting with EVM using [`ethers`][ethers]

We will be using [`ethers`][ethers] to interact with the blockchain. `ethers` can be installed with `npm` simply by running following command in the terminal.

```bash
npm i ethers
```

`ethers` library includes multiple types of providers for accessing onchain data. These include popular providers like [`InfuraProvider`](https://docs.ethers.io/v5/api/providers/api-providers/#InfuraProvider) (a popular JSON-RPC endpoint provider, [website](https://infura.io/)), generic providers such as [`JsonRpcProvider`](https://docs.ethers.io/v5/api/providers/api-providers/#InfuraProvider) and [`Web3Provider`](https://docs.ethers.io/v5/api/providers/other/#Web3Provider) which connects using MetaMask.

We can initialize our provider with global `ethereum` object as follows.

```js
import { ethers } from "ethers";

// ...

const provider = new ethers.providers.Web3Provider(window.ethereum);
```

Having initialized our provider we can now access chain data! Let's start by building a `Balance` React component that display's chain's default coin in this case AVAX. `Balance` component receives `account` and `provider` as props and computes the balance and displays it.

```jsx
const Balance = ({ provider, account }) => {
  const [balance, setBalance] = useState("");

  useEffect(() => {
    const getBalance = async () => {
      const balance = await provider.getBalance(account);
      return ethers.utils.formatEther(balance);
    };
    getBalance().then(setBalance).catch(console.error);
  }, [account, provider]);

  if (!balance) {
    return <p>Loading...</p>;
  }
  return <p>Balance: {balance} AVAX</p>;
};
```

We derive our balance state from `account` and `provider` using `useEffect` hook. If the user changes their account their balance is recalculated. We use `provider.getBalance(account)` function to access user's AVAX balance and convert it to string using `formatEther` function.

> In EVM balance of a ERC20 token is stored as a unsigned 256-bit integer. However, JavaScript `Number` type is a [double-precision 64-bit binary format IEEE 754][float] so balance of an account can be larger than JavaScript's numbers allow. `ethers` library represents these numbers as `BigNumber` type and `formatEther` utility function can be used to convert `BigNumber` to `String`.

## Balance of Custom ERC20 Token

What is web3 without custom tokens? Let's bring our project's ERC20 token into our application. To do this, we will be using `ethers.Contract`. This class can be used to instantiate custom EVM contracts from their address and ABI.

> `ethers.Contract` is a meta class under the hood, meaning it's a class that creates classes not instances! `Contract` class receives ABI and constructs a new class that has ABI's exported properties.

For our purposes ERC20 token called 'DummyToken (DT)' has deployed to Avalanche Fuji testnet at `0x5E8F49F4062d3a163cED98261396821ae2996596`. We can use [SnowTrace block explorer][snowtrace] to inspect contract's methods and ABI, token contract on explorer can be found [here](https://testnet.snowtrace.io/address/0x5E8F49F4062d3a163cED98261396821ae2996596). We can import ABI as a regular JSON file and initialize contract!

```js
import DummyTokenABI from "../../abi/dummyToken.abi.json"; // Path to ABI's JSON file

const DUMMY_TOKEN_ADDRESS = "0x5E8F49F4062d3a163cED98261396821ae2996596";
const DUMMY_TOKEN = new ethers.Contract(DUMMY_TOKEN_ADDRESS, DummyTokenABI);
```

Then, we can read token balance using `balanceOf(address)` method similar to AVAX balance.

```js
useEffect(() => {
  const getBalance = async () => {
    const dummyToken = DUMMY_TOKEN.connect(provider);
    const balance = await dummyToken.balanceOf(account);
    return ethers.utils.formatEther(balance);
  };
  getBalance().then(setBalance).catch(console.error);
}, [provider, account]);
```

As expected DummyToken balance turns out to be 0. Fortunately, DummyToken contract exports a function to obtain some tokens.

## Claiming DummyToken

We can check if an account has claimed using a similar function `hasClaimed()` function and we can modify `useEffect` to check when the `AtaBalance` mounts.

```js
const getBalanceAndClaimed = async () => {
  const dummyToken = DUMMY_TOKEN.connect(provider);
  const [balance, claimed] = await Promise.all([
    dummyToken.balanceOf(account),
    dummyToken.hasClaimed(),
  ]);
  return [ethers.utils.formatEther(balance), claimed];
};
```

> `Promise.all([awaitable1, awaitable2, ...])` can be used to await multiple async calls at the same time and receive resolved promises in order awaitables' order.

If the user hasn't claimed we can a render a button that when pressed will invoke `claim()` method on the contract. Since, we are modifying state of blockchain it's not enough for us to use a [`Provider`][provider] as they provide a **readonly** view of blockchain. We will be using [`Signer`][signer] which can used to send transactions.

```js
const claim = async () => {
  const signer = provider.getSigner();
  const dummyToken = DUMMY_TOKEN.connect(signer);

  const tx = await dummyToken.claim();
  await tx.wait();
};
```

If we refresh the page we can see our funds arrive! However, it isn't such a good user experience if they have to refresh the page every time they make transaction. With some refactoring we can solve this issue.

```js
const getBalanceAndClaimed = async (account, provider) => {
  const dummyToken = DUMMY_TOKEN.connect(provider);
  const [balance, claimed] = await Promise.all([
    dummyToken.balanceOf(account),
    dummyToken.hasClaimed(account),
  ]);
  return [ethers.utils.formatEther(balance), claimed];
};

const DummyToken = ({ account, provider }) => {
  // `DummyToken` component state

  const claim = async () => {
    // ...
    await tx.wait();

    getBalanceAndClaimed(account, provider)
      .then(/* set balance and claimed */)
      .catch();
  };

  useEffect(() => {
    getBalanceAndClaimed(account, provider)
      .then(/* set balance and claimed */)
      .catch();
  }, [provider, account]);

  // ...
};
```

## Adding DummyToken to MetaMask

Even tough, users can claim their tokens, DummyToken doesn't show up in MetaMask wallet. We can remedy this situation by sending `wallet_watchAsset` request through global `ethereum` object. We provide address of the token, symbol, decimals and lastly image for MetaMask to use.

```js
const addDummyTokenToMetaMask = async () => {
  if (!window.ethereum) {
    return false;
  }
  try {
    const added = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: DUMMY_TOKEN_ADDRESS,
          symbol: "DT",
          decimals: 18,
          image: "https://ata-token.netlify.app/opn.png",
        },
      },
    });
    return added;
  } catch (error) {
    return false;
  }
};
```

## Integrating Staking Contract

ERC20 allocation staking is one of most common practices in web3 launchpads and DeFi applications. Usually, users lock some amount of funds into smart contract and receive certain amount of rewards funds in return as interest. In case of launchpads like [OpenPad][openpad] in addition to receiving interest users are able to invest in launchpad project.

Lastly, for our application we will integrating a staking contact. DummyToken staking contract is deployed at `0xAC1BdE0464D932bf1097A9492dCa8c3144194890` and we can inspect the contract code and ABI [here](https://testnet.snowtrace.io/address/0xAC1BdE0464D932bf1097A9492dCa8c3144194890#code).

Staking contract exports stake and reward token amount for a given address and also total staked token amounts. We can read these values like any other contract value using `stakedOf()`, `rewardOf()` and `totalStaked()` respectively.

```js
const getStakingViews = async (account, provider) => {
  const signer = provider.getSigner(account);
  const staking = STAKING_CONTRACT.connect(signer);
  const [staked, reward, totalStaked] = await Promise.all([
    staking.stakedOf(account),
    staking.rewardOf(account),
    staking.totalStaked(),
  ]);
  return {
    staked: ethers.utils.formatEther(staked),
    reward: ethers.utils.formatEther(reward),
    totalStaked: ethers.utils.formatEther(totalStaked),
  };
};
```

### Staking and Withdrawing Funds

Users can stake their tokens using `stake(uint256 amount)` function and withdraw their locked funds using `withdraw(uint256 amount)` function. Most important of them all they can claim rewards using `claimReward()` function. Since these functions modify state of the contract we have to use a [`Signer`][signer].

We can write a simple form for user to fill out while staking and fire off relevant contract function when the form is submitted.

```js
const Staking = ({ account, provider }) => {
  // ...
  const [stake, setStake] = useState("");

  const handleStake = async event => {
    event.preventDefault(); // prevent page refresh when form is submitted
    const signer = provider.getSigner(account);
    const staking = STAKING_CONTRACT.connect(signer);

    const tx = await staking.stake(ethers.utils.parseEther(stake), {
      gasLimit: 1_000_000,
    });
    await tx.wait();
  };
  // ...
  return (
    <div>
      {/* ... */}
      <form>
        <label htmlFor="stake">Stake</label>
        <input
          id="stake"
          placeholder="0.0 DT"
          value={stake}
          onChange={e => setStake(e.target.value)}
        />
        <button type="submit" onClick={handleStake}>
          Stake DT
        </button>
      </form>
      {/* ... */}
    </div>
  );
};
```

Withdrawing funds from contract can be implemented similarly. However, if we try staking our tokens the contract will throw out an error! This is due to fact that we are not transferring native currency of the chain. While transferring ERC20 tokens into a contract we have **approve** a certain amount of **allowance** for that contract to use.

### Allowance and Approval

We can check if for allowance of a smart contract -_spender_- from an address -_owner_- on ERC20 contract using `allowance(owner, spender)` view function. If allowance is less than amount we want stake, we have to increase the allowance by signing `approve(spender, amount)` message.

```js
const handleStake = async event => {
  const signer = provider.getSigner(account);
  const amount = ethers.utils.parseEther(stake);

  const dummyToken = DUMMY_TOKEN.connect(signer);
  const allowance = await dummyToken.allowance(
    account,
    STAKING_CONTRACT.address
  );
  if (allowance.lt(amount)) {
    const tx = await dummyToken.approve(STAKING_CONTRACT.address, amount);
    await tx.wait();
  }
  // ...
};
```

Voila! With allowance out of our way, we are free to stake and withdraw funds as we like.

### Claiming Rewards

What is DeFi without rewards? Let's finish off our application by allowing users to claim their rewards. This is simple task since we aren't spending ERC20 tokens we don't have to deal with the allowance. The user only has to sign `claimRewards()` function and we are done!

```js
const handleClaimReward = async () => {
  const signer = provider.getSigner(account);
  const staking = STAKING_CONTRACT.connect(signer);

  const tx = await staking.claimReward({
    gasLimit: 1_000_000,
  });
  await tx.wait();
};
```

## Next Steps

- Add [TypeScript](https://www.typescriptlang.org/) support for large DeFi applications
- Add [`@tanstack/react-query`](https://tanstack.com/query/v4/) for async state management
- More smart contracts! Mint NFTs with ERC721?

[react]: https://reactjs.org
[vite]: https://vitejs.dev/
[ethers]: https://github.com/ethers-io/ethers.js
[float]: https://en.wikipedia.org/wiki/Floating-point_arithmetic
[snowtrace]: https://snowtrace.io
[provider]: https://docs.ethers.io/v5/api/providers/provider/
[signer]: https://docs.ethers.io/v5/api/signer/#Signer
[openpad]: https://openpad.app
[production]: https://ata-token.netlify.app
[fuji]: https://docs.avax.network/quickstart/fuji-workflow
[faucet]: https://faucet.avax.network/

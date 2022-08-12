# dApp Development with React Workshop

[![Netlify Status](https://api.netlify.com/api/v1/badges/b389b075-81c2-4615-9c00-808e32ef1518/deploy-status)](https://ata-token.netlify.app)

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

For our purposes ERC20 token called 'AtaToken (ATA)' has deployed to Avalanche Fuji testnet at `0x6d9721fA0CD1668cBA3D29aFe4176E5548230395`. We can use [SnowTrace block explorer][snowtrace] to inspect contract's methods and ABI, token contract on explorer can be found [here](https://testnet.snowtrace.io/address/0x6d9721fA0CD1668cBA3D29aFe4176E5548230395). We can import ABI as a regular JSON file and initialize contract!

```js
import AtaTokenABI from "../../abi/ataToken.abi.json"; // Path to ABI's JSON file

const ATA_TOKEN_ADDRESS = "0x6d9721fA0CD1668cBA3D29aFe4176E5548230395";
const ATA_TOKEN = new ethers.Contract(ATA_TOKEN_ADDRESS, AtaTokenABI);
```

Then, we can read token balance using `balanceOf(address)` method similar to AVAX balance.
```js
useEffect(() => {
  const getBalance = async () => {
    const ataToken = ATA_TOKEN.connect(provider);
    const balance = await ataToken.balanceOf(account);
    return ethers.utils.formatEther(balance);
  };
  getBalance().then(setBalance).catch(console.error);
}, [provider, account]);
```

As expected AtaToken balance turns out to be 0. Fortunately, AtaToken contract exports a function to obtain some tokens.

## Claiming AtaToken

We can check if an account has claimed using a similar function `claimed()` function and we can modify `useEffect` to check when the `AtaBalance` mounts.

```js
const getBalanceAndClaimed = async () => {
  const ataToken = ATA_TOKEN.connect(provider);
  const [balance, claimed] = await Promise.all([
    ataToken.balanceOf(account),
    ataToken.claimed(),
  ]);
  return [ethers.utils.formatEther(balance), claimed];
};
```

> `Promise.all([awaitable1, awaitable2, ...])` can be used to await multiple async calls at the same time and receive resolved promises in order awaitables' order.

If the user hasn't claimed we can a render a button that when pressed will invoke `claim()` method on the contract. Since, we are modifying state of blockchain it's not enough for us to use a [`Provider`][provider] as they provide a **readonly** view of blockchain. We will be using [`Signer`][signer] which can used to send transactions.

```js
const claim = async () => {
  const signer = provider.getSigner();
  const ataToken = ATA_TOKEN.connect(signer);

  const tx = await ataToken.claim();
  await tx.wait();
}
```

If we refresh the page we can see our funds arrive! However, it isn't such a good user experience if they have to refresh the page every time they make transaction. With some refactoring we can solve this issue.

```js
const getBalanceAndClaimed = async (account, provider) => {
  const ataToken = ATA_TOKEN.connect(provider);
  const [balance, claimed] = await Promise.all([
    ataToken.balanceOf(account),
    ataToken.hasClaimed(account),
  ]);
  return [ethers.utils.formatEther(balance), claimed];
};

const AtaToken = ({ account, provider }) => {
  // `AtaToken` component state

  const claim = async () => {
    // ...
    await tx.wait();

    getBalanceAndClaimed(account, provider)
      .then(/* set balance and claimed */)
      .catch()
  };

  useEffect(() => {
    getBalanceAndClaimed(account, provider)
      .then(/* set balance and claimed */)
      .catch()
  }, [provider, account]);

  // ...
}
```

[vite]: https://vitejs.dev/
[ethers]: https://github.com/ethers-io/ethers.js
[float]: https://en.wikipedia.org/wiki/Floating-point_arithmetic
[snowtrace]: https://snowtrace.io
[provider]: https://docs.ethers.io/v5/api/providers/provider/
[signer]: https://docs.ethers.io/v5/api/signer/#Signer

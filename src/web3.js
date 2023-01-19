import { ethers } from "ethers";
import DummyTokenABI from "../abi/dummyToken.abi.json";
import StakingAbi from "../abi/stakingVault.abi.json";

function getWeb3Provider() {
    if (window.ethereum) {
        return new ethers.providers.Web3Provider(window.ethereum);
    }
    return null;
}

export const provider = getWeb3Provider();

export const DUMMY_TOKEN_ADDRESS = import.meta.env.VITE_DUMMY_TOKEN_ADDRESS;
export const DUMMY_TOKEN = new ethers.Contract(
    DUMMY_TOKEN_ADDRESS,
    DummyTokenABI
);

export const STAKING_ADDRESS = import.meta.env.VITE_STAKING_ADDRESS;
export const STAKING_CONTRACT = new ethers.Contract(
    STAKING_ADDRESS,
    StakingAbi
);

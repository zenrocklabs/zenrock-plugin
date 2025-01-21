import { createPublicClient, formatUnits, http } from 'viem';
import {
  type IAgentRuntime,
  type Provider,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import type {
  Address,
  PublicClient,
  Chain,
  HttpTransport,
  Account,
} from 'viem';
import { isAddress } from 'viem';
import * as viemChains from 'viem/chains';

export class RpcProvider {
  private chains: Record<string, Chain> = { ...viemChains };
  private rpcUrl: string;

  constructor(rpcUrl: string, chains?: Record<string, Chain>) {
    this.rpcUrl = rpcUrl;
    if (chains) {
      this.chains = { ...this.chains, ...chains };
    }
  }

  getClient(
    chainName: string
  ): PublicClient<HttpTransport, Chain, Account | undefined> {
    const transport = http(this.rpcUrl);
    return createPublicClient({
      chain: this.chains[chainName],
      transport,
    });
  }

  async getAccountNonce(
    address: Address,
    chainName: string
  ): Promise<number | null> {
    try {
      const client = this.getClient(chainName);
      const nonce = await client.getTransactionCount({ address });
      return nonce;
    } catch (error) {
      elizaLogger.error('Error getting account nonce:', error);
      return null;
    }
  }

  async getAccountBalance(
    address: Address,
    chainName: string
  ): Promise<string | null> {
    try {
      const client = this.getClient(chainName);
      const balance = await client.getBalance({ address });
      return formatUnits(balance, 18);
    } catch (error) {
      elizaLogger.error('Error getting account balance:', error);
      return null;
    }
  }
}

export const evmAccountInfoProvider: Provider = {
  async get(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<string | null> {
    try {
      console.log(`EVM RPC PROVIDER GET CALLED`);

      const rpcUrl = runtime.getSetting('ZR_EVM_RPC') as string;
      const address = runtime.getSetting('ZR_EVM_WALLET_ADDRESS') as Address;
      if (!address || !isAddress(address)) {
        throw new Error('Invalid or missing Ethereum wallet address');
      }

      const chainName = 'Holesky';
      const provider = new RpcProvider(rpcUrl);
      const nonce = await provider.getAccountNonce(address, chainName);
      const balance = await provider.getAccountBalance(address, chainName);

      return `EVM Wallet Address: ${address}\nNonce: ${nonce}\nBalance: ${balance} ETH`;
    } catch (error) {
      elizaLogger.error('Error in EVM RPC provider:', error);
      return null;
    }
  },
};

export default evmAccountInfoProvider;

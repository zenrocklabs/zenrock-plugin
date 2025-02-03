// utils.ts
import { createPublicClient, http } from 'viem';
import type { Chain, HttpTransport, PublicClient, Account } from 'viem';
import * as viemChains from 'viem/chains';

/**
 * Retrieves all available EVM chains.
 * @returns A record of chain names to Chain objects.
 */
export function getEVMChains(): Record<string, Chain> {
  return { ...viemChains };
}

/**
 * Retrieves a specific EVM Chain by its name.
 * @param chainName - The name of the chain to retrieve.
 * @param chains - Optional custom chains to include. Defaults to viemChains.
 * @returns The Chain object corresponding to the provided chainName.
 * @throws Will throw an error if the chainName does not exist in the chains.
 */
export function getEVMChain(
  chainName: string,
  chains: Record<string, Chain> = viemChains
): Chain {
  const chain = chains[chainName];
  if (!chain) {
    throw new Error(`Chain "${chainName}" not found.`);
  }
  return chain;
}

/**
 * Creates a PublicClient for interacting with a specific EVM chain.
 * @param rpcUrl - The RPC URL of the EVM node.
 * @param chainName - The name of the chain to connect to.
 * @param chains - Optional custom chains to include. Defaults to viemChains.
 * @returns A PublicClient instance configured for the specified chain.
 * @throws Will throw an error if the chainName does not exist in the chains.
 */
export function getEVMClient(
  rpcUrl: string,
  chainName: string,
  chains: Record<string, Chain> = viemChains
): PublicClient<HttpTransport, Chain, Account | undefined> {
  const chain = getEVMChain(chainName, chains); // Ensures the chain exists
  const transport = http(rpcUrl);

  return createPublicClient({
    chain,
    transport,
  });
}

import dotenv from 'dotenv';
import { describe, it, expect, beforeAll } from 'vitest';
import * as viemChains from 'viem/chains';
import { RpcProvider } from '../providers/evmAccountInfoProvider';
import { Address } from 'viem';

dotenv.config();

const RPC_URL = process.env.ZR_EVM_RPC as string;
const WALLET_ADDRESS = process.env.ZR_EVM_WALLET_ADDRESS as Address;
const CHAIN_NAME = viemChains.holesky.name;

describe('RpcProvider E2E Tests', () => {
  let provider: RpcProvider;

  beforeAll(() => {
    if (!RPC_URL || !WALLET_ADDRESS) {
      throw new Error(
        'RPC_URL and WALLET_ADDRESS must be defined in .env file'
      );
    }
    provider = new RpcProvider(RPC_URL);
  });

  it('should fetch the correct nonce for the account', async () => {
    const nonce = await provider.getAccountNonce(WALLET_ADDRESS, CHAIN_NAME);
    console.log(`Nonce: ${nonce}`);
    expect(nonce).not.toBeNull();
    expect(typeof nonce).toBe('number');
    expect(nonce).toBeGreaterThanOrEqual(0);
  });

  it('should fetch the correct balance for the account', async () => {
    const balance = await provider.getAccountBalance(
      WALLET_ADDRESS,
      CHAIN_NAME
    );
    console.log(`Balance: ${balance} ETH`);
    expect(balance).not.toBeNull();
    expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);
  });
});

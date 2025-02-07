import { createPublicClient, http } from 'viem';
import { parseUnits, encodeFunctionData } from 'viem';
import { serializeTransaction } from 'viem';
import { keccak256 } from 'viem';
import type { Signature, TransactionSerializable } from 'viem';
import { EVMTxParams } from '../zenrock/instructionTemplates';

const rpcUrl =
  process.env.ZR_EVM_RPC ??
  (() => {
    throw new Error('ZR_EVM_RPC environment variable is not set.');
  })();

export async function createUnsignedTx(
  evmTxParams: EVMTxParams
): Promise<{ unsignedTx: string; txHash: string }> {
  const client = createPublicClient({ transport: http(rpcUrl) });

  const nonce = await client.getTransactionCount({
    address: evmTxParams.from as `0x${string}`,
  });
  const chainId = await client.getChainId();
  const block = await client.getBlock({ blockTag: 'latest' });
  const baseFeePerGas = block.baseFeePerGas ?? 0n;
  const maxPriorityFeePerGas = 1000000n;
  const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas;

  let tx: TransactionSerializable = {
    type: 'eip1559',
    nonce,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gas: 0n, 
    to: evmTxParams.to as `0x${string}`,
    value: evmTxParams.isNativeTransfer
      ? BigInt(Math.round(Number(evmTxParams.value) * 1e18))
      : 0n,
    data: '0x',
    chainId,
    accessList: [],
  };

  if (!evmTxParams.isNativeTransfer) {
    const tokenContractAddress = evmTxParams.contractAddress;
    if (!tokenContractAddress || tokenContractAddress.length === 0) {
      throw new Error(
        'TOKEN_CONTRACT_ADDRESS is not defined in environment variables'
      );
    }
    const erc20Abi = [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
      {
        name: 'decimals',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
        constant: true,
      },
    ];

    const decimals = await client.readContract({
      address: tokenContractAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'decimals',
    });

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [evmTxParams.to, parseUnits(evmTxParams.value.toString(), decimals as number)],
    });

    tx.to = tokenContractAddress as `0x${string}`;
    tx.data = data as `0x${string}`;
  }

  const gasLimit = await client.estimateGas({
    account: evmTxParams.from as `0x${string}`,
    to: tx.to,
    data: tx.data,
    value: tx.value,
  });
  tx.gas = gasLimit;

  const signaturePlaceholder: Signature = {
    r: '0x',
    s: '0x',
    v: undefined,
  };

  const serializedTx = serializeTransaction(tx, signaturePlaceholder);
  const unsignedTx = serializedTx.startsWith('0x')
    ? serializedTx.slice(2)
    : serializedTx;
  const txHash = keccak256(serializedTx);

  console.log('Unsigned Transaction:', unsignedTx);
  console.log('Transaction Hash:', txHash);

  return { unsignedTx, txHash };
}
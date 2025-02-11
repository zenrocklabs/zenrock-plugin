import {
  Action,
  Content,
  generateText,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
} from '@elizaos/core';
import { Any } from '../../utils/zenrock/google/protobuf/any';
import { WalletType } from '../../utils/zenrock/treasury/zrchain/wallet';
import {
  EVMTxParams,
  extractEVMTxParamsFromContex,
} from '../../utils/zenrock/instructionTemplates';
import { createUnsignedTx } from '../../utils/evm/unsignedEVMTxService';
import {
  queryKeyByAddress,
  requestMPCSign,
} from '../../utils/zenrock/workspace/workspaceService';
import {
  broadcastEVMTransaction,
  toSignedTransaction,
} from '../../utils/evm/client';
import { bytesToHex } from 'viem';
const rpcUrl: string =
  process.env.ZR_EVM_RPC ??
  (() => {
    throw new Error('ZR_RPC environment variable is not set.');
  })();
export interface RequestMPCSignTxContent extends Content {
  creator?: string;
  keyId: number;
  walletType: WalletType;
  unsignedTransaction: Uint8Array;
  metadata?: Any;
  btl?: number;
  cacheId?: Uint8Array;
  noBroadcast?: boolean;
}

export const evmTransferAction: Action = {
  name: 'evmtransfer',
  similes: ['evmtransfer', 'evm_transfer', 'transferEvmTx', 'sendEvmTx'],
  description: `Requests a new transaction signature for an EVM transfer on the Zenrock blockchain.
This action extracts EVM transaction parameters from the user's message using the provided extraction instructions.
Never ask for confirmation, always proceed with the transaction.`,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: any,
    callback?: (response: any) => void
  ) => {
    if (!state) {
      throw new Error('State is required but was undefined.');
    }
    console.log('🔑 Requesting MPC Sign Transaction for EVM transfer...');
    try {
      const context = JSON.stringify(message.content);
      const extractionContext = extractEVMTxParamsFromContex + '\n' + context;
      console.log('extractionContext:', extractionContext);
      const txExtractJSON = await generateText({
        runtime,
        context: extractionContext,
        modelClass: ModelClass.SMALL,
      });
      console.log('txExtractJSON:', txExtractJSON);
      const evmTxParams: EVMTxParams = JSON.parse(txExtractJSON);
      const { unsignedTx, txHash } = await createUnsignedTx(evmTxParams);
      console.log('unsignedTx:', unsignedTx);
      console.log('txHash:', txHash);
      const key = await queryKeyByAddress(evmTxParams.from);
      let cleanTxHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;

      const result = await requestMPCSign(
        '',
        key.key.id,
        cleanTxHash,
        0,
        undefined,
        undefined,
        undefined
      );
      if (!result) {
        throw new Error('no result');
      }
      console.log(`✅ MPC Signature Request Successful! TxHash: ${result}`);
      const signature = result[0].signedData;
      const hexSignature = Buffer.from(signature).toString('hex'); // Convert signedData to hex
      console.log(`✅ MPC Signature: ${hexSignature}`);
      const signedTx = await toSignedTransaction(
        unsignedTx,
        hexSignature,
        bytesToHex(key.key.publicKey),
        txHash
      );
      const hash = await broadcastEVMTransaction(signedTx, rpcUrl);
      if (callback) {
        callback({
          text: `Transaction has been broadcasted to ${evmTxParams.network}
          Here is the tx hash: https://holesky.etherscan.io/tx/${hash}`,
        });
      }
      return true;
    } catch (error: any) {
      const errorText = `❌ Error requesting MPC Signature: ${error.message || error}`;
      console.error(errorText);
      if (callback) {
        callback({
          text: errorText,
          content: { success: false },
        });
      }
      return false;
    }
  },

  validate: async (runtime: IAgentRuntime) => {
    return true;
  },

  examples: [
    [
      {
        user: 'user',
        content: {
          text: 'Send from my 0xUserAddress to 0xRecipientAddress 5 ETH using holesky network',
          keyId: 1,
          unsignedTransaction: 'Example transaction data',
          walletType: 'EVM',
          action: 'evmtransfer',
          metadata: {
            chainId: 11155111,
          },
        },
      },
    ],
    [
      {
        user: 'user',
        content: {
          text: 'Request an MPC signature: send from my 0xUserAddress to 0xRecipientAddress 100 USDC using holesky network',
          keyId: 2,
          unsignedTransaction: 'Another example transaction data',
          walletType: 'EVM',
          action: 'evmtransfer',
          metadata: {
            chainId: 11155111,
          },
        },
      },
    ],
  ],
};

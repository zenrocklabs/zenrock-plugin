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
      return true;
    } catch (error: any) {
      const errorText = `❌ Error requesting MPC Signature Transaction: ${error.message || error}`;
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
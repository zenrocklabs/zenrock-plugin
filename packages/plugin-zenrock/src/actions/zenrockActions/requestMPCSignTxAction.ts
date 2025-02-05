import { Action, Content, IAgentRuntime, Memory, State } from '@elizaos/core';
import { requestMPCSignTx } from '../../utils/zenrock/workspace/workspaceService';
import { createHash } from 'crypto';
import { Any } from '../../utils/zenrock/google/protobuf/any';
import { WalletType } from '../../utils/zenrock/treasury/zrchain/wallet';
import { normalizeWalletType, createMetadata } from '../../utils/zenrock/utils';


export interface RequestMPCSignTxContent extends Content {
  creator?: string; // Made optional for extraction from text if missing
  keyId: number;
  walletType: WalletType;
  unsignedTransaction: Uint8Array; 
  metadata?: Any; // Made optional for extraction from text if missing
  btl?: number; // Made optional for extraction from text if missing
  cacheId?: Uint8Array; // Made optional for extraction from text if missing
  noBroadcast?: boolean; // Made optional for extraction from text if missing
}

export const requestMPCSignTxAction: Action = {
    name: 'requestSignTx',
    similes: ['generateSignTx', 'newSignTx'],
    description:
      'Requests a new transaction signature for the specified key inside a workspace on the Zenrock blockchain.',
  
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State, // Made optional to match the Handler type
      _options?: any,
      callback?: (response: any) => void
    ) => {
      // Ensure state is provided.
      if (!state) {
        throw new Error('State is required but was undefined.');
      }
      console.log('🔑 Requesting MPC Sign Transaction...');
      try {
        // Cast the message content
        const content = message.content as RequestMPCSignTxContent;
        console.log('content from the conversation: ', JSON.stringify(content));
        // This regex matches only digits
        const match = content.text.match(/(\d+)/);
        if (match && match[1]) {
          content.keyId = parseInt(match[1]);
          console.log(`Extracted keyId: ${content.keyId}`);
        } else {
          throw new Error(
            'Key ID could not be extracted from the text.'
          );
        }
        const match2 = content.text.match(/"([^"]+)"/);
        const unsignedTransaction = match2 ? match2[1] : '';
        console.log(`Extracted unsignedTransaction: ${unsignedTransaction}`);
        if (match2 && match2[1]) {
          const hexUnsignedTransaction = createHash('sha256').update(unsignedTransaction).digest('hex'); // Ensure it's 64 bytes
          content.unsignedTransaction = new Uint8Array(hexUnsignedTransaction.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))); // Convert hex to Uint8Array
          console.log(`Extracted unsignedTransaction in hex: ${content.unsignedTransaction}`);
        } else {
          throw new Error(
            'Unsigned transaction could not be extracted from the text.'
          );
        }

        // New regex to identify the wallet type looking for "EVM"
        const match3 = content.text.match(/EVM/);
        if (match3) {
          content.walletType = normalizeWalletType(match3[0]);
          console.log(`Extracted walletType: ${content.walletType}`);
        }

        // New regex identifies the chainId and creates a metadata object
        const match4 = content.text.match(/chainID:(\d+)/);
        if (match4) {
          // Create the metadata object from the regex match
          content.metadata = createMetadata(parseInt(match4[1]));
          console.log(`Extracted metadata: ${content.metadata.value}`);
        }

        // Request the MPC key using the extracted or provided workspace address.
        const result = await requestMPCSignTx(
            content.creator, 
            content.keyId, 
            content.walletType, 
            content.unsignedTransaction, 
            content.metadata, 
            content.btl, 
            content.cacheId, 
            content.noBroadcast
        );
        if (!result) {
          throw new Error('no result');
        }
        console.log(`✅ MPC Signature Transaction Request Successful! TxHash: ${result}`);
        const signature = result[0].signedData;
        const hexSignature = Buffer.from(signature).toString('hex'); // Convert signedData to hex
        if (callback) {
          callback({
            text: `MPC Signature Transaction has been successfully created!

            SignatureRequestID: ${result[0].signRequestId}, 
            Signature: ${hexSignature}`,
          });
        }
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
            text: 'Request an MPC signature for key 1 with data "Hello, world!" and wallet type EVM and chainId 11155111',
            keyId: 1,
            unsignedTransaction: 'Hello, world!',
            walletType: 'EVM',
            action: 'requestMPCSignTx',
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
            text: 'Generate a new MPC signature for key 1 with data "Zenrock!" and wallet type EVM and chainId 11155111',
            keyId: 1,
            unsignedTransaction: 'Zenrock!',
            walletType: 'EVM',
            action: 'requestMPCSignTx',
            metadata: {
              chainId: 11155111,
            },
          },
        },
      ],
    ],
  };
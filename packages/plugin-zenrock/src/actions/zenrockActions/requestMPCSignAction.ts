import { Action, Content, IAgentRuntime, Memory, State } from '@elizaos/core';
import { requestMPCSign } from '../../utils/zenrock/workspace/workspaceService';
import { VerificationVersion } from '../../utils/zenrock/treasury/zrchain/tx';
import { createHash } from 'crypto';


export interface RequestMPCSignContent extends Content {
  creator?: string; // Made optional for extraction from text if missing
  keyId: number; 
  dataForSigning: string; 
  btl?: number; // Made optional for extraction from text if missing
  cacheId?: Uint8Array; // Made optional for extraction from text if missing
  verifySigningData?: Uint8Array; // Made optional for extraction from text if missing
  verifySigningDataVersion?: VerificationVersion; // Made optional for extraction from text if missing
}

export const requestMPCSignAction: Action = {
    name: 'requestSignature',
    similes: ['generateSignature', 'newSignature'],
    description:
      'Requests a new signature for the specified key inside a workspace on the Zenrock blockchain.',
  
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
      console.log('🔑 Requesting MPC Signature...');
      try {
        // Cast the message content
        const content = message.content as RequestMPCSignContent;
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
        const dataForSigning = match2 ? match2[1] : '';
        console.log(`Extracted dataForSigning: ${dataForSigning}`);
        if (match2 && match2[1]) {
          const hexDataForSigning = createHash('sha256').update(dataForSigning).digest('hex'); // Ensure it's 64 bytes
          content.dataForSigning = hexDataForSigning;
          console.log(`Extracted dataForSigning in hex: ${content.dataForSigning}`);
        } else {
          throw new Error(
            'Data for signing could not be extracted from the text.'
          );
        }
        // Request the MPC key using the extracted or provided workspace address.
        const result = await requestMPCSign(content.creator,content.keyId, content.dataForSigning, content.btl, content.cacheId, content.verifySigningData, content.verifySigningDataVersion);
        if (!result) {
          throw new Error('no result');
        }
        console.log(`✅ MPC Signature Request Successful! TxHash: ${result}`);
        const signature = result[0].signedData;
        const hexSignature = Buffer.from(signature).toString('hex'); // Convert signedData to hex
        if (callback) {
          callback({
            text: `MPC Signature has been successfully created!

            SignatureRequestID: ${result[0].signRequestId}, 
            Signature: ${hexSignature}`,
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
            text: 'Request an MPC signature for key 1 with data "Hello, world!"',
            keyId: 1,
            dataForSigning: 'Hello, world!',
            action: 'requestMPCSign',
          },
        },
      ],
      [
        {
          user: 'user',
          content: {
            text: 'Generate a new MPC signature for key 1 with data "Zenrock!"',
            keyId: 1,
            dataForSigning: 'Zenrock!',
            action: 'requestMPCSign',
          },
        },
      ],
    ],
  };
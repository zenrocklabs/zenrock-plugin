import { Action, Content, IAgentRuntime, Memory, State } from '@elizaos/core';
import { requestMPCKey } from '../../utils/zenrock/workspace/workspaceService';

export interface RequestMPCKeyContent extends Content {
  workspace: string;
}

export const requestMPCKeyAction: Action = {
  name: 'requestMPCKey',
  similes: ['generateKey', 'newKey'],
  description:
    'Requests a new MPC key for the specified workspace on the Zenrock blockchain.',

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State, // Made optional to match the Handler type
    _options?: any,
    callback?: (response: any) => void
  ) => {
    // If state is not provided, throw an error
    if (!state) {
      throw new Error('State is required but was undefined.');
    }
    console.log('🔑 Requesting MPC key...');
    try {
      const content = message.content as RequestMPCKeyContent;
      if (!content.workspace) {
        throw new Error('Workspace address is required.');
      }
      console.log('content: ', JSON.stringify(content));
      const result = await requestMPCKey(content.workspace);
      if (!result) {
        throw new Error('no result');
      }
      console.log(`✅ MPC Key Request Successful! TxHash: ${result}`);
      if (callback) {
        callback({
          text: `MPC Key has been successfully created!
          address: ${result}`,
        });
      }
      return true;
    } catch (error: any) {
      const errorText = `❌ Error requesting MPC key: ${error.message || error}`;
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
          text: 'Request an MPC key for workspace workspace1abc',
          workspace: 'workspace1abc',
          action: 'requestMPCKey',
        },
      },
    ],
    [
      {
        user: 'user',
        content: {
          text: 'Generate a new MPC key for workspace workspace1xyz',
          workspace: 'workspace1xyz',
          action: 'requestMPCKey',
        },
      },
    ],
  ],
};

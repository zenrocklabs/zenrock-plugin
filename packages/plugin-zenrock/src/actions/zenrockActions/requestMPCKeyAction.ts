import { Action, Content, IAgentRuntime, Memory, State } from '@elizaos/core';
import { requestMPCKey } from '../../utils/zenrock/workspace/workspaceService';

export interface RequestMPCKeyContent extends Content {
  workspace?: string; // Made optional for extraction from text if missing
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
    // Ensure state is provided.
    if (!state) {
      throw new Error('State is required but was undefined.');
    }
    console.log('🔑 Requesting MPC key...');
    try {
      // Cast the message content
      const content = message.content as RequestMPCKeyContent;
    //   console.log('content from the conversation: ', JSON.stringify(content));
      // This regex matches any substring that starts with "workspace" followed by letters and/or digits.
      const match = content.text.match(/(workspace[\w\d]+)/i);
      if (match && match[1]) {
        content.workspace = match[1];
        console.log(`Extracted workspace: ${content.workspace}`);
      } else {
        throw new Error(
          'Workspace address could not be extracted from the text.'
        );
      }

      // Request the MPC key using the extracted or provided workspace address.
      const result = await requestMPCKey(content.workspace);
      if (!result) {
        throw new Error('no result');
      }
      console.log(`✅ MPC Key Request Successful! TxHash: ${result}`);
      if (callback) {
        callback({
          text: `MPC Key has been successfully created! Address: ${result}`,
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

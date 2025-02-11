import {
  Action,
  composeContext,
  Content,
  generateObject,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
} from '@elizaos/core';
import { requestMPCKey } from '../../utils/zenrock/workspace/workspaceService';
import {
  extractNewMPCKeyParamsTemplate,
  mapKeyType,
  RequestMPCKeyContent,
} from '../../utils/zenrock/newMPCKeyInstructionsTemplate';

function isRequestMPCKeyContent(
  runtime: IAgentRuntime,
  content: any
): content is RequestMPCKeyContent {
  return (
    typeof content.workspace === 'string' && typeof content.keyType === 'string'
  );
}

export const requestMPCKeyAction: Action = {
  name: 'requestMPCKey',
  similes: ['generateKey', 'newKey'],
  description: 'Requests a new MPC key for the specified workspace on the Zenrock blockchain.',

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: any,
    callback?: (response: any) => void
  ) => {
    if (!state) {
      state = (await runtime.composeState(message)) as State;
    } else {
      state = await runtime.updateRecentMessageState(state);
    }

    console.log('🔑 Requesting MPC key...');
    try {
      const newMPCKeyContext = composeContext({
        state,
        template: extractNewMPCKeyParamsTemplate,
      });

      const content = await generateObject({
        runtime,
        context: newMPCKeyContext,
        modelClass: ModelClass.LARGE,
      });

      if (!isRequestMPCKeyContent(runtime, content)) {
        if (callback) {
          callback({
            text: 'Unable to process the request. Invalid content provided.',
            content: { error: 'Invalid request content' },
          });
        }
        return false;
      }

      // 🗝️ Map keyType to the correct enum value
      const keyTypeEnum = mapKeyType(content.keyType);

      // 🚀 Request the MPC key using both workspace and keyType
      const result = await requestMPCKey(content.workspace, keyTypeEnum);
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

  validate: async (runtime: IAgentRuntime) => true,

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

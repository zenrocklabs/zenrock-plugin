import { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import {
  queryKeysByWorkspace,
  queryWorkspaceByOwner,
} from '../../utils/zenrock/workspace/workspaceService'; // adjust the path as needed
import { generateWalletWithUUID } from '../../utils/zenrock/agentWallet';

const queryWorkspaceByOwnerProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const { address } = await generateWalletWithUUID(message.userId);
    if (!address) {
      return 'Owner address is missing in the message context.';
    }
    console.log('executing query with provider for owner: ', address);
    // const { address } = await generateWallet();
    // if (!address) {
    //   return 'Creator address is missing in the message context.';
    // }
    try {
      // Optionally, pass a creator parameter if needed. Here, it's omitted.
      const workspaces = await queryWorkspaceByOwner(address);

      if (!workspaces || workspaces.length === 0) {
        return `No workspaces found for owner address: ${address}`;
      }
      // Format the retrieved workspaces into a user-friendly string.
      const formattedWorkspaces = await Promise.all(
        workspaces.map(async (ws) => {
          const keys = await queryKeysByWorkspace(ws.address);
          const evmAddresses = keys
            .flatMap((key) => key.wallets) 
            .filter((wallet) => wallet.type === 'WALLET_TYPE_EVM')
            .map((wallet) => wallet.address);

          return `Workspace address: ${ws.address || 'No address for Workspace'} 
                with Owners: ${ws.owners || 'unknown'} 
                and the workspace has generated keys: ${evmAddresses.join(', ')}`;
        })
      );

      return `User workspaces: \n${formattedWorkspaces}`;
    } catch (error) {
      console.error('Workspace Provider error:', error);
      return 'Error retrieving workspaces.';
    }
  },
};

export { queryWorkspaceByOwnerProvider };

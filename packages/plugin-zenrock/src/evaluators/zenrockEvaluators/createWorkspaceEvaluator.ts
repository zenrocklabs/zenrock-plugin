// import { Evaluator, IAgentRuntime, Memory, State } from '@elizaos/core';

// export const createWorkspaceEvaluator: Evaluator = {
//   name: 'createWorkspaceEvaluator',
//   similes: ['workspace storage', 'transaction tracking'],
//   description:
//     'Extracts the workspace address and transaction hash from the createWorkspace response and stores them in memory.',

//   handler: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
//     console.log('🧠 Evaluating workspace creation response...');

//     if (!memory.content || !memory.content.success) {
//       console.log('❌ No successful workspace creation detected.');
//       return {
//         score: 0,
//         reason:
//           'Workspace creation was unsuccessful or no relevant data found.',
//       };
//     }

//     // Extract workspace address that starts with "workspace"
//     const workspaceAddressMatch = memory.content.text.match(/(workspace\w+)/);
//     const workspaceAddress = workspaceAddressMatch
//       ? workspaceAddressMatch[1]
//       : null;

//     // Extract transaction hash
//     const transactionHash = memory.content.transactionHash || null;

//     if (!workspaceAddress || !transactionHash) {
//       console.error(
//         `❌ Failed to extract required values. Workspace: ${workspaceAddress}, TxHash: ${transactionHash}`
//       );
//       return {
//         score: 0,
//         reason: 'Could not extract workspace address or transaction hash.',
//       };
//     }

//     console.log(`✅ Storing workspace address: ${workspaceAddress}`);
//     console.log(`✅ Storing transaction hash: ${transactionHash}`);

//     // Store in state memory for immediate use
//     state.memory.workspace = {
//       address: workspaceAddress,
//       transactionHash: transactionHash,
//     };

//     // Store in long-term memory for future retrieval
//     try {
//       await runtime.memoryManager.createMemory({
//         userId: memory.userId,
//         roomId: memory.roomId,
//         content: {
//           workspaceAddress,
//           transactionHash,
//         },
//       });

//       console.log('✅ Successfully stored workspace details in memory.');
//     } catch (error) {
//       console.error('❌ Failed to store workspace details in memory:', error);
//     }

//     return {
//       score: 1,
//       reason: 'Workspace details successfully extracted and stored.',
//     };
//   },

//   validate: async () => {
//     return true;
//   },

//   examples: [
//     {
//       context: 'Successfully creating a workspace',
//       messages: [
//         {
//           user: 'createWorkspace',
//           content: {
//             success: true,
//             text: 'Workspace created successfully! TxHash: ABC123, Workspace address: workspace1xyz...',
//             transactionHash: 'ABC123',
//           },
//         },
//       ],
//       outcome:
//         'Workspace address and transaction hash should be stored in memory.',
//     },
//     {
//       context: 'Failed workspace creation',
//       messages: [
//         {
//           user: 'Creating workspace failed',
//           content: {
//             success: false,
//             text: 'Transaction failed: insufficient funds',
//           },
//         },
//       ],
//       outcome: 'No workspace details should be stored in memory.',
//     },
//   ],
// };

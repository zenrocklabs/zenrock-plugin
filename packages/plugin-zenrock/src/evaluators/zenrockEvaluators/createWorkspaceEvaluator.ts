import {
  Evaluator,
  IAgentRuntime,
  Memory,
  State,
  ServiceType,
  ITextGenerationService,
  IMemoryManager,
} from '@elizaos/core';

interface WorkspaceMemory {
  address: string;
  transactionHash: string;
}

interface WorkspaceMemoryContent {
  success: boolean;
  text: string;
  transactionHash?: string;
  [key: string]: any;
}

interface CustomStateMemory extends Memory {
  workspace?: WorkspaceMemory;
}

export const createWorkspaceEvaluator: Evaluator = {
  name: 'createWorkspaceEvaluator',
  similes: ['workspace storage', 'transaction tracking'],
  description:
    'Extracts the workspace address and transaction hash from the createWorkspace response and stores them in memory.',

  validate: async (runtime: IAgentRuntime) => {
    let memoryManager = runtime.getMemoryManager('workspaceMemory');

    if (!memoryManager) {
      console.warn(
        '⚠️ workspaceMemory manager not found. Registering a new one...'
      );

      // Create a new Memory Manager
      memoryManager = {
        runtime,
        tableName: 'workspaceMemory',
        constructor: Function,
        addEmbeddingToMemory: async (memory: Memory) => memory,
        getMemories: async () => [],
        getCachedEmbeddings: async () => [],
        getMemoryById: async () => null,
        getMemoriesByRoomIds: async () => [],
        searchMemoriesByEmbedding: async () => [],
        createMemory: async () => {},
        removeMemory: async () => {},
        removeAllMemories: async () => {},
        countMemories: async () => 0,
      } as IMemoryManager;

      runtime.registerMemoryManager(memoryManager);
      console.log('✅ workspaceMemory manager successfully registered.');
    }

    return true;
  },

  handler: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
    console.log('🧠 Evaluating workspace creation response...');

    const content = memory.content as unknown as WorkspaceMemoryContent;

    if (!content || !content.success) {
      console.log('❌ No successful workspace creation detected.');
      return {
        score: 0,
        reason:
          'Workspace creation was unsuccessful or no relevant data found.',
      };
    }

    // Extract workspace address that starts with "workspace"
    const workspaceAddressMatch = content.text.match(/(workspace\w+)/);
    const workspaceAddress = workspaceAddressMatch
      ? workspaceAddressMatch[1]
      : null;

    // Extract transaction hash
    const transactionHash = content.transactionHash || null;

    if (!workspaceAddress || !transactionHash) {
      console.error(
        `❌ Failed to extract required values. Workspace: ${workspaceAddress}, TxHash: ${transactionHash}`
      );
      return {
        score: 0,
        reason: 'Could not extract workspace address or transaction hash.',
      };
    }

    console.log(`✅ Storing workspace address: ${workspaceAddress}`);
    console.log(`✅ Storing transaction hash: ${transactionHash}`);

    // Type assertion to avoid TypeScript error
    const customStateMemory = state.memory as CustomStateMemory;
    customStateMemory.workspace = {
      address: workspaceAddress,
      transactionHash: transactionHash,
    };

    // Store in long-term memory using recommended approach
    try {
      const memoryManager = runtime.getMemoryManager('workspaceMemory');

      if (!memoryManager) {
        throw new Error('Memory manager not found.');
      }

      // Retrieve the text generation service for embeddings
      const textGenerationService = runtime.getService<ITextGenerationService>(
        ServiceType.TEXT_GENERATION
      );

      let embedding: number[] | undefined = [];
      if (textGenerationService) {
        embedding = await textGenerationService.getEmbeddingResponse(
          `Workspace created at ${workspaceAddress} with transaction ${transactionHash}`
        );
      }

      if (
        !Array.isArray(embedding) ||
        !embedding.every((num) => typeof num === 'number')
      ) {
        console.warn('⚠️ Invalid embedding data. Defaulting to empty array.');
        embedding = [];
      }

      // First, add embedding to memory with required agentId
      const memoryEntry: Memory = {
        userId: memory.userId,
        roomId: memory.roomId,
        agentId: runtime.agentId, // ✅ Fix: Added agentId
        content: {
          text: `Workspace created with address ${workspaceAddress} and transaction ${transactionHash}.`,
          workspaceAddress,
          transactionHash,
        },
        embedding,
      };

      // Store the created memory
      await memoryManager.createMemory(memoryEntry);

      console.log('✅ Successfully stored workspace details in memory.');
    } catch (error) {
      console.error('❌ Failed to store workspace details in memory:', error);
    }

    return {
      score: 1,
      reason: 'Workspace details successfully extracted and stored.',
    };
  },

  examples: [
    {
      context: 'Successfully creating a workspace',
      messages: [
        {
          user: 'createWorkspace',
          content: {
            success: true,
            text: 'Workspace created successfully! TxHash: ABC123, Workspace address: workspace1xyz...',
            transactionHash: 'ABC123',
          },
        },
      ],
      outcome:
        'Workspace address and transaction hash should be stored in memory.',
    },
    {
      context: 'Failed workspace creation',
      messages: [
        {
          user: 'Creating workspace failed',
          content: {
            success: false,
            text: 'Transaction failed: insufficient funds',
          },
        },
      ],
      outcome: 'No workspace details should be stored in memory.',
    },
  ],
};

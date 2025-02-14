import {
    Action,
    Content,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import {
    generateCosmosWallet,
    getAccountFromWallet,
} from "../services/walletService";
import { createWorkspace } from "../services/workspaceService";
import { toUtf8String } from "../services/utils";

export interface CreateWorkspaceContent extends Content {
    adminPolicyId?: number;
    signPolicyId?: number;
    additionalOwners?: string[];
}

export const createWorkspaceAction: Action = {
    name: "createWorkspace",
    similes: ["newWorkspace", "setupWorkspace"],
    description:
        "Creates a new workspace on the Zenrock blockchain using the provided parameters.",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.debug("🔑 Creating workspace...");

        try {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const content = message.content as CreateWorkspaceContent;
            const adminPolicyId = content.adminPolicyId ?? 0;
            const signPolicyId = content.signPolicyId ?? 0;
            let additionalOwners = content.additionalOwners ?? [];

            const userId = message.userId;
            if (!userId) {
                throw new Error("User ID is missing in the request.");
            }
            const { wallet } = await generateCosmosWallet(userId);
            const account = await getAccountFromWallet(wallet);
            additionalOwners.push(account.address);

            const result = await createWorkspace(
                adminPolicyId,
                signPolicyId,
                additionalOwners
            );
            if (result.code === 0) {
                elizaLogger.debug(
                    `✅ Transaction successful! TxHash: ${result.transactionHash}`
                );
            } else {
                elizaLogger.error(`❌ Transaction failed: ${result.rawLog}`);
            }
            if (result.code === 0) {
                elizaLogger.debug(
                    `✅ Workspace created successfully! TxHash: ${result.transactionHash}`
                );
                if (callback) {
                    callback({
                        text: `Workspace created successfully!
            TxHash: ${result.transactionHash},
            Workspace address: ${toUtf8String(result.msgResponses[0].value)}`,
                        content: {
                            success: true,
                            transactionHash: result.transactionHash,
                        },
                    });
                }
                return true;
            } else {
                throw new Error(`Transaction failed: ${result.rawLog}`);
            }
        } catch (error: any) {
            const errorText = `❌ Error creating workspace: ${
                error.message || error
            }`;
            elizaLogger.error(errorText);
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
        const rpcUrl = runtime.getSetting("ZR_RPC");
        return typeof rpcUrl === "string" && rpcUrl.length > 0;
    },

    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Create a new workspace with admin policy 1 and sign policy 2",
                    adminPolicyId: 1,
                    signPolicyId: 2,
                    action: "createWorkspace",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Setup a workspace with additional owners [zen1xyz, zen1abc]",
                    additionalOwners: ["zen1xyz", "zen1abc"],
                    action: "createWorkspace",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Initialize a workspace with default policies",
                    action: "createWorkspace",
                },
            },
            {
                user: "user",
                content: {
                    text: "Setup a workspace",
                    action: "createWorkspace",
                },
            },
        ],
    ],
};

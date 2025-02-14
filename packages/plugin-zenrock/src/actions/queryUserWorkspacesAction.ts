import {
    Action,
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
import { queryWorkspaceByOwner } from "../services/workspaceService";

export const queryUserWorkspacesAction: Action = {
    name: "queryUserWorkspacesAction",
    similes: ["listWorkspaces", "getWorkspaces"],
    description:
        "Queries workspaces associated with the owner's address derived from the user ID, returning an ordered list of workspace addresses.",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.debug("🔍 Querying workspaces by owner...");

        try {
            // Update or compose state as needed
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            // Generate the owner address from the user's ID
            const { wallet } = await generateCosmosWallet(message.userId);
            const account = await getAccountFromWallet(wallet);
            const address = account.address;
            if (!address) {
                const errorText =
                    "User address is missing in the message context.";
                elizaLogger.error(errorText);
                if (callback) {
                    callback({
                        text: errorText,
                        content: { success: false },
                    });
                }
                return false;
            }

            elizaLogger.debug("Executing query for owner address: " + address);

            // Query workspaces for the owner address
            const workspaces = await queryWorkspaceByOwner(address);

            if (!workspaces || workspaces.length === 0) {
                const noWsText = `No workspaces found for owner address: ${address}`;
                if (callback) {
                    callback({
                        text: noWsText,
                        content: { success: true },
                    });
                }
                return noWsText;
            }

            // Format the retrieved workspaces into a numbered list.
            const responseText = `User workspaces:\n${workspaces
                .map((w, index) => `${index + 1}. ${w.address}`)
                .join("\n")}`;

            elizaLogger.debug(responseText);

            if (callback) {
                callback({
                    text: responseText,
                    content: { success: true },
                });
            }
            return responseText;
        } catch (error: any) {
            const errorText = `❌ Error retrieving workspaces: ${
                error.message || error
            }`;
            elizaLogger.error(errorText);
            if (callback) {
                callback({
                    text: errorText,
                    content: { success: false },
                });
            }
            return errorText;
        }
    },

    validate: async (runtime: IAgentRuntime) => {
        // Example validation: check if the RPC setting is provided.
        const rpcUrl = runtime.getSetting("ZR_RPC");
        return typeof rpcUrl === "string" && rpcUrl.length > 0;
    },

    examples: [
        [
            {
                user: "user",
                content: {
                    text: "List all workspaces for my account",
                    action: "queryWorkspaceByOwner",
                },
            },
            {
                user: "user",
                content: {
                    text: "Show me my workspaces",
                    action: "queryWorkspaceByOwner",
                },
            },
            {
                user: "user",
                content: {
                    text: "What are my workspaces",
                    action: "queryWorkspaceByOwner",
                },
            },
        ],
    ],
};

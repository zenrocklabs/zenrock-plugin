import {
    Action,
    composeContext,
    elizaLogger,
    generateObject,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { z } from "zod";
import { queryKeysByWorkspace } from "../services/workspaceService";
import {
    extractQueryKeysForWorkspaceParamsTemplate,
    QueryKeysForWorkspaceContent,
} from "./instructions/queryKeysForWorkspaceInstructionsTemplate";
import { normalizeStringWalletType, walletTypeToString } from "../services/utils";
import { WalletResponse } from "../types/zenrock/treasury/zrchain/query";

function isQueryKeysForWorkspaceContent(
    runtime: IAgentRuntime,
    content: any
): content is QueryKeysForWorkspaceContent {
    const valid = typeof content.workspace === "string";
    elizaLogger.debug("isQueryKeysForWorkspaceContent check:", {
        content,
        valid,
    });
    return valid;
}

export const queryKeysForWorkspaceAction: Action = {
    name: "queryKeysForWorkspaceAction",
    similes: ["getKeys", "listKeys"],
    description:
        "Queries all keys associated with the specified workspace on the Zenrock blockchain and returns all non-native wallets for each key.",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: any,
        callback?: (response: any) => void
    ) => {
        elizaLogger.debug("Incoming message:", JSON.stringify(message));
        try {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
                elizaLogger.debug("State composed:", JSON.stringify(state));
            } else {
                state = await runtime.updateRecentMessageState(state);
                elizaLogger.debug("State updated:", JSON.stringify(state));
            }

            elizaLogger.debug("🔍 Querying keys for workspace...");

            // Compose the context using the instruction template.
            const queryKeysContext = composeContext({
                state,
                template: extractQueryKeysForWorkspaceParamsTemplate,
            });
            elizaLogger.debug("Query keys context:", queryKeysContext);

            // Create a Zod schema for the expected output.
            const schema = z.object({
                workspace: z.string(),
            });
            elizaLogger.debug("Schema for query keys:", schema.toString());

            // Generate the object using the context and schema.
            const generatedResult = await generateObject({
                runtime,
                context: queryKeysContext,
                modelClass: ModelClass.LARGE,
                schema,
            });
            elizaLogger.debug(
                "Full generated object:",
                JSON.stringify(generatedResult)
            );

            // Unwrap the generated content if nested inside an "object" property.
            const content = generatedResult.object
                ? generatedResult.object
                : generatedResult;
            elizaLogger.debug(
                "Unwrapped generated content:",
                JSON.stringify(content)
            );

            // Validate the unwrapped generated content.
            if (!isQueryKeysForWorkspaceContent(runtime, content)) {
                elizaLogger.error(
                    "Invalid content structure received:",
                    JSON.stringify(content)
                );
                if (callback) {
                    callback({
                        text: "Unable to process the request. Invalid content provided.",
                        content: { error: "Invalid request content" },
                    });
                }
                return false;
            }

            // Query keys for the provided workspace.
            elizaLogger.debug(
                "Querying keys for workspace:",
                content.workspace
            );
            const keys = await queryKeysByWorkspace(content.workspace);
            elizaLogger.debug("Queried keys:", JSON.stringify(keys));

            // Format the keys into a user-friendly response by iterating over all keys
            // and returning only non-native wallet addresses.
            let responseText = "";
            if (keys && keys.length > 0) {
                const formattedKeys = keys
                    .map((key, index) => {
                        const filteredWallets = key.wallets.filter(
                            (wallet: any) =>
                                wallet.type !== "WALLET_TYPE_NATIVE"
                        );
                        if (filteredWallets.length === 0) {
                            return null;
                        }
                        const walletList = filteredWallets
                            .map(
                                (wallet: WalletResponse) =>
                                    `${normalizeStringWalletType(wallet.type)}: ${
                                        wallet.address
                                    }`
                            )
                            .join(", ");
                        return `${index + 1}. ${walletList}`;
                    })
                    .filter((item) => item !== null)
                    .join("\n");

                responseText =
                    formattedKeys.length > 0
                        ? `Wallets for workspace ${content.workspace}:\n${formattedKeys}`
                        : `No wallets found for workspace ${content.workspace}.`;
            } else {
                responseText = `No keys found for workspace ${content.workspace}.`;
            }
            elizaLogger.debug("Formatted response:", responseText);

            if (callback) {
                callback({
                    text: responseText,
                    content: { success: true },
                });
            }
            return responseText;
        } catch (error: any) {
            const errorText = `❌ Error querying keys for workspace: ${
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

    validate: async (runtime: IAgentRuntime) => true,

    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Show me all keys for workspace workspace123",
                    workspace: "workspace123",
                    action: "queryKeysForWorkspaceAction",
                },
            },
            {
                user: "user",
                content: {
                    text: "What are my keys for workspace workspace123",
                    workspace: "workspace123",
                    action: "queryKeysForWorkspaceAction",
                },
            },
        ],
    ],
};

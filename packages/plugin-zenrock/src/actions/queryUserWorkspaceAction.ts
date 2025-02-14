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
import {
    queryWorkspaceByAddress,
    queryKeysByWorkspace,
} from "../services/workspaceService";
import {
    QueryUserWorkspaceContent,
    extractQueryUserWorkspaceTemplate,
} from "./instructions/queryUserWorkspaceTemplate";
import { WalletResponse } from "../types/zenrock/treasury/zrchain/query";
import { normalizeStringWalletType } from "../services/utils";

function isQueryUserWorkspaceContent(
    runtime: IAgentRuntime,
    content: any
): content is QueryUserWorkspaceContent {
    const valid = typeof content.workspace === "string";
    elizaLogger.debug("isQueryUserWorkspaceContent check:", { content, valid });
    return valid;
}

export const queryUserWorkspaceAction: Action = {
    name: "queryUserWorkspaceAction",
    similes: ["listWorkspace", "getWorkspace"],
    description:
        "Queries a user's workspace using provided parameters and returns workspace details along with its keys and key types.",
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

            elizaLogger.debug("🔍 Querying user workspace...");

            // Compose context using the instructions template.
            const queryWorkspaceContext = composeContext({
                state,
                template: extractQueryUserWorkspaceTemplate,
            });
            elizaLogger.debug(
                "Query workspace context:",
                queryWorkspaceContext
            );

            // Create a Zod schema for the expected output.
            const schema = z.object({
                workspace: z.string(),
            });
            elizaLogger.debug("Schema for query workspace:", schema.toString());

            // Generate the object using the context and schema.
            const generatedResult = await generateObject({
                runtime,
                context: queryWorkspaceContext,
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

            // Validate the generated content.
            if (!isQueryUserWorkspaceContent(runtime, content)) {
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

            // Query the workspace using the provided workspace identifier.
            elizaLogger.debug(
                "Querying workspace for address:",
                content.workspace
            );
            const workspace = await queryWorkspaceByAddress(content.workspace);
            elizaLogger.debug(
                "Workspace retrieved:",
                JSON.stringify(workspace)
            );
            if (!workspace) {
                const noWsText = `No workspace found for address: ${content.workspace}`;
                if (callback) {
                    callback({
                        text: noWsText,
                        content: { success: true },
                    });
                }
                return noWsText;
            }

            // Query keys associated with the workspace.
            const keys = await queryKeysByWorkspace(
                workspace.workspace.address
            );
            elizaLogger.debug("Queried keys:", JSON.stringify(keys));

            // Format the keys into a user-friendly response by iterating over all keys
            // and returning only non-native wallet addresses.
            let responseText = "";

            if (keys && keys.length > 0) {
                const formattedKeys = keys
                    .map((key) => {
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
                                    `• ${normalizeStringWalletType(
                                        wallet.type
                                    )}: ${wallet.address}`
                            )
                            .join("\n        ");
                        return `Key ID: ${key.key.id} (${key.key.type})
    Wallets:
        ${walletList}`;
                    })
                    .filter((item) => item !== null)
                    .join("\n\n");

                responseText = `🏢 Workspace Details:
• Address: ${workspace.workspace.address}

• Owners:
${workspace.workspace.owners
    .map((owner, index) => `    ${index + 1}. ${owner}`)
    .join("\n")}

• Sign Policy ID: ${workspace.workspace.signPolicyId}
• Admin Policy ID: ${workspace.workspace.adminPolicyId}

🔑 Keys:
${
    formattedKeys
        ? formattedKeys
        : `No non-native wallets found for workspace ${content.workspace}.`
}`;
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
            const errorText = `❌ Error querying user workspace: ${
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
        const rpcUrl = runtime.getSetting("ZR_RPC");
        return typeof rpcUrl === "string" && rpcUrl.length > 0;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Give me the details for workspace14a2hpadpsy9h4auve2z8lw",
                    workspaceAddress: "workspace14a2hpadpsy9h4auve2z8lw",
                    action: "queryUserWorkspaceAction",
                },
            },
            {
                user: "user",
                content: {
                    text: "Show me my workspace details for workspace14a2hpadpsy9h4auve2z8lw",
                    workspaceAddress: "workspace14a2hpadpsy9h4auve2z8lw",
                    action: "queryUserWorkspaceAction",
                },
            },
        ],
    ],
};

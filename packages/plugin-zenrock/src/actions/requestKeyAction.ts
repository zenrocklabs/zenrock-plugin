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
    extractNewMPCKeyParamsTemplate,
    mapKeyType,
    RequestMPCKeyContent,
} from "./instructions/newMPCKeyInstructionsTemplate";
import { requestMPCKey } from "../services/workspaceService";

function isRequestMPCKeyContent(
    runtime: IAgentRuntime,
    content: any
): content is RequestMPCKeyContent {
    const valid =
        typeof content.workspace === "string" &&
        typeof content.keyType === "string";
    elizaLogger.debug("isRequestMPCKeyContent check:", { content, valid });
    return valid;
}

export const requestKeyAction: Action = {
    name: "requestKeyAction",
    similes: ["generateKey", "newKey"],
    description:
        "Requests a new MPC key for the specified workspace on the Zenrock blockchain.",

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

            elizaLogger.debug("🔑 Requesting MPC key...");

            // Compose the context using the provided instruction template.
            const newMPCKeyContext = composeContext({
                state,
                template: extractNewMPCKeyParamsTemplate,
            });
            elizaLogger.debug("New MPC Key context:", newMPCKeyContext);

            // Create a Zod schema for the expected output.
            const schema = z.object({
                workspace: z.string(),
                keyType: z.enum(["ECDSA", "EdDSA"]),
            });
            elizaLogger.debug("Schema for MPC key request:", schema.toString());

            // Generate the object using the context and schema.
            const generatedResult = await generateObject({
                runtime,
                context: newMPCKeyContext,
                modelClass: ModelClass.LARGE,
                schema,
            });
            elizaLogger.debug(
                "Full generated object:",
                JSON.stringify(generatedResult)
            );

            // Unwrap the generated content if it's nested inside the "object" property.
            const content = generatedResult.object
                ? generatedResult.object
                : generatedResult;
            elizaLogger.debug(
                "Unwrapped generated content:",
                JSON.stringify(content)
            );

            // Validate the unwrapped generated content.
            if (!isRequestMPCKeyContent(runtime, content)) {
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

            // Map keyType to the correct enum value.
            const keyTypeEnum = mapKeyType(content.keyType);
            elizaLogger.debug("Mapped key type:", keyTypeEnum);

            // Request the MPC key using the workspace and mapped keyType.
            elizaLogger.debug(
                "Requesting MPC key for workspace:",
                content.workspace
            );
            const result = await requestMPCKey(content.workspace, keyTypeEnum);
            if (!result) {
                throw new Error("No result returned from key request.");
            }
            elizaLogger.debug(
                `✅ MPC Key Request Successful! TxHash: ${result}`
            );

            if (callback) {
                callback({
                    text: `MPC Key has been successfully created! Address: ${result}`,
                });
            }
            return true;
        } catch (error: any) {
            const errorText = `❌ Error requesting MPC key: ${
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
                    text: "Request an MPC key for workspace workspace1abc",
                    workspace: "workspace1abc",
                    action: "requestKeyAction",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Generate a new MPC key for workspace workspace1xyz",
                    workspace: "workspace1xyz",
                    action: "requestKeyAction",
                },
            },
        ],
    ],
};

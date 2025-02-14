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
    queryKeyByAddress,
    requestMPCSign,
    getMPCSignature,
} from "../services/workspaceService";
import {
    extractRequestSignatureParamsTemplate,
    RequestSignatureContent,
    ResponseSignatureContent,
} from "./instructions/requestSignatureInstructionsTemplate";

function isRequestSignatureContent(
    runtime: IAgentRuntime,
    content: any
): content is RequestSignatureContent {
    const valid =
        typeof content.hash === "string" && typeof content.from === "string";
    elizaLogger.debug("isRequestSignatureContent check:", { content, valid });
    return valid;
}

export const requestSignatureAction: Action = {
    name: "requestSignatureAction",
    similes: ["reqSig", "requestSignature"],
    description: "Requests an MPC signature for a given EVM hash.",
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

            elizaLogger.debug("🔑 Requesting MPC Signature for hash...");

            // Compose context using the instructions template.
            const signatureContext = composeContext({
                state,
                template: extractRequestSignatureParamsTemplate,
            });
            elizaLogger.debug("Signature context:", signatureContext);

            // Create a Zod schema for the expected output.
            const schema = z.object({
                hash: z.string(),
                from: z.string(),
            });
            elizaLogger.debug(
                "Schema for request signature:",
                schema.toString()
            );

            // Generate the object using the context and schema.
            const generatedResult = await generateObject({
                runtime,
                context: signatureContext,
                modelClass: ModelClass.LARGE,
                schema,
            });
            elizaLogger.debug(
                "Full generated object:",
                JSON.stringify(generatedResult)
            );

            // Unwrap generated content if nested.
            const content = generatedResult.object
                ? generatedResult.object
                : generatedResult;
            elizaLogger.debug(
                "Unwrapped generated content:",
                JSON.stringify(content)
            );

            // Validate the generated content.
            if (!isRequestSignatureContent(runtime, content)) {
                elizaLogger.error(
                    "Invalid content structure received:",
                    JSON.stringify(content)
                );
                if (callback) {
                    callback({
                        text: "Unable to process the request. Invalid content provided.",
                        content: JSON.stringify({
                            error: "Invalid request content",
                        }),
                    });
                }
                return false;
            }

            // Use the provided hash.
            const txHash = content.hash;
            const cleanTxHash = txHash.startsWith("0x")
                ? txHash.slice(2)
                : txHash;
            elizaLogger.debug("Clean transaction hash:", cleanTxHash);

            // Retrieve the key details using the sender's address.
            const key = await queryKeyByAddress(content.from);
            if (!key) {
                throw new Error(
                    "No key found for the provided sender address."
                );
            }
            elizaLogger.debug("Queried key:", JSON.stringify(key));

            // Request the MPC signature.
            const signReq = await requestMPCSign(
                key.key.id,
                cleanTxHash,
                0,
                undefined,
                undefined,
                undefined
            );
            if (!signReq) {
                throw new Error("No result from MPC signature request.");
            }
            elizaLogger.debug(
                "MPC Signature Request Successful! Result:",
                JSON.stringify(signReq)
            );

            // Retrieve the signature (this may also involve a polling function if needed).
            const signature = await getMPCSignature(signReq);
            const hexSignature = Buffer.from(signature).toString("hex");
            elizaLogger.debug("MPC Signature (hex):", hexSignature);

            // Build the response content.
            const responseContent: ResponseSignatureContent = {
                text: "MPC Signature retrieved.",
                hash: txHash,
                from: content.from,
                zenrockTx: signReq.transactionHash,
                signature: hexSignature,
            };

            if (callback) {
                callback({
                    text: "MPC Signature retrieved.",
                    content: JSON.stringify(responseContent),
                });
            }
            return true;
        } catch (error: any) {
            const errorText = `❌ Error requesting MPC Signature: ${
                error.message || error
            }`;
            elizaLogger.error(errorText);
            if (callback) {
                callback({
                    text: errorText,
                    content: JSON.stringify({ success: false }),
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
                    text: "Sign this hash: 0xabcdef1234567890 from 0xUserAddress.",
                    action: "requestSignatureAction",
                },
            },
        ],
    ],
};

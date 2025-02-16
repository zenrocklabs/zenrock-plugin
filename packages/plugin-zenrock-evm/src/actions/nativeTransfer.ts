import {
    Action,
    composeContext,
    elizaLogger,
    generateText,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
  } from "@elizaos/core";
  import { bytesToHex } from "viem";
  import { extractEVMTxParamsFromContext } from "./instructions/extractEVMTxParamsFromContex";
  import { EVMTxParams } from "./types"; // Assume this type is defined appropriately
  import {
    queryKeyByAddress,
    requestMPCSign,
    getMPCSignature,
  } from "../services/workspaceService";
  import {
    createUnsignedTx,
    toSignedTransaction,
    broadcastEVMTransaction,
  } from "../services/evmService";
  
  const rpcUrl: string =
    process.env.ZR_EVM_RPC ??
    (() => {
      throw new Error("ZR_RPC environment variable is not set.");
    })();
  
  export const nativeTransferAction: Action = {
    name: "nativeTransfer",
    similes: [
      "nativeTransfer",
      "native_transfer",
      "transferEvmTx",
      "sendEvmTx",
    ],
    description: `Requests a new transaction signature for an EVM transfer on the Zenrock blockchain.
  This action extracts EVM transaction parameters from the user's message using the provided extraction instructions.
  Never ask for confirmation; always proceed with the transaction.`,
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      _options?: any,
      callback?: (response: any) => void
    ) => {
      elizaLogger.debug("🔑 Requesting MPC Sign Transaction for EVM transfer...");
      try {
        // Ensure state is present.
        if (!state) {
          state = (await runtime.composeState(message)) as State;
          elizaLogger.debug("State composed:", JSON.stringify(state));
        } else {
          state = await runtime.updateRecentMessageState(state);
          elizaLogger.debug("State updated:", JSON.stringify(state));
        }
  
        // Compose the context using the extraction instructions template.
        const transferContext = composeContext({
          state,
          template: extractEVMTxParamsFromContext,
        });
        elizaLogger.debug("Transfer context:", transferContext);
  
        // Generate text containing the EVM transaction parameters.
        const txExtractJSON = await generateText({
          runtime,
          context: transferContext,
          modelClass: ModelClass.SMALL,
        });
        elizaLogger.debug("Extracted transaction JSON:", txExtractJSON);
  
        // Parse the extracted parameters.
        const evmTxParams: EVMTxParams = JSON.parse(txExtractJSON);
        elizaLogger.debug("Parsed EVM transaction parameters:", JSON.stringify(evmTxParams));
  
        // Create the unsigned transaction.
        const { unsignedTx, txHash } = await createUnsignedTx(evmTxParams);
        elizaLogger.debug("Unsigned transaction created:", unsignedTx);
        elizaLogger.debug("Unsigned transaction hash:", txHash);
        const cleanTxHash = txHash.startsWith("0x") ? txHash.slice(2) : txHash;
        elizaLogger.debug("Clean transaction hash:", cleanTxHash);
  
        // Retrieve the signing key using the sender's address.
        const key = await queryKeyByAddress(evmTxParams.from);
        if (!key) {
          throw new Error("No key found for the provided sender address.");
        }
        elizaLogger.debug("Retrieved signing key:", JSON.stringify(key));
  
        // Request the MPC signature for the hash.
        const signReq = await requestMPCSign(
          "",
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
        elizaLogger.debug("MPC Signature Request Successful! Result:", JSON.stringify(signReq));
  
        // Retrieve the signature from the request (this may include polling via getMPCSignature).
        const signatureData = await getMPCSignature(signReq);
        const hexSignature = Buffer.from(signatureData).toString("hex");
        elizaLogger.debug("Retrieved MPC Signature (hex):", hexSignature);
  
        // Sign the unsigned transaction using the retrieved signature.
        const signedTx = await toSignedTransaction(
          unsignedTx,
          hexSignature,
          bytesToHex(key.key.publicKey),
          txHash
        );
        elizaLogger.debug("Signed transaction:", signedTx);
  
        // Broadcast the signed transaction.
        const broadcastHash = await broadcastEVMTransaction(signedTx, rpcUrl);
        elizaLogger.debug("Broadcast transaction hash:", broadcastHash);
  
        if (callback) {
          callback({
            text: `Transaction has been broadcasted on ${evmTxParams.network}.
  Here is the tx hash: https://holesky.etherscan.io/tx/${broadcastHash}`,
          });
        }
        return true;
      } catch (error: any) {
        const errorText = `❌ Error requesting MPC Signature: ${error.message || error}`;
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
            text: "Send from my 0xUserAddress to 0xRecipientAddress 5 ETH using holesky network",
            keyId: 1,
            unsignedTransaction: "Example transaction data",
            walletType: "EVM",
            action: "nativeTransfer",
            metadata: {
              chainId: 11155111,
            },
          },
        },
      ],
      [
        {
          user: "user",
          content: {
            text: "Request an MPC signature: send from my 0xUserAddress to 0xRecipientAddress 100 USDC using holesky network",
            keyId: 2,
            unsignedTransaction: "Another example transaction data",
            walletType: "EVM",
            action: "nativeTransfer",
            metadata: {
              chainId: 11155111,
            },
          },
        },
      ],
    ],
  };
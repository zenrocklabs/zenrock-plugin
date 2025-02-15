import {
    broadcastTransaction,
    getZenrockClient,
    getZenrockKeyQueryClient,
    getZenrockWorkspaceQueryClient,
} from "../clients/zenrockClient";
import { generateCosmosWallet } from "./walletService";
import { StdFee } from "@cosmjs/stargate";

import { KeyType } from "../types/zenrock/treasury/zrchain/key";
import { Any } from "../types/zenrock/google/protobuf/any";
import {
    QueryKeyByIDRequest,
    QueryKeysRequest,
    QueryKeyByAddressRequest,
    QuerySignatureRequestByIDRequest,
} from "../types/zenrock/treasury/zrchain/query";
import { VerificationVersion } from "../types/zenrock/treasury/zrchain/tx";
import { WalletType } from "../types/zenrock/treasury/zrchain/wallet";
import { QueryWorkspacesRequest } from "../types/zenrock/workspace/zrchain/query";
import { DENOM, DEFAULT_AMOUNT, DEFAULT_GAS, normalizeKeyType, normalizeAddressToWalletType, getKeyTypeByWalletType } from "./utils";
import { elizaLogger } from "@elizaos/core";
import type { DeliverTxResponse } from "@cosmjs/cosmwasm-stargate";

const rpcUrl: string =
    process.env.ZR_RPC ??
    (() => {
        throw new Error("ZR_RPC environment variable is not set.");
    })();

export async function createWorkspace(
    adminPolicyId: number = 0,
    signPolicyId: number = 0,
    additionalOwners: string[] = []
) {
    elizaLogger.debug("🔑 Preparing workspace creation transaction...");

    const { wallet } = await generateCosmosWallet();
    const client = await getZenrockClient(rpcUrl, wallet);
    const account = await wallet.getAccounts();
    // Define the transaction message
    const msgNewWorkspace = {
        typeUrl: "/zrchain.identity.MsgNewWorkspace",
        value: {
            creator: account[0].address,
            adminPolicyId,
            signPolicyId,
            additionalOwners,
        },
    };

    // Define transaction fee
    const fee: StdFee = {
        amount: [{ denom: DENOM, amount: DEFAULT_AMOUNT.toString() }],
        gas: DEFAULT_GAS.toString(),
    };

    elizaLogger.debug("\n🚀 Sending workspace creation transaction...");
    return await broadcastTransaction(
        client,
        account[0].address,
        [msgNewWorkspace],
        fee
    );
}

/**
 * Queries workspaces by owner address.
 * @param ownerAddress - The address of the workspace owner.
 * @returns A list of workspaces owned by the given address.
 */
export async function queryWorkspaceByOwner(
    ownerAddress: string = "",
    creator: string = ""
) {
    if (!ownerAddress) {
        throw new Error("❌ Owner address is required.");
    }

    elizaLogger.debug("🔍 Querying workspaces for owner:", ownerAddress);
    const queryClient = await getZenrockWorkspaceQueryClient(rpcUrl);
    const request: QueryWorkspacesRequest = {
        owner: ownerAddress,
        creator: creator,
        pagination: undefined,
    };

    try {
        const response = await queryClient.Workspaces(request);
        // console.log('✅ Workspaces retrieved:', response.workspaces);
        return response.workspaces;
    } catch (error) {
        elizaLogger.error("❌ Error fetching workspaces:", error);
        throw error;
    }
}

export async function requestMPCKey(
    workspaceAddr: string,
    keyType: KeyType,
    signPolicyId: number = 0,
    keyringAddr: string = "keyring1k6vc6vhp6e6l3rxalue9v4ux"
) {
    elizaLogger.debug("🔑 Preparing MPC key request transaction...");

    if (!workspaceAddr) {
        throw new Error("❌ Workspace address is missing or invalid.");
    }
    elizaLogger.debug("✅ Using Workspace Address:", workspaceAddr);

    const { wallet } = await generateCosmosWallet();
    const client = await getZenrockClient(rpcUrl, wallet);
    const account = await wallet.getAccounts();

    elizaLogger.debug("✅ Using Account Address:", account[0].address);
    const keyTypeStr = normalizeKeyType(keyType);
    elizaLogger.debug("✅ keyTypeStr:", keyTypeStr);

    if (!keyTypeStr) {
        throw new Error(
            `❌ Invalid KeyType: ${keyType}. Expected one of: ecdsa, ed25519, eddsa, bitcoin, btc.`
        );
    }

    const msgRequestKey = {
        typeUrl: "/zrchain.treasury.MsgNewKeyRequest",
        value: {
            creator: account[0].address,
            workspaceAddr,
            keyringAddr,
            keyType: keyTypeStr,
            btl: 0,
            index: 0,
            extRequester: "",
            extKeyType: 0,
            signPolicyId,
        },
    };

    // Define transaction fee
    const fee: StdFee = {
        amount: [{ denom: DENOM, amount: DEFAULT_AMOUNT.toString() }],
        gas: DEFAULT_GAS.toString(),
    };

    elizaLogger.debug("\n🚀 Sending MPC key request transaction...");
    const result = await broadcastTransaction(
        client,
        account[0].address,
        [msgRequestKey],
        fee
    );
    if (result.code === 0) {
        elizaLogger.debug(
            `✅ MPC Key Request Successful! TxHash: ${result.transactionHash}`
        );
    } else {
        elizaLogger.error(`❌ MPC Key Request Failed: ${result.rawLog}`);
    }
    const queryClient = await getZenrockKeyQueryClient(rpcUrl);

    const reqId = result.msgResponses[0].value[1]; // Uint8Array

    const request: QueryKeyByIDRequest = {
        id: reqId,
        walletType: WalletType.WALLET_TYPE_UNSPECIFIED,
        prefixes: [],
    };

    const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
    const retries = 5,
        delay = 1000;

    await sleep(15000); // Initial 15-second delay

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await queryClient.KeyByID(request);

            // Ensure wallets exist and at least one wallet is present
            if (!response.wallets || response.wallets.length === 0) {
                throw new Error(
                    `Response does not contain wallets: ${JSON.stringify(
                        response,
                        null,
                        2
                    )}`
                );
            }

            // Use the first wallet since only one is present
            const walletAddress = response.wallets[0].address;
            elizaLogger.debug("✅ Key response retrieved:", walletAddress);
            return walletAddress;
        } catch (error) {
            elizaLogger.error(`❌ Attempt ${attempt + 1} failed:`, error);

            if (attempt < retries - 1) {
                elizaLogger.debug(`⏳ Retrying in ${delay / 1000} seconds...`);
                await sleep(delay);
            } else {
                elizaLogger.error("🚨 All retry attempts failed.");
                throw error;
            }
        }
    }
}

/**
 * Queries workspaces by owner address.
 * @param ownerAddress - The address of the workspace owner.
 * @returns A list of workspaces owned by the given address.
 */
export async function queryKeysByWorkspace(workspaceAddr: string) {
    if (!workspaceAddr) {
        throw new Error("❌ Workspace address is required.");
    }

    // console.log('🔍 Querying keys for workspace:', workspaceAddr);
    const queryClient = await getZenrockKeyQueryClient(rpcUrl);
    const request: QueryKeysRequest = {
        workspaceAddr: workspaceAddr,
        walletType: 0,
        prefixes: [],
        pagination: undefined,
    };

    try {
        const response = await queryClient.Keys(request);
        return response.keys;
    } catch (error) {
        elizaLogger.error("❌ Error fetching workspaces:", error);
        throw error;
    }
}

export async function queryKeyByAddress(keyAddress: string) {
    if (!keyAddress) {
        throw new Error("❌ Key address is required.");
    }

    const walletType = normalizeAddressToWalletType(keyAddress);
    const keyType = getKeyTypeByWalletType(walletType);

    elizaLogger.debug("🔍 Querying for key by address:", keyAddress);
    const queryClient = await getZenrockKeyQueryClient(rpcUrl);
    const request: QueryKeyByAddressRequest = {
        address: keyAddress,
        keyringAddr: "",
        keyType: keyType,
        walletType: walletType,
        prefixes: [],
    };

    try {
        const response = await queryClient.KeyByAddress(request);
        elizaLogger.debug("✅ Key retrieved:", response.response);
        return response.response;
    } catch (error) {
        elizaLogger.error("❌ Error fetching workspaces:", error);
        throw error;
    }
}

export async function requestMPCSign(
    keyId: number,
    dataForSigning: string,
    btl: number,
    cacheId: Uint8Array,
    verifySigningData: Uint8Array,
    verifySigningDataVersion: VerificationVersion
) {
    console.log("🔑 Preparing MPC signature request transaction...");

    if (!keyId) {
        throw new Error("❌ Key ID is missing or invalid.");
    }
    console.log("✅ Using Key ID:", keyId);

    const { wallet } = await generateCosmosWallet();
    const client = await getZenrockClient(rpcUrl, wallet);
    const account = await wallet.getAccounts();

    if (!dataForSigning) {
        throw new Error(`❌ Data for signing is missing or invalid.`);
    }

    const msgRequestKey = {
        typeUrl: "/zrchain.treasury.MsgNewSignatureRequest",
        value: {
            creator: account[0].address,
            keyId,
            dataForSigning,
            btl,
            cacheId,
            verifySigningData,
            verifySigningDataVersion,
        },
    };

    // Define transaction fee
    const fee: StdFee = {
        amount: [{ denom: DENOM, amount: DEFAULT_AMOUNT.toString() }],
        gas: DEFAULT_GAS.toString(),
    };

    elizaLogger.debug("\n🚀 Sending MPC signature request transaction...");
    const result = await broadcastTransaction(
        client,
        account[0].address,
        [msgRequestKey],
        fee
    );
    if (result.code === 0) {
        elizaLogger.debug(
            `✅ MPC Signature Request Successful! TxHash: ${result.transactionHash}`
        );
        return result;
    } else {
        throw new Error(`❌ MPC Signature Request Failed: ${result.rawLog}`);
    }
}
export async function getMPCSignature(
    txResp: DeliverTxResponse
): Promise<Uint8Array> {
    const queryClient = await getZenrockKeyQueryClient(rpcUrl);

    const signId = txResp.msgResponses[0].value[1]; // Uint8Array

    const request: QuerySignatureRequestByIDRequest = {
        id: signId,
    };

    const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
    const retries = 5,
        delay = 1000;

    await sleep(15000); // Initial 15-second delay

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await queryClient.SignatureRequestByID(request);

            // Ensure wallets exist and at least one wallet is present
            if (
                !response.signRequest ||
                response.signRequest.signedData.length === 0
            ) {
                throw new Error(
                    `Response does not contain signature responses: ${JSON.stringify(
                        response,
                        null,
                        2
                    )}`
                );
            }

            // Use the first wallet since only one is present
            const signature = response.signRequest.signedData[0].signedData;
            const hexSignature = Buffer.from(signature).toString("hex"); // Convert signedData to hex

            elizaLogger.debug(
                "✅ Signature response retrieved:",
                response.signRequest.id
            );
            elizaLogger.debug(
                "✅ Signature request ID:",
                response.signRequest.signedData[0].signRequestId
            );
            elizaLogger.debug("✅ Signature:", hexSignature);
            return signature;
        } catch (error) {
            elizaLogger.warn(`❌ Attempt ${attempt + 1} failed:`, error);

            if (attempt < retries - 1) {
                elizaLogger.debug(`⏳ Retrying in ${delay / 1000} seconds...`);
                await sleep(delay);
            } else {
                elizaLogger.error("🚨 All retry attempts failed.");
                throw error;
            }
        }
    }
}

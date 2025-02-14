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
import { QueryKeyByIDRequest, QueryKeysRequest, QueryKeyByAddressRequest, QuerySignatureRequestByIDRequest } from "../types/zenrock/treasury/zrchain/query";
import { VerificationVersion } from "../types/zenrock/treasury/zrchain/tx";
import { WalletType } from "../types/zenrock/treasury/zrchain/wallet";
import { QueryWorkspacesRequest } from "../types/zenrock/workspace/zrchain/query";
import { DENOM, DEFAULT_AMOUNT, DEFAULT_GAS, normalizeKeyType } from "./utils";

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
    console.log("🔑 Preparing workspace creation transaction...");

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

    console.log("\n🚀 Sending workspace creation transaction...");
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

    console.log("🔍 Querying workspaces for owner:", ownerAddress);
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
        console.error("❌ Error fetching workspaces:", error);
        throw error;
    }
}

export async function requestMPCKey(
    workspaceAddr: string,
    keyType: KeyType,
    signPolicyId: number = 0,
    keyringAddr: string = "keyring1k6vc6vhp6e6l3rxalue9v4ux"
) {
    console.log("🔑 Preparing MPC key request transaction...");

    if (!workspaceAddr) {
        throw new Error("❌ Workspace address is missing or invalid.");
    }
    console.log("✅ Using Workspace Address:", workspaceAddr);

    const { wallet } = await generateCosmosWallet();
    const client = await getZenrockClient(rpcUrl, wallet);
    const account = await wallet.getAccounts();

    console.log("✅ Using Account Address:", account[0].address);
    const keyTypeStr = normalizeKeyType(keyType);
    console.log("✅ keyTypeStr:", keyTypeStr);

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

    // console.log('\n🚀 Sending MPC key request transaction...');
    const result = await broadcastTransaction(
        client,
        account[0].address,
        [msgRequestKey],
        fee
    );
    if (result.code === 0) {
        // console.log(
        //   `✅ MPC Key Request Successful! TxHash: ${result.transactionHash}`
        // );
    } else {
        console.error(`❌ MPC Key Request Failed: ${result.rawLog}`);
    }
    const queryClient = await getZenrockKeyQueryClient(rpcUrl);

    const reqId = result.msgResponses[0].value[1]; // Uint8Array

    const request: QueryKeyByIDRequest = {
        id: reqId,
        walletType: WalletType.WALLET_TYPE_EVM,
        prefixes: ["zen"],
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
            // console.log('✅ Key response retrieved:', walletAddress);
            return walletAddress;
        } catch (error) {
            console.error(`❌ Attempt ${attempt + 1} failed:`, error);

            if (attempt < retries - 1) {
                console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
                await sleep(delay);
            } else {
                console.error("🚨 All retry attempts failed.");
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
        console.error("❌ Error fetching workspaces:", error);
        throw error;
    }
}

export async function queryKeyByAddress(keyAddress: string) {
    if (!keyAddress) {
        throw new Error("❌ Key address is required.");
    }

    console.log("🔍 Querying for key by address:", keyAddress);
    const queryClient = await getZenrockKeyQueryClient(rpcUrl);
    const request: QueryKeyByAddressRequest = {
        address: keyAddress,
        keyringAddr: "",
        keyType: KeyType.KEY_TYPE_ECDSA_SECP256K1,
        walletType: WalletType.WALLET_TYPE_EVM,
        prefixes: [],
    };

    try {
        const response = await queryClient.KeyByAddress(request);
        console.log("✅ Key retrieved:", response.response);
        return response.response;
    } catch (error) {
        console.error("❌ Error fetching workspaces:", error);
        throw error;
    }
}

export async function requestMPCSign(
    creator: string,
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

    // console.log('✅ Using Account Address:', account[0].address);
    // const keyTypeStr = normalizeKeyType(keyType);
    // console.log('✅ keyTypeStr:', keyTypeStr);

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

    // console.log('\n🚀 Sending MPC signature request transaction...');
    const result = await broadcastTransaction(
        client,
        account[0].address,
        [msgRequestKey],
        fee
    );
    if (result.code === 0) {
        // console.log(
        //   `✅ MPC Signature Request Successful! TxHash: ${result.transactionHash}`
        // );
    } else {
        console.error(`❌ MPC Signature Request Failed: ${result.rawLog}`);
    }
    const queryClient = await getZenrockKeyQueryClient(rpcUrl);

    const signId = result.msgResponses[0].value[1]; // Uint8Array

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
            const signature = response.signRequest.signedData;
            // console.log('✅ Signature response retrieved:', signature);
            // console.log('✅ Signature request ID:', signature[0].signRequestId);
            // console.log('✅ Signature:', signature[0].signedData);
            return signature;
        } catch (error) {
            console.error(`❌ Attempt ${attempt + 1} failed:`, error);

            if (attempt < retries - 1) {
                console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
                await sleep(delay);
            } else {
                console.error("🚨 All retry attempts failed.");
                throw error;
            }
        }
    }
}

export async function requestMPCSignTx(
    creator: string,
    keyId: number,
    walletType: WalletType,
    unsignedTransaction: Uint8Array,
    metadata: Any | undefined,
    btl: number,
    cacheId: Uint8Array,
    noBroadcast: boolean
) {
    console.log("🔑 Preparing MPC signature request transaction...");

    if (!keyId) {
        throw new Error("❌ Key ID is missing or invalid.");
    }
    console.log("✅ Using Key ID:", keyId);

    if (!walletType) {
        throw new Error("❌ Wallet type is missing or invalid.");
    }
    console.log("✅ Using Wallet Type:", walletType);

    if (!unsignedTransaction) {
        throw new Error("❌ Unsigned transaction is missing or invalid.");
    }
    console.log("✅ Using Unsigned Transaction:", unsignedTransaction);

    if (!metadata) {
        throw new Error("❌ Metadata is missing or invalid.");
    }
    console.log("✅ Using Metadata:", metadata);

    const { wallet } = await generateCosmosWallet();
    const client = await getZenrockClient(rpcUrl, wallet);
    const account = await wallet.getAccounts();

    console.log("✅ Using Account Address:", account[0].address);
    // const keyTypeStr = normalizeKeyType(keyType);
    // console.log('✅ keyTypeStr:', keyTypeStr);

    const msgRequestSignTransaction = {
        typeUrl: "/zrchain.treasury.MsgNewSignTransactionRequest",
        value: {
            creator: account[0].address,
            keyId,
            walletType,
            unsignedTransaction,
            metadata,
            btl,
            cacheId,
            noBroadcast,
        },
    };

    // Define transaction fee
    const fee: StdFee = {
        amount: [{ denom: DENOM, amount: DEFAULT_AMOUNT.toString() }],
        gas: DEFAULT_GAS.toString(),
    };

    console.log(
        "\n🚀 Sending MPC transaction signature request transaction..."
    );
    const result = await broadcastTransaction(
        client,
        account[0].address,
        [msgRequestSignTransaction],
        fee
    );
    if (result.code === 0) {
        console.log(
            `✅ MPC Sign Transaction Request Successful! TxHash: ${result.transactionHash}`
        );
    } else {
        console.error(
            `❌ MPC Sign Transaction Request Failed: ${result.rawLog}`
        );
    }
    const queryClient = await getZenrockKeyQueryClient(rpcUrl);

    const signId = result.msgResponses[0].value[1]; // Uint8Array

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
            const signature = response.signRequest.signedData;
            console.log("✅ Signature response retrieved:", signature);
            console.log("✅ Signature request ID:", signature[0].signRequestId);
            console.log("✅ Signature:", signature[0].signedData);
            return signature;
        } catch (error) {
            console.error(`❌ Attempt ${attempt + 1} failed:`, error);

            if (attempt < retries - 1) {
                console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
                await sleep(delay);
            } else {
                console.error("🚨 All retry attempts failed.");
                throw error;
            }
        }
    }
}

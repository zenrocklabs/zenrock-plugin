import {
    DirectSecp256k1Wallet,
    GeneratedType,
    Registry,
} from "@cosmjs/proto-signing";
import {
    createProtobufRpcClient,
    QueryClient,
    SigningStargateClient,
    StdFee,
} from "@cosmjs/stargate";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";

import {
    MsgNewKeyRequest,
    MsgNewSignatureRequest,
} from "../types/zenrock/treasury/zrchain/tx";
import { QueryClientImpl as TreasuryQueryClient } from "../types/zenrock/treasury/zrchain/query";

import { MsgNewWorkspace } from "../types/zenrock/workspace/zrchain/tx";
import { QueryClientImpl as WorkspaceQueryClient } from "../types/zenrock/workspace/zrchain/query";

const zrRegistry = new Registry([
    [
        "/zrchain.identity.MsgNewWorkspace",
        MsgNewWorkspace as unknown as GeneratedType,
    ],
    [
        "/zrchain.treasury.MsgNewKeyRequest",
        MsgNewKeyRequest as unknown as GeneratedType,
    ],
    [
        "/zrchain.treasury.MsgNewSignatureRequest",
        MsgNewSignatureRequest as unknown as GeneratedType,
    ],
]);

/**
 * Connects to Zenrock as a signing client using the provided wallet.
 */
export async function getZenrockClient(
    rpcUrl: string,
    wallet: DirectSecp256k1Wallet
) {
    const client = await SigningStargateClient.connectWithSigner(
        rpcUrl,
        wallet,
        {
            registry: zrRegistry,
        }
    );
    return client;
}

/**
 * Creates an RPC-compatible gRPC client.
 */
export async function getZenrockWorkspaceQueryClient(
    rpcUrl: string
): Promise<WorkspaceQueryClient> {
    // Create a Tendermint client to connect to the RPC endpoint
    const tmClient = await Tendermint34Client.connect(rpcUrl);
    // Create a query client using the Tendermint client
    const queryClient = new QueryClient(tmClient);
    // Create a Protobuf RPC client from the query client
    const rpc = createProtobufRpcClient(queryClient);
    // Instantiate the generated query service using the RPC client
    const queryService = new WorkspaceQueryClient(rpc);
    return queryService;
}

export async function getZenrockKeyQueryClient(
    rpcUrl: string
): Promise<TreasuryQueryClient> {
    // Create a Tendermint client to connect to the RPC endpoint
    const tmClient = await Tendermint34Client.connect(rpcUrl);
    // Create a query client using the Tendermint client
    const queryClient = new QueryClient(tmClient);
    // Create a Protobuf RPC client from the query client
    const rpc = createProtobufRpcClient(queryClient);
    // Instantiate the generated query service using the RPC client
    const queryService = new TreasuryQueryClient(rpc);
    return queryService;
}
export async function broadcastTransaction(
    client: SigningStargateClient,
    address: string,
    messages: any[],
    fee: StdFee,
    memo: string = ""
) {
    console.log("\n✍️  Signing and broadcasting transaction...");
    const result = await client.signAndBroadcast(address, messages, fee, memo);
    if (result.code === 0) {
        console.log(
            `✅ Transaction successful! TxHash: ${result.transactionHash}`
        );
    } else {
        console.error(`❌ Transaction failed: ${result.rawLog}`);
    }
    return result;
}

export async function getZenrockSignatureQueryClient(
    rpcUrl: string
): Promise<TreasuryQueryClient> {
    // Create a Tendermint client to connect to the RPC endpoint
    const tmClient = await Tendermint34Client.connect(rpcUrl);
    // Create a query client using the Tendermint client
    const queryClient = new QueryClient(tmClient);
    // Create a Protobuf RPC client from the query client
    const rpc = createProtobufRpcClient(queryClient);
    // Instantiate the generated query service using the RPC client
    const queryService = new TreasuryQueryClient(rpc);
    return queryService;
}

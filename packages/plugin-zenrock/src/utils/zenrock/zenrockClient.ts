import {
  DirectSecp256k1Wallet,
  GeneratedType,
  Registry,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, StdFee } from '@cosmjs/stargate';
import { MsgNewWorkspace } from '../../types/zenrock/workspace/tx';

const zrRegistry = new Registry([
  [
    '/zrchain.identity.MsgNewWorkspace',
    MsgNewWorkspace as unknown as GeneratedType,
  ],
]);

/**
 * Connects to Zenrock as a signing client using the provided wallet.
 */
export async function getZenrockClient(
  rpcUrl: string,
  wallet: DirectSecp256k1Wallet
) {
  const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet, {
    registry: zrRegistry,
  });
  return client;
}

export async function broadcastTransaction(
  client: SigningStargateClient,
  address: string,
  messages: any[],
  fee: StdFee,
  memo: string = ''
) {
  console.log('\n✍️ Signing and broadcasting transaction...');
  const result = await client.signAndBroadcast(address, messages, fee, memo);
  if (result.code === 0) {
    console.log(`✅ Transaction successful! TxHash: ${result.transactionHash}`);
  } else {
    console.error(`❌ Transaction failed: ${result.rawLog}`);
  }
  return result;
}

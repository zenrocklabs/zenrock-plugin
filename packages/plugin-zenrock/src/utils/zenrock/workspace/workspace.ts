import { broadcastTransaction, getZenrockClient } from '../zenrockClient';
import { generateWallet } from '../agentWallet';
import { DEFAULT_AMOUNT, DEFAULT_GAS, DENOM } from '../utils';
import { StdFee } from '@cosmjs/stargate';
import 'dotenv/config';

const rpcUrl: string =
  process.env.ZR_RPC ??
  (() => {
    throw new Error('ZR_RPC environment variable is not set.');
  })();

export async function createWorkspace(
  adminPolicyId: number = 0,
  signPolicyId: number = 0,
  additionalOwners: string[] = []
) {
  const { wallet } = await generateWallet();
  const client = await getZenrockClient(rpcUrl, wallet);
  const account = await wallet.getAccounts();

  const msgNewWorkspace = {
    typeUrl: '/zrchain.identity.MsgNewWorkspace',
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

  return await broadcastTransaction(
    client,
    account[0].address,
    [msgNewWorkspace],
    fee
  );
}

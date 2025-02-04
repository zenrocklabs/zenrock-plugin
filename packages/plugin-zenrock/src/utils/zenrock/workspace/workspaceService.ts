import {
  broadcastTransaction,
  getZenrockClient,
  getZenrockWorkspaceQueryClient,
} from '../zenrockClient';
import { generateWallet } from '../agentWallet';
import { DEFAULT_AMOUNT, DEFAULT_GAS, DENOM, normalizeKeyType } from '../utils';
import { StdFee } from '@cosmjs/stargate';
import { KeyType } from '../treasury/zrchain/key';
import { QueryWorkspacesRequest } from './zrchain/query';

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
  console.log('🔑 Preparing workspace creation transaction...');

  const { wallet } = await generateWallet();
  const client = await getZenrockClient(rpcUrl, wallet);
  const account = await wallet.getAccounts();
  // Define the transaction message
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

  console.log('\n🚀 Sending workspace creation transaction...');
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
  ownerAddress: string = '',
  creator: string = '',
) {
  if (!ownerAddress) {
    throw new Error('❌ Owner address is required.');
  }

  console.log('🔍 Querying workspaces for owner:', ownerAddress);
  const queryClient = await getZenrockWorkspaceQueryClient(rpcUrl);
  const request: QueryWorkspacesRequest = {
    owner: ownerAddress,
    creator: creator,
    pagination: undefined,
  };

  try {
    const response = await queryClient.Workspaces(request);
    console.log('✅ Workspaces retrieved:', response.workspaces);
    return response.workspaces;
  } catch (error) {
    console.error('❌ Error fetching workspaces:', error);
    throw error;
  }
}

export async function requestMPCKey(
  workspaceAddr: string,
  keyType: KeyType = KeyType.KEY_TYPE_ECDSA_SECP256K1,
  signPolicyId: number = 0,
  keyringAddr: string = 'keyring1k6vc6vhp6e6l3rxalue9v4ux'
) {
  console.log('🔑 Preparing MPC key request transaction...');

  if (!workspaceAddr) {
    throw new Error('❌ Workspace address is missing or invalid.');
  }
  console.log('✅ Using Workspace Address:', workspaceAddr);

  const { wallet } = await generateWallet();
  const client = await getZenrockClient(rpcUrl, wallet);
  const account = await wallet.getAccounts();

  console.log('✅ Using Account Address:', account[0].address);
  const keyTypeStr = normalizeKeyType(keyType);
  console.log('✅ keyTypeStr:', keyTypeStr);

  if (!keyTypeStr) {
    throw new Error(
      `❌ Invalid KeyType: ${keyType}. Expected one of: ecdsa, ed25519, eddsa, bitcoin, btc.`
    );
  }

  const msgRequestKey = {
    typeUrl: '/zrchain.treasury.MsgNewKeyRequest',
    value: {
      creator: account[0].address,
      workspaceAddr,
      keyringAddr,
      keyType: keyTypeStr,
      btl: 0,
      index: 0,
      extRequester: '',
      extKeyType: 0,
      signPolicyId,
    },
  };

  // Define transaction fee
  const fee: StdFee = {
    amount: [{ denom: DENOM, amount: DEFAULT_AMOUNT.toString() }],
    gas: DEFAULT_GAS.toString(),
  };

  console.log('\n🚀 Sending MPC key request transaction...');
  const result = await broadcastTransaction(
    client,
    account[0].address,
    [msgRequestKey],
    fee
  );

  if (result.code === 0) {
    console.log(
      `✅ MPC Key Request Successful! TxHash: ${result.transactionHash}`
    );
  } else {
    console.error(`❌ MPC Key Request Failed: ${result.rawLog}`);
  }

  return result;
}

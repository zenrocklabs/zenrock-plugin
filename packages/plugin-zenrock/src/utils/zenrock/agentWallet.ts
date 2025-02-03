import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { fromHex, toHex } from '@cosmjs/encoding';
import { Secp256k1, sha256 } from '@cosmjs/crypto';
import 'dotenv/config';

const hexSeed: string =
  process.env.ZR_SEED ??
  (() => {
    throw new Error('ZR_SEED environment variable is not set.');
  })();
const walletPrefix = 'zen';

export async function generateWallet() {
  const privateKey = fromHex(hexSeed);
  if (privateKey.length !== 32) {
    throw new Error(
      'Invalid seed length: Must be 32 bytes (64 hex characters).'
    );
  }

  const keypair = await Secp256k1.makeKeypair(privateKey);
  const wallet = await DirectSecp256k1Wallet.fromKey(privateKey, walletPrefix);
  const [account] = await wallet.getAccounts();

  return {
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey: Buffer.from(keypair.pubkey).toString('hex'),
    address: account.address,
    wallet,
  };
}

/**
 * Generates a wallet using the base seed concatenated with a UUID string.
 * @param uuid A unique identifier to derive a deterministic wallet.
 */
export async function generateWalletWithUUID(uuid: string) {
  if (!uuid) {
    throw new Error('UUID input is required.');
  }

  // Remove hyphens from UUID
  const cleanUUID = uuid.replace(/-/g, '');

  // Concatenate cleaned UUID with the base hex seed
  const combinedSeed = hexSeed + cleanUUID;

  // Hash the combined seed to produce a deterministic private key
  const hashedPrivateKey = sha256(Buffer.from(combinedSeed));
  const privateKey = hashedPrivateKey.slice(0, 32); // Ensure 32-byte private key

  const keypair = await Secp256k1.makeKeypair(privateKey);
  const wallet = await DirectSecp256k1Wallet.fromKey(privateKey, walletPrefix);
  const [account] = await wallet.getAccounts();

  return {
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey: Buffer.from(keypair.pubkey).toString('hex'),
    address: account.address,
    wallet,
  };
}

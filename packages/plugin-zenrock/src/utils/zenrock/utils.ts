import { Any } from './google/protobuf/any';
import { KeyType } from './treasury/zrchain/key';
import { MetadataEthereum } from './treasury/zrchain/tx';
import { WalletType } from './treasury/zrchain/wallet';

export const DENOM = 'urock';
export const DEFAULT_GAS = 200000;
export const DEFAULT_AMOUNT = 500000;

export function toUtf8String(byteArray: Uint8Array): string {
  return new TextDecoder().decode(byteArray);
}

export function normalizeKeyType(object: KeyType): string {
  switch (object) {
    case KeyType.KEY_TYPE_ECDSA_SECP256K1:
      return 'ecdsa';
    case KeyType.KEY_TYPE_EDDSA_ED25519:
      return 'eddsa';
    case KeyType.KEY_TYPE_BITCOIN_SECP256K1:
      return 'bitcoin';
    case KeyType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}

export function normalizeWalletType(string: string): WalletType {
  switch (string) {
    case 'native':
      return WalletType.WALLET_TYPE_NATIVE;
    case 'EVM':
      return WalletType.WALLET_TYPE_EVM;
    case 'btc_testnet':
      return WalletType.WALLET_TYPE_BTC_TESTNET;
    case 'btc_mainnet':
      return WalletType.WALLET_TYPE_BTC_MAINNET;
    case 'btc_regnet':
      return WalletType.WALLET_TYPE_BTC_REGNET;
    case 'solana':
      return WalletType.WALLET_TYPE_SOLANA;
    case 'unspecified':
      return WalletType.WALLET_TYPE_UNSPECIFIED;
    default:
      return WalletType.WALLET_TYPE_EVM;
  }
}

export function createMetadata(chainId: number): Any {
  const metadata: MetadataEthereum = {
    chainId: chainId,
  };

  const metadataAny = newAnyWithValue(metadata);

  return metadataAny;
}

// Function to create a new Any type with a value
function newAnyWithValue<T>(value: T): Any {
  return {
    typeUrl: "type.googleapis.com/MetadataEthereum",
    value: new TextEncoder().encode(JSON.stringify(value))
  };
}

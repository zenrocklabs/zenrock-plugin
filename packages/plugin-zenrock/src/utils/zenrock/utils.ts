import { KeyType } from './treasury/zrchain/key';

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

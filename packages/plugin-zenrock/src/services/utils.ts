import { Any } from "../types/zenrock/google/protobuf/any";
import { KeyType } from "../types/zenrock/treasury/zrchain/key";
import { MetadataEthereum } from "../types/zenrock/treasury/zrchain/tx";
import { WalletType } from "../types/zenrock/treasury/zrchain/wallet";

export const DENOM = "urock";
export const DEFAULT_GAS = 1000000;
export const DEFAULT_AMOUNT = 10000000;

export function toUtf8String(byteArray: Uint8Array): string {
    return new TextDecoder().decode(byteArray);
}

export function normalizeKeyType(object: KeyType): string {
    switch (object) {
        case KeyType.KEY_TYPE_ECDSA_SECP256K1:
            return "ecdsa";
        case KeyType.KEY_TYPE_EDDSA_ED25519:
            return "eddsa";
        case KeyType.KEY_TYPE_BITCOIN_SECP256K1:
            return "bitcoin";
        case KeyType.UNRECOGNIZED:
        default:
            return "UNRECOGNIZED";
    }
}

export function getWalletTypeByKeyType(keyType: KeyType): WalletType {
    switch (keyType) {
        case KeyType.KEY_TYPE_ECDSA_SECP256K1:
            return WalletType.WALLET_TYPE_EVM;
        case KeyType.KEY_TYPE_EDDSA_ED25519:
            return WalletType.WALLET_TYPE_SOLANA;
        case KeyType.KEY_TYPE_BITCOIN_SECP256K1:
            return WalletType.WALLET_TYPE_BTC_MAINNET;
        case KeyType.UNRECOGNIZED:
        default:
            return WalletType.WALLET_TYPE_UNSPECIFIED;
    }
}

export function getKeyTypeByWalletType(walletType: WalletType): KeyType {
    switch (walletType) {
        case WalletType.WALLET_TYPE_EVM:
            return KeyType.KEY_TYPE_ECDSA_SECP256K1;
        case WalletType.WALLET_TYPE_NATIVE:
            return KeyType.KEY_TYPE_ECDSA_SECP256K1;
        case WalletType.WALLET_TYPE_SOLANA:
            return KeyType.KEY_TYPE_EDDSA_ED25519;
        case WalletType.WALLET_TYPE_BTC_MAINNET:
            return KeyType.KEY_TYPE_BITCOIN_SECP256K1;
        case WalletType.UNRECOGNIZED:
        default:
            return KeyType.UNRECOGNIZED;
    }
}

export function normalizeWalletType(string: string): WalletType {
    switch (string) {
        case "native":
            return WalletType.WALLET_TYPE_NATIVE;
        case "EVM":
            return WalletType.WALLET_TYPE_EVM;
        case "btc_testnet":
            return WalletType.WALLET_TYPE_BTC_TESTNET;
        case "btc_mainnet":
            return WalletType.WALLET_TYPE_BTC_MAINNET;
        case "btc_regnet":
            return WalletType.WALLET_TYPE_BTC_REGNET;
        case "solana":
            return WalletType.WALLET_TYPE_SOLANA;
        case "unspecified":
            return WalletType.WALLET_TYPE_UNSPECIFIED;
        default:
            return WalletType.WALLET_TYPE_EVM;
    }
}

export function normalizeStringWalletType(stringWalletType: string): string {
    switch (stringWalletType) {
        case "WALLET_TYPE_NATIVE":
        case "native":
            return "native";
        case "WALLET_TYPE_EVM":
        case "EVM":
        case "evm":
            return "EVM";
        case "WALLET_TYPE_BTC_TESTNET":
        case "btc_testnet":
            return "TBTC";
        case "WALLET_TYPE_BTC_MAINNET":
        case "btc_mainnet":
            return "BTC";
        case "WALLET_TYPE_BTC_REGNET":
        case "btc_regnet":
            return "btc_regnet";
        case "WALLET_TYPE_SOLANA":
        case "solana":
            return "SOL";
        case "WALLET_TYPE_UNSPECIFIED":
        case "unspecified":
            return "unspecified";
        default:
            throw new Error(`Unrecognized wallet type: ${stringWalletType}`);
    }
}

export function normalizeAddressToWalletType(address: string): WalletType {
    switch (true) {
        case address.startsWith("0x"):
            return WalletType.WALLET_TYPE_EVM;
        case address.startsWith("tb1"):
            return WalletType.WALLET_TYPE_BTC_TESTNET;
        case address.startsWith("bc1"):
            return WalletType.WALLET_TYPE_BTC_MAINNET;
        case isBase58Encoded(address):
            return WalletType.WALLET_TYPE_SOLANA;
        default:
            return WalletType.WALLET_TYPE_NATIVE;
    }
}

function isBase58Encoded(value: string): boolean {
    /**
     * Checks if a string is Base58-encoded.
     * Base58 strings consist of the following characters:
     * 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
     *
     * @param value - The string to validate.
     * @returns True if the string is Base58-encoded, otherwise false.
     */
    const base58Regex = /^[A-HJ-NP-Za-km-z1-9]+$/;
  
    // Check if the string matches the Base58 regex
    return base58Regex.test(value);
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
        value: new TextEncoder().encode(JSON.stringify(value)),
    };
}

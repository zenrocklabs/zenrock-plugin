import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { fromHex, toHex } from "@cosmjs/encoding";
import { Secp256k1, sha256 } from "@cosmjs/crypto";
import "dotenv/config";

const hexSeed: string =
    process.env.ZR_SEED ??
    (() => {
        throw new Error("ZR_SEED environment variable is not set.");
    })();

export async function generateCosmosWallet(
    walletPrefix: string = "zen",
    uuid: string = ""
) {
    let seed = hexSeed;
    if (uuid) {
        const cleanUUID = uuid.replace(/-/g, "");
        seed = hexSeed + cleanUUID;
    }
    // Hash the combined seed to produce a deterministic private key
    const hashedPrivateKey = sha256(Buffer.from(seed));
    const privateKey = hashedPrivateKey.slice(0, 32); // Ensure 32-byte private key

    if (privateKey.length !== 32) {
        throw new Error(
            "Invalid seed length: Must be 32 bytes (64 hex characters)."
        );
    }

    const keypair = await Secp256k1.makeKeypair(privateKey);
    const wallet = await DirectSecp256k1Wallet.fromKey(
        privateKey,
        walletPrefix
    );
    return {
        privateKey: Buffer.from(privateKey).toString("hex"),
        publicKey: Buffer.from(keypair.pubkey).toString("hex"),
        wallet: wallet,
    };
}

export async function getAccountFromWallet(
    wallet: DirectSecp256k1Wallet,
    index: number = 0
) {
    return (await wallet.getAccounts())[index];
}

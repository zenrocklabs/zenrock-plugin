// utils.ts
import {
    bytesToHex,
    createPublicClient,
    hexToBytes,
    http,
    parseTransaction,
    recoverAddress,
    recoverPublicKey,
    serializeTransaction,
  } from 'viem';
  import type {
    Chain,
    HttpTransport,
    PublicClient,
    Account,
    Signature,
    TransactionSerializable,
  } from 'viem';
  import * as viemChains from 'viem/chains';
  
  /**
   * Retrieves all available EVM chains.
   * @returns A record of chain names to Chain objects.
   */
  export function getEVMChains(): Record<string, Chain> {
    return { ...viemChains };
  }
  
  /**
   * Retrieves a specific EVM Chain by its name.
   * @param chainName - The name of the chain to retrieve.
   * @param chains - Optional custom chains to include. Defaults to viemChains.
   * @returns The Chain object corresponding to the provided chainName.
   * @throws Will throw an error if the chainName does not exist in the chains.
   */
  export function getEVMChain(
    chainName: string,
    chains: Record<string, Chain> = viemChains
  ): Chain {
    const chain = chains[chainName];
    if (!chain) {
      throw new Error(`Chain "${chainName}" not found.`);
    }
    return chain;
  }
  
  /**
   * Creates a PublicClient for interacting with a specific EVM chain.
   * @param rpcUrl - The RPC URL of the EVM node.
   * @param chainName - The name of the chain to connect to.
   * @param chains - Optional custom chains to include. Defaults to viemChains.
   * @returns A PublicClient instance configured for the specified chain.
   * @throws Will throw an error if the chainName does not exist in the chains.
   */
  export function getEVMClient(
    rpcUrl: string,
    chainName: string,
    chains: Record<string, Chain> = viemChains
  ): PublicClient<HttpTransport, Chain, Account | undefined> {
    const chain = getEVMChain(chainName, chains); // Ensures the chain exists
    const transport = http(rpcUrl);
  
    return createPublicClient({
      chain,
      transport,
    });
  }
  
  /**
   * Signs an unsigned transaction using the signature (r, s) and calculates 'v' dynamically.
   */
  export async function toSignedTransaction(
    unsignedTx: any,
    signature: string,
    pubKey: string,
    hash: string
  ): Promise<string> {
    const normalizedSignature = signature.startsWith('0x')
      ? signature.slice(2)
      : signature;
  
    if (normalizedSignature.length !== 128) {
      throw new Error(
        `Invalid signature length: ${normalizedSignature.length}. Expected 128 hex characters (r + s).`
      );
    }
  
    // Extract r and s
    const r = `0x${normalizedSignature.slice(0, 64)}` as `0x${string}`;
    const s = `0x${normalizedSignature.slice(64, 128)}` as `0x${string}`;
  
    // Calculate v
    let vHex: string;
    try {
      vHex = await calculateV(r, s, pubKey, hash);
      console.log('✅ Raw ECDSA v (hex):', vHex);
    } catch (err) {
      console.error('❌ Could not calculate v:', err);
      throw err;
    }
  
    const parsedUnsigned = parseTransaction(`0x${unsignedTx}`);
  
    // 4) For EIP‑1559 transactions, use the recovery id as yParity (0 or 1)
    const yParity = parseInt(vHex, 16);
    console.log('🔎 [raw recovery id =', yParity);
  
    // 5) Construct the final signed transaction using yParity.
    const signedTx = serializeTransaction(
      parsedUnsigned as TransactionSerializable,
      {
        r,
        s,
        yParity,
      }
    );
  
    return signedTx;
  }
  
  /**
   * Compresses an uncompressed public key.
   *
   * Uncompressed keys have the format: 0x04 + X (32 bytes) + Y (32 bytes)
   * Compressed keys have the format: 0x02 or 0x03 (depending on Y's parity) + X.
   *
   * @param {string} uncompressedPubkey - The uncompressed public key as a hex string (0x04...)
   * @returns {string} - The compressed public key as a hex string (0x02... or 0x03...)
   */
  function compressPubkey(uncompressedPubkey: string): string {
    // Remove "0x" prefix if present.
    const hex = uncompressedPubkey.startsWith('0x')
      ? uncompressedPubkey.slice(2)
      : uncompressedPubkey;
    if (hex.length !== 130 || hex.slice(0, 2) !== '04') {
      throw new Error('Invalid uncompressed public key format');
    }
    // Extract X and Y coordinates.
    const x = hex.slice(2, 66); // next 64 hex chars (32 bytes)
    const y = hex.slice(66, 130); // final 64 hex chars
  
    // Determine parity of Y: if even, prefix is 02; if odd, prefix is 03.
    const yBigInt = BigInt('0x' + y);
    const prefix = yBigInt % 2n === 0n ? '02' : '03';
    return '0x' + prefix + x;
  }
  
  /**
   * Calculates the 2-char hex `v` ("00" or "01") that, when appended
   * to the signature (r + s), recovers the given compressed public key.
   *
   * @param {string} r - The hex string of r (without 0x prefix)
   * @param {string} s - The hex string of s (without 0x prefix)
   * @param {string} pubkey - The expected compressed public key (0x-prefixed)
   * @param {string} hash - The hex string of the transaction digest (0x-prefixed or not)
   * @returns {Promise<string>} - A promise that resolves to the 2-digit hex string for v ("00" or "01")
   * @throws {Error} - If no valid recovery id is found.
   */
  export async function calculateV(
    r: string,
    s: string,
    pubkey: string,
    hash: string
  ): Promise<string> {
    console.log('🔎 [calculateV] Starting...');
    console.log('🔎 [calculateV] r:', r);
    console.log('🔎 [calculateV] s:', s);
    console.log('🔎 [calculateV] pubkey:', pubkey);
    console.log('🔎 [calculateV] hash:', hash);
  
    // 1. Normalize inputs.
    const normalizedHash = hash.startsWith('0x') ? hash : `0x${hash}`;
    const normalizedPubkey = pubkey.startsWith('0x') ? pubkey : `0x${pubkey}`;
    console.log('🔎 [calculateV] normalizedHash:', normalizedHash);
    console.log('🔎 [calculateV] normalizedPubkey:', normalizedPubkey);
  
    // Remove "0x" prefixes from r and s for correct concatenation.
    const rNoPrefix = r.startsWith('0x') ? r.slice(2) : r;
    const sNoPrefix = s.startsWith('0x') ? s.slice(2) : s;
  
    // 2. Convert inputs to bytes (for logging).
    const hashBytes = hexToBytes(normalizedHash as `0x${string}`);
    const rPlusSBytes = hexToBytes(`0x${rNoPrefix}${sNoPrefix}`);
    console.log('🔎 [calculateV] hashBytes:', bytesToHex(hashBytes));
    console.log('🔎 [calculateV] rPlusSBytes:', bytesToHex(rPlusSBytes));
  
    // 3. Try recovery IDs 0 and 1 (raw ECDSA v).
    for (const parity of [0, 1]) {
      console.log(`🔎 [calculateV] Attempting v = ${parity}...`);
      // Format the recovery id as 2-digit hex.
      const vHexPart = parity.toString(16).padStart(2, '0');
      // Note: Use rNoPrefix and sNoPrefix here as well.
      const fullSig = `0x${rNoPrefix}${sNoPrefix}${vHexPart}`;
      console.log('🔎 [calculateV] fullSig:', fullSig);
  
      try {
        const recoveredUncompressed = await recoverPublicKey({
          hash: normalizedHash as `0x${string}`,
          signature: fullSig as `0x${string}`,
        });
        console.log(
          '🔎 [calculateV] recovered uncompressed pubkey:',
          recoveredUncompressed
        );
        // Compress the recovered public key to compare with the known compressed pubkey.
        const recoveredCompressed = compressPubkey(recoveredUncompressed);
        console.log(
          '🔎 [calculateV] recovered compressed pubkey:',
          recoveredCompressed,
          '(comparing to known pubkey).'
        );
  
        if (
          recoveredCompressed.toLowerCase() === normalizedPubkey.toLowerCase()
        ) {
          console.log(
            `✅ [calculateV] Found matching pubkey! Raw ECDSA v = ${parity}. Returning as 2-char hex.`
          );
          return vHexPart;
        } else {
          console.log(
            '❌ [calculateV] Compressed recovered pubkey did not match the known pubkey.'
          );
        }
      } catch (error: any) {
        console.error('❌ [calculateV] recoverPublicKey failed:', error.message);
      }
    }
  
    throw new Error('Unable to calculate v (no match for pubkey).');
  }
  
  export async function broadcastEVMTransaction(
    signedTx: string,
    rpcUrl: string
  ): Promise<string> {
    try {
      const transport = http(rpcUrl);
  
      const client = createPublicClient({
        transport,
      });
  
      // Ensure the signedTx is a valid hex string with '0x' prefix
      const normalizedTx = signedTx.startsWith('0x') ? signedTx : `0x${signedTx}`;
  
      const txHash = await client.sendRawTransaction({
        serializedTransaction: normalizedTx as `0x${string}`,
      });
  
      console.log(`✅ Transaction Broadcasted Successfully! TxHash: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error(`❌ Transaction Broadcast Failed:`, error);
      throw error;
    }
  }
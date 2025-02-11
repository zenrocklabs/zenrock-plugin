import { Content } from '@elizaos/core';
import { KeyType } from './treasury/zrchain/key';

export const extractNewMPCKeyParamsTemplate = `
# Instructions:
Analyze the user's message to extract the following parameters needed for requesting a new MPC key:

## Workspace Identification
- Identify the **workspace** using the pattern: 
  
  \`\`\`regex
  (workspace[\w\d]+)
  \`\`\`
  - Example matches: "workspace123", "workspaceABC".

## Key Identification
- The key will be associated with the specified workspace.
- Determine the **key type**:
  - **ECDSA** for Ethereum-compatible (EVM) chains.
  - **EdDSA** for Solana chains.

## Blockchain Context
- Check for keywords to determine the target blockchain:
  - **EVM chains** (Ethereum, Polygon, Arbitrum, etc.) → Use **ECDSA**.
  - **Solana** (or SOL) → Use **EdDSA**.

# JSON Response Format
Return only a JSON object with the following structure:
\`\`\`json
{
  "workspace": "workspace123",
  "keyType": "ECDSA" | "EdDSA",
}
\`\`\`

# Example 1:
User Message: "Generate me a new Ethereum key for workspace123 with data \"Hello, world!\"."
Response:
\`\`\`json
{
  "workspace": "workspace123",
  "keyType": "ECDSA",
}
\`\`\`
# Example 2:
User Message: "Generate me a new Solana key in workspaceABC with data \"Secure message\"."
Response:
\`\`\`json
{
  "workspace": "workspaceABC",
  "keyType": "EdDSA",
}
\`\`\`

# Example 3:
User Message: "Create a new SOL key for workspace456"
Response:
\`\`\`json
{
  "workspace": "workspace456",
  "keyType": "EdDSA",
}
\`\`\`
`;

export interface RequestMPCKeyContent extends Content {
  /**
   * The unique identifier of the workspace where the MPC key will be created.
   * Example: "workspace123"
   */
  workspace: string;

  /**
   * The type of key to be generated. Supported values:
   * - "ECDSA" for Ethereum-compatible (EVM) blockchains.
   * - "EdDSA" for Solana.
   */
  keyType: 'ECDSA' | 'EdDSA';
}

export function mapKeyType(keyType: 'ECDSA' | 'EdDSA'): KeyType {
  switch (keyType) {
    case 'ECDSA':
      return KeyType.KEY_TYPE_ECDSA_SECP256K1;
    case 'EdDSA':
      return KeyType.KEY_TYPE_EDDSA_ED25519;
    default:
      return KeyType.KEY_TYPE_UNSPECIFIED;
  }
}

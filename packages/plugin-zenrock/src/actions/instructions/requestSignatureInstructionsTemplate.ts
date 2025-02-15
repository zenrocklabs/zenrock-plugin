import { Content } from "@elizaos/core";

export const extractRequestSignatureParamsTemplate = `
Recent messages: {{recentMessages}}

# Instructions:
Analyze the user's messages to extract the following parameters needed to request an MPC signature for a hash:

## Hash Identification
- Extract the **hash** which is the precomputed transaction hash that needs to be signed.

## Sender Identification
- Extract the sender address (the "from" field).

# JSON Response Format
Return only a JSON object with the following structure:
\`\`\`json
{
  "hash": "0xabcdef1234567890",
  "from": "0xUserAddress"
}
\`\`\`

# Example:
User Message: "Sign this hash: 0xabcdef1234567890 from 0xUserAddress."
Response:
\`\`\`json
{
  "hash": "0xabcdef1234567890",
  "from": "0xUserAddress"
}
\`\`\`
`;

export interface RequestSignatureContent extends Content {
    hash: string;
    from: string;
}

export interface ResponseSignatureContent extends RequestSignatureContent {
    zenrockTx: string;
    signature: string;
    requestID: string;
}

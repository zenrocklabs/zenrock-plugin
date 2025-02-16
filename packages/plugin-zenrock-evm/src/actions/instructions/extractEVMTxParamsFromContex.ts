export const ERC20ContractAddresses = {
    ZenBTC: "0xB6EccAf5E3ae0A175c7F38B715167eFeF1981548",
};

export const extractEVMTxParamsFromContext = `
Recent messages: {{recentMessages}}

# Instructions:
Analyze the user's message to extract the following parameters needed to build an EVM transaction:

## Sender & Recipient
- Identify the sender’s Ethereum address (e.g., indicated by phrases like "send from my 0xAddress").
- Identify the recipient’s Ethereum address (which must start with "0x").

## Transfer Type & Amount
- Determine the type of transfer:
  - **Native Transfer:** if the transfer is in ETH.
  - **ERC20 Transfer:** if the transfer is for an ERC20 token.
- Extract the numeric transfer amount and the currency type (e.g., ETH, USDC, ZenBTC).

## Network
- Identify the target network. Valid values include: mainnet, holesky, sepolia, arbitrum, polygon.

## Contract Address (for ERC20)
- If the transfer is an ERC20 token transfer, set the "contractAddress" to the corresponding address from the list below. If the token is not supported, use an empty string.
  
The list of supported ERC20 tokens is:
${JSON.stringify(ERC20ContractAddresses, null, 2)}

# JSON Response Format
Return only a JSON object with exactly these keys (no additional text):
\`\`\`json
{
  "isNativeTransfer": true,
  "from": "0xSenderAddress",
  "to": "0xRecipientAddress",
  "value": 123.45,
  "network": "holesky",
  "contractAddress": "0xB6EccAf5E3ae0A175c7F38B715167eFeF1981548"
}
\`\`\`

# Notes:
- Set "isNativeTransfer" to true for ETH transfers; false for ERC20 transfers.
- For ERC20 transfers, use the contract address from the provided list; otherwise, set "contractAddress" to an empty string.
`;

export interface EVMTxParams {
    isNativeTransfer: boolean;
    from: string;
    to: string;
    value: number;
    network: string;
    contractAddress: string;
}

export const extractEVMTxParamsFromContex = `
# Instructions:
The user’s message must include:
  - A valid Ethereum address for the sender (e.g., indicated by phrases like 'send from my 0xAddress').
  - A valid Ethereum address for the recipient (starting with '0x').
  - The type of transfer: either a native ETH transfer or an ERC20 token transfer.
  - An amount in number format along with a currency type (e.g., ETH or USDC).
  - The network, which can be one of the following: mainnet, holesky, sepolia, arbitrum, polygon.

Based on this, extract and return a JSON object with the following fields:
  - "isNativeTransfer": true if the request is for a native ETH transfer, false if it’s an ERC20 token transfer.
  - "from": the user’s Ethereum address.
  - "to": the recipient’s Ethereum address.
  - "value": the numeric amount.
  - "network": the specified network.

Return only a valid JSON object with these keys and no additional text.
`;

export interface EVMTxParams {
  isNativeTransfer: boolean;
  from: string;
  to: string;
  value: number;
  network: string;
}

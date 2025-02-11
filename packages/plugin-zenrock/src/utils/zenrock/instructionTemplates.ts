export const ERC20ContractAddresses = {
  ZenBTC: "0xB6EccAf5E3ae0A175c7F38B715167eFeF1981548"
};

export const extractEVMTxParamsFromContex = `
# Instructions:
The user’s message must include:
  - A valid Ethereum address for the sender (e.g., indicated by phrases like 'send from my 0xAddress').
  - A valid Ethereum address for the recipient (starting with '0x').
  - The type of transfer: either a native ETH transfer or an ERC20 token transfer.
  - An amount in number format along with a currency type (e.g., ETH, USDC, or ZenBTC).
  - The network, which can be one of the following: mainnet, holesky, sepolia, arbitrum, polygon.

Based on this, extract and return a JSON object with the following fields:
  - "isNativeTransfer": true if the request is for a native ETH transfer, false if it’s an ERC20 token transfer.
  - "from": the user’s Ethereum address.
  - "to": the recipient’s Ethereum address.
  - "value": the numeric amount.
  - "network": the specified network.
  - "contractAddress": if the transfer is for a supported ERC20 token, set this to the corresponding address from the following list:
    ${JSON.stringify(ERC20ContractAddresses, null, 2)}
    Otherwise, set it to an empty string.

Return only a valid JSON object with these keys and no additional text.
`;

export interface EVMTxParams {
  isNativeTransfer: boolean;
  from: string;
  to: string;
  value: number;
  network: string;
  contractAddress: string;
} 
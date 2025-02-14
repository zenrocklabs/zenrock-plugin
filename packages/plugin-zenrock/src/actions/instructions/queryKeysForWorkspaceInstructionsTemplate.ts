import { Content } from "@elizaos/core";

export const extractQueryKeysForWorkspaceParamsTemplate = `
Recent Messages: {{recentMessages}}

# Instructions:
Given the recent messages, analyze the user's messages to extract the following parameter:

## Workspace Identification
- Identify the **workspace** using the pattern:
  \`\`\`regex
  (workspace[\\w\\d]+)
  \`\`\`
  - Example matches: "workspace123", "workspaceABC".

# JSON Response Format
Return only a JSON object with the following structure:
\`\`\`json
{
  "workspace": "workspace123"
}
\`\`\`

# Example:
User Message: "Show me all keys for workspace123."
Response:
\`\`\`json
{
  "workspace": "workspace123"
}
\`\`\`
`;

export interface QueryKeysForWorkspaceContent extends Content {
    /**
     * The unique identifier of the workspace for which keys should be queried.
     */
    workspace: string;
}

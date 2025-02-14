import { Content } from "@elizaos/core";

export const extractQueryUserWorkspaceTemplate = `
Recent messages: {{recentMessages}}

# Instructions:
Given the recent messages, analyze the user's message to extract the following parameters needed for querying a user's workspace:

## Workspace Identification
- Identify the **workspace** using the pattern: 
  
  \`\`\`regex
  (workspace1[a-fA-F0-9]{22})
  \`\`\`
  - Example matches: "workspace14a2hpadpsy9h4auve2z8lw", "workspace17ylwdm25ag42a87y2kn3y6".

# JSON Response Format
Return only a JSON object with the following structure:
\`\`\`json
{
  "workspace": "workspace14a2hpadpsy9h4auve2z8lw",
}
\`\`\`

# Example 1:
User Message: "Give me the owner details for workspace14a2hpadpsy9h4auve2z8lw"
Response:
\`\`\`json
{
  "workspace": "workspace14a2hpadpsy9h4auve2z8lw",
}
\`\`\`
# Example 2:
User Message: "Give me the key details for workspace17ylwdm25ag42a87y2kn3y6"
Response:
\`\`\`json
{
  "workspace": "workspace17ylwdm25ag42a87y2kn3y6",
\`\`\`

# Example 3:
User Message: "Give me the workspace details for workspace14a2hpadpsy9h4auve2z8lw"
Response:
\`\`\`json
{
  "workspace": "workspace14a2hpadpsy9h4auve2z8lw",
}
\`\`\`
`;

export interface QueryUserWorkspaceContent extends Content {
    /**
     * The unique identifier of the workspace where the MPC key will be created.
     * Example: "workspace14a2hpadpsy9h4auve2z8lw"
     */
    workspace: string;
}
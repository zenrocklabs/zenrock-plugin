import { Plugin, Action, Evaluator, Provider } from "@elizaos/core";
import { createWorkspaceAction } from "./actions/createWorkspaceAction";
import { queryUserWorkspacesAction } from "./actions/queryUserWorkspacesAction";
export const zenrockPlugin: Plugin = {
    name: "zenrock",
    description:
        "Zenrock plugin to generate dMPC keys, sign unsigned payloads and broadcast transaaction multi chain",
    actions: [createWorkspaceAction, queryUserWorkspacesAction],
    evaluators: [],
    providers: [],
    services: [],
};

import { Plugin, Action, Evaluator, Provider } from '@elizaos/core';
import { createWorkspaceAction } from './actions/zenrockActions/createWorkspaceAction';
import { requestMPCKeyAction } from './actions/zenrockActions/requestMPCKeyAction';
import { createWorkspaceEvaluator } from './evaluators/zenrockEvaluators/createWorkspaceEvaluator';
import { queryWorkspaceByOwnerProvider } from './providers/zenrockProviders/queryWorkspaceByOwnerProvider';

export const zenrockPlugin: Plugin = {
  name: 'zenrock',
  description:
    'Zenrock plugin to generate dMPC keys, sign unsigned payloads and broadcast transaaction multi chain',
  actions: [createWorkspaceAction, requestMPCKeyAction],
  evaluators: [createWorkspaceEvaluator],
  providers: [queryWorkspaceByOwnerProvider],
  services: [
    /* custom services */
  ],
};

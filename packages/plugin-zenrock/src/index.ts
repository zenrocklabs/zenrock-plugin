import { Plugin, Action, Evaluator, Provider } from '@elizaos/core';
import { createWorkspaceAction } from './actions/zenrockActions/createWorkspaceAction';
import { createWorkspaceEvaluator } from './evaluators/zenrockEvaluators/createWorkspaceEvaluator';

export const zenrockPlugin: Plugin = {
  name: 'zenrock',
  description:
    'Zenrock plugin to generate dMPC keys, sign unsigned payloads and broadcast transaaction multi chain',
  actions: [createWorkspaceAction],
  evaluators: [createWorkspaceEvaluator],
  providers: [],
  services: [
    /* custom services */
  ],
};

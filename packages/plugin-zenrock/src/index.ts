import { Plugin, Action, Evaluator, Provider } from '@elizaos/core';
import evmAccountInfoProvider from './providers/evmAccountInfoProvider';

export const zenrockPlugin: Plugin = {
  name: 'zenrock',
  description:
    'Zenrock plugin to generate dMPC keys, sign unsigned payloads and broadcast transaaction multi chain',
  actions: [
    /* custom actions */
  ],
  evaluators: [
    /* custom evaluators */
  ],
  providers: [evmAccountInfoProvider],
  services: [
    /* custom services */
  ],
};

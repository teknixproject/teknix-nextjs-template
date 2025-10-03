import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { TAction, TTriggerActions, TTriggerValue } from '@/types';

type TState = {
  actions: {
    [key: string]: TTriggerActions;
  };
  triggerName: {
    [key: string]: TTriggerValue;
  };

  formData: any;
  valueStream: any;
};
const initState: TState = { actions: {}, triggerName: {}, formData: null, valueStream: null };
export type TActionHookActions = {
  setTriggerName: (data: { triggerName: TTriggerValue; nodeId: string }) => void;
  addTriggerFull: (data: { triggerFull: TTriggerActions; nodeId: string }) => void;
  setMultipleActions: (data: {
    triggerName?: TTriggerValue;
    actions: TTriggerActions;
    nodeId: string;
  }) => Promise<void>;
  getFormData: () => any;
  findAction: ({ nodeId, actionId }: { nodeId: string; actionId: string }) => TAction | undefined;
  setFormData: (formData: any) => void;
  setValueStream: (valueStream: any) => void;
  findTriggerFullByNodeId: (nodeId: string) => TTriggerActions | undefined;
  reset: () => void;
};

export const actionHookSliceStore = create<TState & TActionHookActions>()(
  devtools(
    (set, get) => ({
      actions: {},
      triggerName: 'onClick',
      formData: null,

      setFormData: (formData) => {
        set({ formData }, false, 'actionHook/setFormData');
      },

      addTriggerFull: (data) => {
        set(
          (state) => ({
            ...state,
            actions: { [data.nodeId]: data.triggerFull },
          }),
          false,
          'actionHook/addTriggerFull'
        );
      },
      setMultipleActions({ actions, triggerName, nodeId }) {
        set(
          (state) => ({
            ...state,
            actions: { ...state.actions, [nodeId]: actions },
            triggerName: { ...state.triggerName, [nodeId]: triggerName! },
          }),
          false,
          'actionHook/setMultipleActions'
        );
      },
      setTriggerName({ triggerName, nodeId }) {
        set((state) => ({
          ...state,
          triggerName: { ...state.triggerName, [nodeId]: triggerName },
        }));
      },
      setValueStream: (valueStream) => {
        set({ valueStream }, false, 'actionHook/setvalueStream');
      },
      findAction: ({ nodeId, actionId }) => {
        const triggerFull = get().actions[nodeId];
        const triggerName = get().triggerName[nodeId];

        const action = triggerFull?.[triggerName]?.data?.[actionId];
        return action || undefined;
      },

      getFormData: () => {
        const data = get().formData;
        return data;
      },
      findTriggerFullByNodeId(nodeId) {
        return get().actions?.[nodeId];
      },

      reset: () => {
        set(
          {
            ...initState,
          },
          false,
          'actionHook/reset'
        );
      },
    }),
    {
      name: 'actionHookSliceStore', // Hiện tên trong Redux DevTools
    }
  )
);

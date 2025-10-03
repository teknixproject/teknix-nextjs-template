'use client';
import { stateManagementStore } from '@/stores';
import { customFunctionStore } from '@/stores/customFunction';
import { TAction, TActionCustomFunction, TTypeSelect } from '@/types';

import { handleCustomFunction as handleFunction } from './handleCustomFunction';
import { TActionsProps } from './useActionsV2';
import { getOldOutput } from './useApiCallAction';
import { THandleDataParams, useHandleData } from './useHandleData';

export type TUseActions = {
  handleCustomFunction: (
    action: TAction<TActionCustomFunction>,
    params?: THandleDataParams
  ) => Promise<void>;
};

export const useCustomFunction = (props: TActionsProps): TUseActions => {
  const updateVariables = stateManagementStore((state) => state.updateVariables);
  const findVariable = stateManagementStore((state) => state.findVariable);
  const { getData } = useHandleData({ ...props });
  const findCustomFunction = customFunctionStore((state) => state.findCustomFunction);
  const handleCustomFunction = async (
    action: TAction<TActionCustomFunction>,
    params?: THandleDataParams
  ): Promise<void> => {
    try {
      const { customFunctionId, output } = action?.data || {};
      if (customFunctionId) {
        const result = await handleFunction({
          data: action?.data as TActionCustomFunction,
          findCustomFunction,
          getData,
          params,
        });
        const typeStore = (output?.type || 'appState') as TTypeSelect;
        const outputVariable = findVariable({
          type: typeStore,
          id: getOldOutput(output as any),
        });
        if (!outputVariable) return;
        updateVariables({
          type: typeStore,
          dataUpdate: {
            ...outputVariable,
            value: result,
          },
        });
      }
    } catch (error) {
      throw error;
    }
  };
  //#endregion

  return { handleCustomFunction };
};

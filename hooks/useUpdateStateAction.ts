import _ from 'lodash';

import { stateManagementStore } from '@/stores';
import { TAction, TActionUpdateState, TTypeSelectState } from '@/types';

import { TActionsProps } from './useActionsV2';
import { THandleDataParams, useHandleData } from './useHandleData';

export type TUseActions = {
  handleUpdateStateAction: (
    action: TAction<TActionUpdateState>,
    params?: THandleDataParams
  ) => Promise<void>;
};

export const useUpdateStateAction = (props: TActionsProps): TUseActions => {
  // State management

  // Store hooks
  const { getData } = useHandleData(props);
  const { findVariable, updateVariables } = stateManagementStore();

  //#region Action Handlers

  const handleUpdateStateAction = async (
    action: TAction<TActionUpdateState>,
    params?: THandleDataParams
  ): Promise<void> => {
    const updates = action?.data?.update;

    if (_.isEmpty(updates)) return;

    for (const item of updates || []) {
      const { firstState, secondState } = item;
      const type = item?.firstState?.type;
      if (!firstState || !secondState || !firstState[type]) continue;
      const variableFirst = findVariable({
        type: type as TTypeSelectState,
        id: (item.firstState[type] as any).variableId || '',
      });

      const variableSecond = await getData(item.secondState, params);

      if (!variableFirst) return;

      variableFirst.value = variableSecond;

      updateVariables({
        type: type as TTypeSelectState,
        dataUpdate: variableFirst,
      });
    }
  };

  return { handleUpdateStateAction };
};

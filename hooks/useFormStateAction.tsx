import _ from 'lodash';

import { TAction, TActionFormState } from '@/types';

import { TActionsProps } from './useActionsV2';
import { THandleDataParams, useHandleData } from './useHandleData';

export type TUseActions = {
  handleFormState: (action: TAction<TActionFormState>, params?: THandleDataParams) => Promise<void>;
};

export const useFormStateAction = (props: TActionsProps): TUseActions => {
  const { getData } = useHandleData(props);

  const handleUpdate = async (
    action: TAction<TActionFormState>,
    params?: THandleDataParams
  ): Promise<void> => {
    const { methods } = props;
    if (!methods) return;
    const { setValue } = methods;
    const updates = action?.data?.update;

    if (_.isEmpty(updates)) return;

    for (const item of updates || []) {
      try {
        if (_.isEmpty(item)) continue;
        const name = item?.name;
        const value = item?.value;
        if (!name) continue;
        const valueState = await getData(value, params);

        setValue(name, valueState);
      } catch (error) {
        console.error('Error in handleUpdate:', error);
        continue;
      }
    }
  };
  const handleUsregister = async (
    action: TAction<TActionFormState>,
    params?: THandleDataParams
  ): Promise<void> => {
    const { methods } = props;
    if (!methods) return;
    const { unregister } = methods;
    const unregisters = action?.data?.unregister;
    for (const item of unregisters || []) {
      const { name } = item;
      if (!name) continue;
      unregister(name);
    }
  };
  const handleReset = async (
    action: TAction<TActionFormState>,
    params?: THandleDataParams
  ): Promise<void> => {
    const { methods } = props;
    if (!methods) return;
    const { reset } = methods;
    const resetValue = await getData(action?.data?.reset?.value, params);
    reset(resetValue);
  };
  const handleFormState = async (action: TAction<TActionFormState>, params?: THandleDataParams) => {
    const option = action?.data?.option;
    switch (option) {
      case 'update':
        await handleUpdate(action, params);
        break;

      case 'unregister':
        await handleUsregister(action, params);
        break;
      case 'reset':
        await handleReset(action, params);
        break;
    }
  };

  return { handleFormState };
};

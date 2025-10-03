/* eslint-disable react-hooks/exhaustive-deps */
import _ from 'lodash';
import { useCallback } from 'react';
import { FieldValues, UseFieldArrayReturn, UseFormReturn } from 'react-hook-form';

import {
    ACTION_FC_TYPE, ACTION_TYPE, TAction, TActionApiCall, TActionCustomFunction, TActionFormState,
    TActionLoop, TActionMessage, TActionNavigate, TActionUpdateState, TConditional,
    TConditionChildMap, TTriggerActions, TTriggerActionValue, TTriggerValue
} from '@/types';
import { GridItem } from '@/types/gridItem';
import { getPropActions } from '@/utils';
import { transformVariable } from '@/utils/tranformVariable';

import { actionHookSliceStore } from './store/actionSliceStore';
import { useApiCallAction } from './useApiCallAction';
import { useConditionChildAction } from './useConditionChildAction';
import { useCustomFunction } from './useCustomFunction';
import { useFormStateAction } from './useFormStateAction';
import { THandleDataParams } from './useHandleData';
import { useLoopActions } from './useLoopActions';
import { useMessageAction } from './useMessageAction';
import { useNavigateAction } from './useNavigateAction';
import { useUpdateStateAction } from './useUpdateStateAction';

export type TUseActions = {
  handleAction: (
    triggerType: TTriggerValue,
    action?: TTriggerActionValue,
    params?: THandleDataParams
  ) => Promise<void>;
  executeTriggerActions: (
    triggerActions: TTriggerActions,
    triggerType: TTriggerValue,
    params?: THandleDataParams
  ) => Promise<void>;
  executeActionFCType: (action?: TAction) => Promise<void>;
};

export type TActionsProps = {
  data?: GridItem;
  valueStream: any;
  methods?: UseFormReturn<FieldValues, any, FieldValues>;
  methodsArray?: UseFieldArrayReturn<FieldValues, string, 'id'>;
  isCallPageLoad?: boolean;
};

export const useActionsV2 = (props: TActionsProps): TUseActions => {
  const { data } = props;

  const setMultipleActions = actionHookSliceStore((state) => state.setMultipleActions);
  const setTriggerName = actionHookSliceStore((state) => state.setTriggerName);
  const findTriggerFullByNodeId = actionHookSliceStore((state) => state.findTriggerFullByNodeId);
  const findAction = actionHookSliceStore((state) => state.findAction);
  const { handleApiCallAction } = useApiCallAction(props);
  const { executeConditionalChild } = useConditionChildAction(props);
  const { handleUpdateStateAction } = useUpdateStateAction(props);
  const { handleCustomFunction } = useCustomFunction(props);
  const { handleFormState } = useFormStateAction(props);
  const { handleNavigateAction } = useNavigateAction(props);
  const { executeLoopOverList } = useLoopActions(props);
  const { handleMessageAction } = useMessageAction(props);

  const executeConditional = async (action: TAction<TConditional>, params?: THandleDataParams) => {
    const conditions = action?.data?.conditions as string[];
    if (_.isEmpty(conditions)) return;
    for (const conditionId of conditions) {
      const condition = findAction({
        nodeId: data?.id as string,
        actionId: conditionId,
      }) as TAction<TConditionChildMap>;

      if (condition) {
        const isConditionMet = await executeActionFCType(condition, params);

        if (isConditionMet) return;
      }
    }
  };
  const executeActionFCType = async (
    action?: TAction,
    params?: THandleDataParams
  ): Promise<any> => {
    if (!action?.fcType) return;
    let valueReturnCondition = null;
    switch (action.fcType) {
      case ACTION_FC_TYPE.ACTION:
        await executeAction(action as TAction<TActionApiCall>, params);
        break;
      case ACTION_FC_TYPE.CONDITIONAL:
        await executeConditional(action as TAction<TConditional>, params);
        break;
      case ACTION_FC_TYPE.CONDITIONAL_CHILD:
        const isReturnValue = (action?.data as TConditionChildMap)?.isReturnValue;
        const conditionChildData = action?.data as TConditionChildMap;
        if ((action.data as TConditionChildMap).label === 'else') {
          if (isReturnValue) return transformVariable(conditionChildData.valueReturn!);
          valueReturnCondition = false;
          break;
        }
        const isMatch = await executeConditionalChild(
          action as TAction<TConditionChildMap>,
          params
        );
        //if or else if
        if (isReturnValue && isMatch) {
          return transformVariable(conditionChildData.valueReturn!);
        }
        if (!isMatch) return; //prevent call next action
        valueReturnCondition = true;
        break;
      case ACTION_FC_TYPE.LOOP:
        await executeLoopOverList(action as TAction<TActionLoop>, params);
        break;

      default:
        console.error(`Unknown fcType: ${action.fcType}`);
    }
    if (action.next) {
      const nextAction = findAction({ nodeId: data?.id as string, actionId: action.next });
      await executeActionFCType(nextAction, params);
    }
    return valueReturnCondition;
  };

  const executeAction = async (action: TAction, params?: THandleDataParams): Promise<void> => {
    if (!action) return;
    if (!action.type) return;

    try {
      switch (action.type) {
        case ACTION_TYPE.NAVIGATE:
          return await handleNavigateAction(action as TAction<TActionNavigate>, params);
        case ACTION_TYPE.API_CALL:
          return await handleApiCallAction(action as TAction<TActionApiCall>, params);
        case ACTION_TYPE.UPDATE_STATE_MANAGEMENT:
          return await handleUpdateStateAction(action as TAction<TActionUpdateState>, params);
        case ACTION_TYPE.CUSTOM_FUNCTION:
          return await handleCustomFunction(action as TAction<TActionCustomFunction>, params);
        case ACTION_TYPE.FORM_STATE:
          return await handleFormState(action as TAction<TActionFormState>, params);
        case ACTION_TYPE.MESSAGE:
          return await handleMessageAction(action as TAction<TActionMessage>, params);
        default:
          console.error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
    }
  };

  const executeTriggerActions = async (
    triggerActions: TTriggerActions,
    triggerType: TTriggerValue,
    params?: THandleDataParams
  ): Promise<void> => {
    const triggerValues = triggerActions;
    const actionsToExecute = triggerValues[triggerType]?.data;

    if (!actionsToExecute) return;

    // Find and execute the root action (parentId === null)
    const rootAction = Object.values(actionsToExecute).find(
      (action) => !action.parentId && action.id
    );

    if (rootAction) {
      await executeActionFCType(rootAction, params);
    }
  };

  // useDeepCompareEffect(() => {
  //   const triggerFull = getPropActions(data!);
  //   if (_.isEmpty(triggerFull)) return;
  //   setMultipleActions({
  //     actions: triggerFull,
  //     triggerName: '',
  //     nodeId: data?.id as string,
  //   });
  // }, [data?.actions, data?.componentProps?.dataProps, data?.componentProps?.actions]);

  const handleAction = useCallback(
    async (
      triggerType: TTriggerValue,
      action?: TTriggerActionValue,
      params?: THandleDataParams
    ): Promise<void> => {
      try {
        const triggerFull = getPropActions(data!);
        if (_.isEmpty(triggerFull)) return;
        setMultipleActions({
          actions: triggerFull,
          triggerName: triggerType,
          nodeId: data?.id as string,
        });
        await executeTriggerActions(triggerFull, triggerType, params);
      } finally {
      }
    },
    [
      data?.actions,
      data?.componentProps?.dataProps,
      data?.componentProps?.actions,
      executeTriggerActions,
    ]
  );

  return { handleAction, executeTriggerActions, executeActionFCType };
};

import { findRootConditionChild, handleCompareCondition } from '@/hooks/useConditionAction';
import { THandleDataParams } from '@/hooks/useHandleData';
import { TAction, TConditionChildMap, TData } from '@/types';

import { TConditional, TTriggerActions } from '../types/actions';
import { transformVariable } from './tranformVariable';

const findAction = (actionId: string, triggerFull: TTriggerActions): TAction<unknown> => {
  const onClick = triggerFull.onClick?.data || {};
  return onClick[actionId];
};

const processCondition = async (
  conditionId: string,
  triggerFull: TTriggerActions,
  getData: (value: any) => any
): Promise<boolean> => {
  const conditionChild = findAction(conditionId, triggerFull) as TAction<TConditionChildMap>;

  if (!conditionChild?.data) {
    console.warn(`Condition data not found: ${conditionId}`);
    return false;
  }

  const rootCondition = findRootConditionChild(conditionChild.data);

  if (!rootCondition?.id) {
    console.warn(`Root condition not found: ${conditionId}`);
    return false;
  }

  return await handleCompareCondition(rootCondition.id, conditionChild.data, getData);
};

const extractReturnValue = (condition: TAction<TConditionChildMap>): any => {
  if (!condition.data?.isReturnValue) return null;

  const value = condition.data.valueReturn;
  return value ? transformVariable(value) : null;
};

const isElseCondition = (condition: TAction<TConditionChildMap>): boolean => {
  return condition.data?.label === 'else';
};

export const executeConditionalInData = async (
  triggerFull: TTriggerActions,
  getData: (data: TData, params?: THandleDataParams) => any
): Promise<void> => {
  const dataCondition = {
    ...((triggerFull as any).onClick || {}),
    ...(triggerFull.onClick?.data || {}),
  };
  const conditionAction = Object.values(dataCondition).find(
    (item) => (item as unknown as TAction).fcType === 'conditional'
  ) as TAction<TConditional>;

  if (!conditionAction) {
    console.warn('No conditional action found');
    return;
  }

  const conditions = conditionAction.data?.conditions || [];

  if (conditions.length === 0) {
    console.warn('No conditions found in conditional action');
    return;
  }

  let elseCondition: TAction<TConditionChildMap> | null = null;

  // Process conditions in order
  for (const conditionId of conditions) {
    try {
      const condition = findAction(conditionId, triggerFull) as TAction<TConditionChildMap>;

      if (!condition) {
        console.warn(`Condition not found: ${conditionId}`);
        continue;
      }

      // Store else condition for later processing
      if (isElseCondition(condition)) {
        elseCondition = condition;
        continue;
      }

      // Check if condition is met
      const isConditionMet = await processCondition(conditionId, triggerFull, getData);

      if (isConditionMet) {
        return extractReturnValue(condition);
      }
    } catch (error) {
      console.error(`Error processing condition ${conditionId}:`, error);
      // Continue with next condition
    }
  }

  // If no conditions were met, process else condition
  if (elseCondition) {
    return extractReturnValue(elseCondition);
  }

  return;
};

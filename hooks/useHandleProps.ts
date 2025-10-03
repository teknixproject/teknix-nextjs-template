import dayjs from 'dayjs';
import _, { isEqual } from 'lodash';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useDeepCompareEffect, useDeepCompareMemo } from 'use-deep-compare';

import { stateManagementStore } from '@/stores';
import { TData } from '@/types';
import { isTData } from '@/utils/transfromProp';

import { TUseHandleData, useHandleData } from './useHandleData';

const ignoreFieldsListen = [
  // 'children',
  'box',
  'renderItem',
  'column',
  // 'items',
  // 'childs',
  'dataProps',
  'actions',
];
function extractVariableIdsWithLodash(obj: any): string[] {
  const variableIds: string[] = [];

  function collectVariableIds(value: any, key: string) {
    if (key === 'variableId' && typeof value === 'string') {
      variableIds.push(value);
    }
  }

  function deepIterate(obj: any) {
    _.forOwn(obj, (value, key) => {
      // if (ignoreFieldsListen.includes(key)) return;
      collectVariableIds(value, key);

      if (_.isObject(value) && !ignoreFieldsListen.includes(key)) {
        deepIterate(value);
      }
    });

    if (_.isArray(obj)) {
      obj.forEach((item) => {
        if (_.isObject(item)) {
          deepIterate(item);
        }
      });
    }
  }

  deepIterate(obj);

  return _.uniq(variableIds);
}
export const useHandleProps = (props: TUseHandleData) => {
  const [dataState, setDataState] = useState<any>();
  const variableids = useMemo(() => extractVariableIdsWithLodash(props.activeData), []);
  const { getData } = useHandleData(props);
  // FIX: Use deep comparison for props to prevent unnecessary re-runs
  const stableProps = useDeepCompareMemo(
    () => ({
      dataProp: props?.dataProp,
      componentProps: props?.componentProps,
      valueStream: props?.valueStream,
      valueType: props?.valueType,
    }),
    [props?.dataProp, props?.componentProps, props?.valueStream, props?.valueType]
  );
  // Process data state - FIX: Remove getData from dependencies, use stable props
  const processDataState = useCallback(async () => {
    try {
      const newDataState: any = {};

      if (stableProps.dataProp?.length) {
        const dataPromises = stableProps.dataProp.map((item: any) => {
          const value = getData(item.data, {
            valueStream: stableProps.valueStream,
          });
          return { name: item.name, value };
        });

        const resolvedData = await Promise.all(dataPromises);
        resolvedData.forEach(({ name, value }) => {
          newDataState[name] = value;
        });
      }

      if (stableProps.componentProps) {
        const componentPromises = Object.entries(stableProps.componentProps).map(
          async ([key, value]) => {
            if (isTData(value)) {
              const data = {
                type: value.type,
                [value.type]: value[value.type],
              } as TData;

              let valueConvert = await getData(data, {
                valueStream: stableProps.valueStream,
              });

              if (stableProps.valueType?.toLowerCase() === 'datepicker') {
                if (key === 'value' || key === 'defaultValue') {
                  valueConvert = valueConvert ? dayjs(valueConvert) : dayjs();
                }
              }
              return { key, value: valueConvert };
            }
            return { key, value };
          }
        );

        const resolvedComponents = await Promise.all(componentPromises);
        resolvedComponents.forEach(({ key, value }) => {
          newDataState[key] = value;
        });
      }

      setDataState((prevState: any) => {
        if (_.isEqual(prevState, newDataState)) {
          // console.log('Data state unchanged, skipping update');
          return prevState;
        }
        return newDataState;
      });
    } catch (error) {
      console.error('Error processing data state:', error);
    }
  }, [
    getData,
    stableProps.componentProps,
    stableProps.dataProp,
    stableProps.valueStream,
    stableProps.valueType,
  ]); // FIX: Only depend on stable props

  // FIX: Only run once on mount and when stableProps change significantly
  const hasInitialized = useRef(false);
  useDeepCompareEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      processDataState();
    }
  }, []);

  // // FIX: Run when stable props actually change
  // useDeepCompareEffect(() => {
  //   if (hasInitialized.current) {
  //     processDataState();
  //   }
  // }, [processDataState]);

  // Subscribe to state changes - FIX: Prevent multiple subscriptions
  useDeepCompareEffect(() => {
    if (!variableids.length) {
      return;
    }

    const unsub = stateManagementStore.subscribe(
      (state) => [
        ...Object.values(state.apiResponse || {}).filter(
          (item) => item.id && variableids.includes(item.id)
        ),
        ...Object.values(state.componentState || {}).filter(
          (item) => item.id && variableids.includes(item.id)
        ),
        ...Object.values(state.globalState || {}).filter(
          (item) => item.id && variableids.includes(item.id)
        ),
        ...Object.values(state.appState || {}).filter(
          (item) => item.id && variableids.includes(item.id)
        ),
      ],
      (value, prev) => {
        if (isEqual(value, prev)) {
          return;
        }

        processDataState();
      }
    );

    return () => {
      unsub();
    };
  }, [processDataState, variableids]);

  return {
    dataState,
  };
};

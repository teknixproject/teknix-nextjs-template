import _ from 'lodash';

import { TUseActions } from '@/hooks/useActionsV2';
import { THandleDataParams } from '@/hooks/useHandleData';
import { TTriggerActions, TTriggerActionValue } from '@/types';
import { GridItem } from '@/types/gridItem';

const standardize = (actions: Record<string, TTriggerActionValue>) => {
  return Object.fromEntries(
    Object.entries(actions).map(([key, value]) => [
      key,
      {
        ...value,
        data: value.data?.onClick ? (value.data as any).onClick : value.data,
      },
    ])
  );
};
const standardizeActionsLevel1 = (actions: Record<string, TTriggerActionValue>) => {
  return Object.fromEntries(
    Object.entries(actions).map(([key, value]) => [
      key,
      {
        data: value,
      },
    ])
  );
};
export const getPropActions = (data: GridItem): TTriggerActions => {
  const dataProps: TTriggerActions = data?.componentProps?.dataProps
    ?.filter((item: TTriggerActionValue & { type: string }) =>
      item.type.includes('MouseEventHandler')
    )
    .reduce(
      (acc: TTriggerActionValue, item: TTriggerActionValue) => ({
        ...acc,
        [item.name]: {
          ...item,
          data: item.data?.onClick ? (item.data as any).onClick : item.data,
        },
      }),
      {}
    );

  const actions = standardizeActionsLevel1(
    _.get(data, 'actions', {}) as Record<string, TTriggerActionValue>
  );
  //   console.log('🚀 ~ getPropActions ~ actions:', actions);
  const componentPropsActions = _.get(data, 'componentProps.actions', {});
  //   console.log('🚀 ~ getPropActions ~ componentPropsActions:', componentPropsActions);
  const result = _.pickBy(
    {
      ...dataProps,
      ...actions,
      ...componentPropsActions,
    },
    (value) => value?.data && Object.keys(value.data).length > 0
  );

  return result;
};
// export const prepareActions = ({
//   data,
//   handleAction,
//   props,
//   setLoading,
// }: {
//   data: GridItem;
//   handleAction: TUseActions['handleAction'];
//   props: THandleDataParams;
//   setLoading?: React.Dispatch<React.SetStateAction<boolean>>;
// }) => {
//   const actions = getPropActions(data);

//   return Object.fromEntries(
//     Object.entries(actions).map(([key, value]) => {
//       const normalizedKey = key.replace(/-/g, '.');
//       return [
//         normalizedKey,
//         async (...callbackArgs: any[]) => {
//           try {
//             setLoading?.(true);
//             await handleAction(key, undefined, {
//               callbackArgs,
//               valueStream: props.valueStream,
//             });
//           } catch (error) {
//             console.error(`Error in action ${data?.id} - ${key}:`, error);
//           } finally {
//             setLoading?.(false);
//           }
//         },
//       ];
//     })
//   );
// };

export const prepareActions = ({
  data,
  handleAction,
  props,
  setLoading,
}: {
  data: GridItem;
  handleAction: TUseActions['handleAction'];
  props: THandleDataParams;
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const actions = getPropActions(data);

  const result: Record<string, any> = {};

  for (const [key] of Object.entries(actions)) {
    // convert a-b → a.b
    const path = key.replace(/-/g, '.');
    const fn = async (...callbackArgs: any[]) => {
      try {
        setLoading?.(true);
        await handleAction(key, undefined, {
          callbackArgs,
          valueStream: props.valueStream,
        });
      } catch (error) {
        console.error(`Error in action ${data?.id} - ${key}:`, error);
      } finally {
        setLoading?.(false);
      }
    };

    // dùng lodash.set để gán fn vào path
    _.set(result, path, fn);
  }
  if (data?.value?.toLowerCase() === 'list') console.log('🚀 ~ prepareActions ~ result:', result);

  return result;
};

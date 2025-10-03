'use client';
/** @jsxImportSource @emotion/react */
import _, { isEqual } from 'lodash';
import { FC, memo, useMemo, useState } from 'react';
import { useDeepCompareMemo } from 'use-deep-compare';

import { useActionsV2 } from '@/hooks/useActionsV2';
import { useRenderItem } from '@/hooks/useRenderItem';
import { GridItem } from '@/types/gridItem';
import { getPropActions, prepareActions } from '@/utils';
import { useQuery } from '@tanstack/react-query';

import { componentRegistry } from './ListComponent';
import RenderComponent from './RenderComponent';
import RenderForm from './RenderForm';

export type TProps = {
  data: GridItem;
  valueStream?: any;
  formKeys?: {
    key: string;
    value: string;
    isList: boolean;
    formKeys?: TProps['formKeys'];
  }[];
  formKeysArray?: TProps['formKeys'];
  index?: number;
  parentPath?: string;
};

const RenderSliceItem: FC<TProps> = (props) => {
  const { data } = props;
  const valueType = useMemo(() => data?.value?.toLowerCase() || '', [data?.value]);
  const [loading, setLoading] = useState<boolean>(false);

  //registy a component
  const Component = useMemo(
    () => (valueType ? _.get(componentRegistry, valueType) || 'div' : 'div'),
    [valueType]
  );

  //handle hooks
  const { propsCpn: propsCpnHook } = useRenderItem(props);

  //handle actions
  const { handleAction } = useActionsV2({ data, valueStream: props.valueStream });

  const checkOnPageLoad = useDeepCompareMemo(() => {
    const actions = getPropActions(data);
    return 'onPageLoad' in actions;
  }, [data?.actions, data?.componentProps?.dataProps, data?.componentProps?.actions]);

  //prepare actions
  const events = useMemo(() => {
    return prepareActions({ data, handleAction, props, setLoading });
  }, [setLoading]);

  //handle page load for actions
  const { isLoading } = useQuery({
    queryKey: ['onPageLoad', data?.id],
    queryFn: async () => (await events?.onPageLoad?.()) || {},
    enabled: checkOnPageLoad,
  });

  const propsCpn = useDeepCompareMemo(() => {
    return _.merge(
      {},
      propsCpnHook,
      events,
      ['list', 'table'].includes(valueType) && { loading: loading || isLoading }
    );
  }, [propsCpnHook, events, loading, isLoading]);

  if (valueType === 'form') return <RenderForm {...props} />;

  if (valueType === 'container' && propsCpn && 'mount' in propsCpn && !propsCpn.mount) {
    return null;
  }

  return (
    <RenderComponent Component={Component} propsCpn={propsCpn} data={data}>
      {data?.childs?.map((child, index) => (
        <RenderSliceItem {...props} data={child} key={child.id ? String(child.id) : index} />
      ))}
    </RenderComponent>
  );
};

export default memo(RenderSliceItem, isEqual);

'use client';
/** @jsxImportSource @emotion/react */
import { List } from 'antd';
import _ from 'lodash';
import { FC, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useDeepCompareMemo } from 'use-deep-compare';

import { useActionsV2 } from '@/hooks/useActionsV2';
import { useRenderItem } from '@/hooks/useRenderItem';
import { getPropActions, prepareActions } from '@/utils';
import { useQuery } from '@tanstack/react-query';

import RenderFormItem from './RenderFormItem';
import { TProps } from './RenderSliceItem';

const RenderFormArrayItem: FC<TProps> = (props) => {
  const { data, formKeys, valueStream, parentPath = '' } = props;
  const inFormKeys = formKeys?.find((item) => item?.value === data?.name);
  // The field name for this array
  const arrayFieldName = parentPath ? `${parentPath}.${inFormKeys?.key}` : inFormKeys?.key || '';
  const [loading, setLoading] = useState<boolean>(false);
  //#region hooks
  const methods = useFormContext();

  const methodsArray = useFieldArray({
    control: methods.control,
    name: arrayFieldName,
  });

  const { valueType, propsCpn } = useRenderItem({
    ...props,
    data,
    valueStream,
    methods,
    methodsArray,
  });

  //handle actions
  const { handleAction } = useActionsV2({
    data,
    valueStream: props.valueStream,
    methods,
    methodsArray,
  });

  const checkOnPageLoad = useDeepCompareMemo(() => {
    const actions = getPropActions(data);
    return 'onPageLoad' in actions;
  }, [data]);

  //prepare actions
  const events = useDeepCompareMemo(() => {
    return prepareActions({ data, handleAction, props, setLoading });
  }, [data?.actions, data?.componentProps?.dataProps, data?.componentProps?.actions, setLoading]);

  //handle page load for actions
  const { isLoading } = useQuery({
    queryKey: ['onPageLoad', data?.id],
    queryFn: async () => (await events?.onPageLoad?.()) || {},
    enabled: checkOnPageLoad,
  });

  const rest = useDeepCompareMemo(() => {
    const { name, ...r } = _.merge(
      {},
      propsCpn,
      events,
      ['table', 'list'].includes(valueType) && { loading: isLoading || loading }
    );
    return r;
  }, [propsCpn, events, isLoading, loading, valueType]);
  //#endregion

  if (valueType === 'container' && propsCpn && 'mount' in propsCpn && !propsCpn.mount) {
    return null;
  }

  if (valueType !== 'list') return null;

  return (
    <List
      {...rest}
      dataSource={methodsArray.fields}
      renderItem={(item: any, index: number) => (
        <List.Item key={item.id}>
          <RenderFormItem
            data={propsCpn?.box}
            valueStream={item}
            formKeysArray={inFormKeys?.formKeys}
            index={index}
            parentPath={arrayFieldName}
            formKeys={formKeys}
          />
        </List.Item>
      )}
    />
  );
};
export default RenderFormArrayItem;

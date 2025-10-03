'use client';
import { Form, Spin } from 'antd';
import _, { isEqual } from 'lodash';
/** @jsxImportSource @emotion/react */
import { FC, memo, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useDeepCompareEffect, useDeepCompareMemo } from 'use-deep-compare';

import { useActionsV2 } from '@/hooks/useActionsV2';
import { useRenderItem } from '@/hooks/useRenderItem';
import { getPropActions, prepareActions } from '@/utils';
import { useQuery } from '@tanstack/react-query';

import RenderFormItem from './RenderFormItem';
import { TProps } from './RenderSliceItem';

const RenderForm: FC<TProps> = (props) => {
  const { data } = props;
  const methods = useForm({});
  const [loading, setLoading] = useState<boolean>(false);

  const { handleAction } = useActionsV2({ data, valueStream: props.valueStream, methods });

  const { propsCpn } = useRenderItem({
    ...props,
    methods,
  });

  useDeepCompareEffect(() => {
    if (!_.isEmpty(propsCpn?.values)) methods.reset(propsCpn?.values);
  }, [propsCpn?.values]);

  const { handleSubmit } = methods;
  const formKeys = useMemo(() => data?.componentProps?.formKeys, [data?.componentProps?.formKeys]);

  const checkOnPageLoad = useDeepCompareMemo(() => {
    const actions = getPropActions(data);
    return 'onPageLoad' in actions;
  }, [data.actions, data.componentProps.dataProps, data.componentProps.actions]);

  //prepare actions
  const events = useDeepCompareMemo(() => {
    return prepareActions({ data, handleAction, props, setLoading });
  }, [data, setLoading]);

  //handle page load for actions
  const { isLoading } = useQuery({
    queryKey: ['onPageLoad', data?.id],
    queryFn: async () => (await events?.onPageLoad?.()) || {},
    enabled: checkOnPageLoad,
  });

  const onSubmit = () => {
    rest?.onFinish();
  };

  const rest = useDeepCompareMemo(() => {
    const { name, ...r } = _.merge({}, propsCpn, events);
    return r;
  }, [propsCpn, events]);

  return (
    <Spin
      wrapperClassName="!w-full !h-full"
      rootClassName="!w-full !h-full"
      spinning={loading || isLoading}
    >
      <FormProvider {...methods}>
        <Form {...rest} onFinish={() => handleSubmit(onSubmit)()}>
          {data?.childs?.map((child, index) => (
            <RenderFormItem
              {...props}
              data={child}
              key={`form-child-${child.id}`}
              formKeys={formKeys}
            />
          ))}
        </Form>
      </FormProvider>
    </Spin>
  );
};
export default memo(RenderForm, isEqual);

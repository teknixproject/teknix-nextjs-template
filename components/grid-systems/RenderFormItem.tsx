'use client';
/** @jsxImportSource @emotion/react */
import { Checkbox, DatePicker, Switch, Upload, UploadFile } from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';
import { FC, useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useDeepCompareMemo } from 'use-deep-compare';

import { useActionsV2 } from '@/hooks/useActionsV2';
import { useRenderItem } from '@/hooks/useRenderItem';
import { getPropActions, prepareActions } from '@/utils';
import { getComponentType } from '@/utils/component';
import { useQuery } from '@tanstack/react-query';

import { componentRegistry } from './ListComponent';
import RenderComponent from './RenderComponent';
import RenderFormArrayItem from './RenderFormArray';
import { TProps } from './RenderSliceItem';
import { Icon } from '@iconify/react/dist/iconify.js';

const RenderFormItem: FC<TProps> = (props) => {
  const { data, formKeys, valueStream, formKeysArray, index, parentPath = '' } = props;
  //hooks
  const methods = useFormContext();
  //handle actions
  const { handleAction } = useActionsV2({ data, valueStream: props.valueStream, methods });

  const { valueType, propsCpn: propsCpnHook } = useRenderItem({
    ...props,
    data,
    valueStream,
    methods,
  });
  //prepare actions
  const events = useDeepCompareMemo(() => {
    return prepareActions({ data, handleAction, props });
  }, [data?.actions, data?.componentProps?.dataProps, data?.componentProps?.actions]);

  const rest = useDeepCompareMemo(() => {
    const { name, ...rest } = _.merge({}, propsCpnHook, events);
    return rest;
  }, [propsCpnHook, events]);

  const { control } = methods;
  const currentFormKeys = formKeysArray || formKeys;
  const inFormKeys = currentFormKeys?.find((item) => item?.value === data?.name);

  //registy a component
  const Component = useMemo(
    () => (valueType ? _.get(componentRegistry, valueType) || 'div' : 'div'),
    [valueType]
  );

  const checkOnPageLoad = useDeepCompareMemo(() => {
    const actions = getPropActions(data);
    return 'onPageLoad' in actions;
  }, [data.actions, data.componentProps?.dataProps, data.componentProps?.actions]);

  //handle page load for actions
  const { isLoading } = useQuery({
    queryKey: ['onPageLoad', data?.id],
    queryFn: async () => (await events?.onPageLoad?.()) || {},
    enabled: checkOnPageLoad,
  });

  const getFieldName = useCallback(() => {
    if (!inFormKeys) return '';

    if (parentPath && typeof index === 'number') {
      return `${parentPath}.${index}.${inFormKeys.key}`;
    } else {
      return inFormKeys.key;
    }
  }, [inFormKeys, parentPath, index]);

  const nameField = getFieldName();

  const { isInput } = useMemo(() => getComponentType(data?.value || ''), [data?.value]);

  if (!valueType) return <div></div>;

  if (inFormKeys?.isList) {
    return (
      <RenderFormArrayItem
        {...props}
        data={data}
        formKeys={formKeys}
        valueStream={valueStream}
        parentPath={parentPath}
      />
    );
  }

  if (valueType === 'upload') {
    if (inFormKeys && nameField) {
      return (
        <Controller
          control={control}
          name={nameField}
          render={({ field }) => (
            <Upload
              {...rest}
              fileList={field.value?.map((base64: string, index: number) => ({
                uid: `-${index}`,
                name: `file-${index}`,
                status: 'done',
                url: base64,
              }))}
              onChange={async ({ fileList }: any) => {
                const base64Files = await Promise.all(
                  fileList.map(async (file: UploadFile) => {
                    if (file.originFileObj) {
                      return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file.originFileObj as File);
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => resolve('');
                      });
                    }
                    return file.url || '';
                  })
                );
                field.onChange(base64Files.filter((base64) => base64 !== ''));
              }}
              beforeUpload={() => false}
            >
              {rest.children || <button>Upload</button>}
            </Upload>
          )}
        />
      );
    }
    return <Upload {...rest} />;
  }

  if (isInput && inFormKeys && nameField) {
    if (valueType === 'datepicker') {
      return (
        <Controller
          control={control}
          name={nameField}
          render={({ field }) => {
            const suffixIcon = _.get(rest, 'suffixIcon.name')
            const suffixColor = '#10141A'
            return (
              <DatePicker
                {...rest}
                {...field}
                value={field.value ? dayjs(field.value) : null}
                onChange={(target: any) => {
                  field.onChange(target);
                  if (typeof rest?.onChange === 'function') {
                    rest.onChange(target);
                  }
                }}
                suffixIcon={<Icon color={suffixColor} icon={suffixIcon || 'heroicons:calendar-days-20-solid'} />}
              />
            )
          }}
        />
      );
    }

    if (valueType === 'checkbox') {
      return (
        <Controller
          control={control}
          name={nameField}
          render={({ field }) => (
            <Checkbox
              {...rest}
              {...field}
              checked={field.value}
              onChange={(e: any) => {
                field.onChange(e);
                if (typeof rest?.onChange === 'function') {
                  rest.onChange(e.target.checked);
                }
              }}
            />
          )}
        />
      );
    }
    if (valueType === 'switch') {
      return (
        <Controller
          control={control}
          name={nameField}
          render={({ field }) => (
            <Switch
              {...rest}
              {...field}
              checked={field.value}
              onChange={(e: any) => {
                field.onChange(e);
                if (typeof rest?.onChange === 'function') {
                  rest.onChange(e.target.checked);
                }
              }}
            />
          )}
        />
      );
    }
    return (
      <Controller
        control={control}
        name={nameField}
        render={({ field }) => (
          <Component
            {...rest}
            {...field}
            onChange={(target: any) => {
              field.onChange(target);
              if (typeof rest?.onChange === 'function') {
                rest.onChange(target);
              }
            }}
          />
        )}
      />
    );
  }

  if (isInput && !inFormKeys) {
    return <Component {...rest} />;
  }

  if (valueType === 'container' && propsCpnHook && 'mount' in propsCpnHook && !propsCpnHook.mount) {
    return null;
  }

  return (
    <RenderComponent Component={Component} propsCpn={rest} data={data}>
      {data?.childs?.map((child) => (
        <RenderFormItem
          {...props}
          data={child}
          key={`${child.id}`}
          parentPath={parentPath}
          index={index}
          formKeysArray={formKeysArray}
        />
      ))}
    </RenderComponent>
  );
};
export default RenderFormItem;

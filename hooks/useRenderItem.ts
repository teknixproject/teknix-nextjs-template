/** @jsxImportSource @emotion/react */
import { useMemo } from 'react';
import { FieldValues, UseFieldArrayReturn, UseFormReturn } from 'react-hook-form';
import { useDeepCompareMemo } from 'use-deep-compare';

import { GridItem } from '@/types/gridItem';
import { getComponentType } from '@/utils/component';
import { getPropData } from '@/utils/getDataField';
import { cleanProps } from '@/utils/renderItem';
import { buildStyle } from '@/utils/styleInline';
import { convertToPlainProps } from '@/utils/transfromProp';

import { useHandleProps } from './useHandleProps';

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

export const useRenderItem = ({
  data,
  valueStream,
  index,
  methods,
  methodsArray,
}: {
  data: GridItem;
  valueStream?: any;
  index?: number;
  methods?: UseFormReturn<FieldValues, any, FieldValues>;
  methodsArray?: UseFieldArrayReturn<FieldValues, string, 'id'>;
}) => {
  const valueType = useMemo(() => data?.value?.toLowerCase() || '', [data?.value]);
  const { isNoChildren } = useMemo(() => getComponentType(valueType), [valueType]);
  const { dataState } = useHandleProps({
    dataProp: getPropData(data),
    componentProps: data?.componentProps,
    valueStream,
    valueType,
    activeData: data,
    index,
    methods,
    methodsArray,
  });

  const propsCpn = useDeepCompareMemo(() => {
    const staticProps: Record<string, any> = {
      ...dataState,
    };

    staticProps.css = buildStyle(staticProps);

    let result =
      valueType === 'menu'
        ? { ...staticProps }
        : {
            ...dataState,
            ...staticProps,
          };

    const plainProps = convertToPlainProps(result);

    result = cleanProps(plainProps, valueType);

    return result;
  }, [dataState, isNoChildren, valueType]);

  return {
    valueType,
    propsCpn,
    dataState,
  };
};

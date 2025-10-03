import axios from 'axios';
import _ from 'lodash';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import queryString from 'query-string';
import { useCallback } from 'react';

import { stateManagementStore } from '@/stores';
import { authSettingStore } from '@/stores/authSetting';
import {
    TAction, TActionApiCall, TActionVariable, TApiCallValue, TApiCallVariable, TData, TTypeSelect
} from '@/types';
import { replaceEnv, variableUtil } from '@/utils';

import { TActionsProps } from './useActionsV2';
import { useApiCall } from './useApiCall';
import { THandleDataParams, useHandleData } from './useHandleData';

const { isUseVariable, extractAllValuesFromTemplate } = variableUtil;

export type TUseActions = {
  handleApiCallAction: (
    action: TAction<TActionApiCall>,
    params?: THandleDataParams
  ) => Promise<void>;
};
const convertUrl = (apiCallMember: TApiCallValue): string => {
  const baseUrl = apiCallMember?.url || '';

  if (!apiCallMember?.variables?.length) return baseUrl;

  const url = apiCallMember.variables.reduce((url, { key, value }) => {
    return url.replace(`[${key}]`, String(value));
  }, baseUrl);

  return queryString.stringifyUrl(
    {
      url,
      query: convertQuery(apiCallMember),
    },
    {}
  );
};
const convertQuery = (apiCallMember: TApiCallValue) => {
  const queryConvert = apiCallMember?.query
    ?.map((item) => {
      const type = item.type;
      if (type === 'variable') {
        const variable = apiCallMember?.variables?.find(
          (variable) => variable.id === item.variableId
        );
        item.value = variable?.value;
      }
      return item;
    })
    .reduce(
      (acc, item) => ({
        ...acc,
        [item.key as string]: item.value,
      }),
      {}
    );

  return queryConvert;
};
export const getOldOutput = (output: TActionApiCall['output']) => {
  const variableId = (output as any)?.variableId;
  if (variableId) return variableId;
  return output?.[output?.type]?.variableId;
};
export const useApiCallAction = (props: TActionsProps): TUseActions => {
  const router = useRouter();
  const { getApiMember } = useApiCall();
  const { getData } = useHandleData(props);
  const refreshAction = authSettingStore((state) => state.refreshAction);
  const entryPage = authSettingStore((state) => state.entryPage);
  const forbiddenCode = authSettingStore((state) => state.forbiddenCode);
  const findVariable = stateManagementStore((state) => state.findVariable);
  const updateVariables = stateManagementStore((state) => state.updateVariables);

  const convertActionVariables = useCallback(
    async (
      actionVariables: TActionVariable[],
      apiCall: TApiCallValue,
      params?: THandleDataParams
    ): Promise<any[]> => {
      if (_.isEmpty(actionVariables)) return [];

      const result = await Promise.all(
        actionVariables.map(async (item) => {
          const { firstValue, secondValue } = item;

          const data = apiCall?.variables?.find(
            (variable) => variable?.id === firstValue?.variableId
          );

          if (!data) return;

          if (secondValue?.type) {
            const valueInStore = await getData(secondValue, params);
            return { ...data, value: valueInStore };
          }

          return data;
        })
      );

      return result.filter(Boolean); // lọc bỏ các giá trị `undefined`
    },
    [getData]
  );

  const convertApiCallBody = useCallback((body: any, variables: Record<string, any>): any => {
    if (typeof body === 'string') return body;
    if (typeof body !== 'object') return body;

    return Object.entries(body).reduce((acc, [key, value]) => {
      acc[key] = isUseVariable(value)
        ? variables.find(
            (item: TApiCallVariable) => item.key === extractAllValuesFromTemplate(value as string)
          )?.value
        : value;
      return acc;
    }, {} as Record<string, any>);
  }, []);

  const convertHeader = async (apiCallMember: TApiCallValue) => {
    try {
      const headers = apiCallMember?.headers || ({ 'Content-Type': 'application/json' } as any);
      if (!headers['Authorization']) {
        // Lấy token từ localStorage
        let accessToken = localStorage.getItem('accessToken');

        // Nếu localStorage không có token, thử lấy từ session
        if (!accessToken) {
          const session: any = await getSession();
          accessToken = session?.accessToken;
        }

        // Merge headers mặc định với token nếu có

        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
      }
      return headers;
    } catch (error) {
      console.log('🚀 ~ convertHeader ~ error:', error);
      return apiCallMember?.headers || ({ 'Content-Type': 'application/json' } as any);
    }
  };
  const makeApiCall = async (
    apiCall: TApiCallValue,
    body: object,
    ouptut: TData,
    params?: THandleDataParams
  ): Promise<any> => {
    const typeStore = (ouptut?.type || 'apiResponse') as TTypeSelect;
    const outputVariable = findVariable({
      type: typeStore,
      id: getOldOutput(ouptut as any),
    });
    try {
      const response = await axios.request({
        baseURL: replaceEnv(apiCall?.baseUrl || ''),
        method: apiCall?.method?.toUpperCase(),
        url: replaceEnv(convertUrl(apiCall)),
        headers: await convertHeader(apiCall),
        data: ['POST', 'PUT', 'PATCH'].includes(apiCall?.method?.toUpperCase() || '') && body,
        // params:
        //   ['GET', 'DELETE'].includes(apiCall?.method?.toUpperCase() || '') && convertQuery(apiCall),
      });

      if (outputVariable?.id) {
        updateVariables({
          type: typeStore,
          dataUpdate: {
            ...outputVariable,
            value: response.data,
            succeeded: true,
            statusCode: response.status,
            message: response.statusText,
          },
        });
      }

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.status === forbiddenCode) {
          await handleRefreshToken(apiCall, body, getOldOutput(ouptut as any), params);
          return;
        }
        if (outputVariable) {
          updateVariables({
            type: typeStore,
            dataUpdate: {
              ...outputVariable,
              value: {
                ...error,
                response: error?.response?.data,
              },
              statusCode: error?.response?.status || 500,
              succeeded: false,
              message: error?.message,
            },
          });
        }
        return error;
      }
    }
  };
  const handleRefreshToken = async (
    apiCall: TApiCallValue,
    body: object,
    p0: any,
    params: THandleDataParams | undefined
  ) =>
    // apiCall: TApiCallValue,
    // body: object,
    // variableId: string,
    // params?: THandleDataParams
    {
      try {
        if (refreshAction) {
          // const rootAction = Object.values(refreshAction?.onClick || {})?.find(
          //   (item) => item.parentId === null
          // );
          // await handleActionExternal(refreshAction, 'onClick', params);
          // await makeApiCall(apiCall, body, variableId);
        } else if (entryPage) router.push(entryPage);
      } catch (error) {
        console.log('🚀 ~ handleRefreshToken ~ error:', error);
        if (entryPage) router.push(entryPage);
      }
    };
  const handleBody = (apiCall: TApiCallValue, variables: Record<string, any>) => {
    const formData = props.methods?.getValues();
    return formData || convertApiCallBody(apiCall?.body, variables);
  };
  const handleApiCallAction = async (
    action: TAction<TActionApiCall>,
    params?: THandleDataParams
  ): Promise<void> => {
    const apiCall = getApiMember(action?.data?.apiId ?? '');

    if (!apiCall) return;
    const variables = await convertActionVariables(action?.data?.variables ?? [], apiCall, params);

    const newBody = handleBody(apiCall, variables);
    _.update(apiCall, 'variables', () => variables);

    await makeApiCall(apiCall, newBody, action?.data?.output as any, params);
  };

  return { handleApiCallAction };
};

import _ from 'lodash';
import { isValidElement } from 'react';

import { TData } from '@/types';

// Utility function to check if a value is a ReactNode
function isReactNode(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true;
  if (isValidElement(value)) return true;
  if (Array.isArray(value)) return value.every((item) => isReactNode(item));
  if (value?.$$typeof === Symbol.for('react.portal')) return true;
  return false;
}

// Utility to ensure a value is a valid React child
export function ensureValidReactChild(value: any): any {
  if (isReactNode(value)) return value;
  if (value && typeof value === 'object') {
    // Handle objects like { value, label } by returning a string or fragment
    return value.label || value.value || JSON.stringify(value);
  }
  // Fallback: convert to string to avoid invalid child error
  return String(value);
}
export const convertFieldValue = (value: any) => {
  if (typeof value !== 'object') {
    return {
      valueInput: value,
      type: 'valueInput',
    } as TData;
  }
  return value;
};

export const convertDataToSingleProp = ({
  propName,
  valueProp,
}: {
  propName: string;
  valueProp: TData;
}) => {
  return {
    [propName]:
      _.get(valueProp, 'type') === 'valueInput' ? _.get(valueProp, 'valueInput') : valueProp,
  };
};

export const convertDataToProps = (props: Record<string, TData>): Record<string, any> => {
  return _.reduce(
    props,
    (result, valueProp, key) => {
      return _.assign(result, convertDataToSingleProp({ propName: key, valueProp }));
    },
    {}
  );
};
export const convertToPlainProps = (props: Record<string, any>) => {
  // Start with a shallow copy of props
  const result: Record<string, any> = {};
  const result2: Record<string, any> = {};

  for (const [key, val] of Object.entries(props)) {
    if (key.includes('-')) {
      const path = key.split('-').join('.');
      _.set(result2, path, val);
    } else result[key] = val;
  }

  const result3 = { ...result, ...result2 };

  return result3;
};
export const isTData = (value: any): value is TData => {
  // Must be a plain object
  if (!_.isPlainObject(value)) {
    return false;
  }
  if (_.isPlainObject(value) && 'valueInput' in value) {
    return true;
  }

  // Check if 'type' exists and is a valid key
  const validTypes: (keyof Omit<TData, 'type' | 'defaultValue'>)[] = [
    'itemInList',
    'parameters',
    'formData',
    'dynamicGenerate',
    'apiResponse',
    'appState',
    'componentState',
    'globalState',
    'apiCall',
    'customFunction',
    'condition',
    'valueInput',
  ];
  if (!('type' in value) || !validTypes.includes(value.type)) {
    return false;
  }

  return true;
};

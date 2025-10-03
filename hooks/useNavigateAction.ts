import { useRouter } from 'next/navigation';

import { TAction, TActionNavigate } from '@/types';
import { buildPathFromPattern } from '@/utils/pathname';

import { TActionsProps } from './useActionsV2';
import { THandleDataParams, useHandleData } from './useHandleData';

export type TUseActions = {
  handleNavigateAction: (
    action: TAction<TActionNavigate>,
    params?: THandleDataParams
  ) => Promise<void>;
};

export const normalizeUrl = (url: string): string => {
  if (!url) return '';

  // Trim leading/trailing spaces
  let cleanUrl = url.trim();

  try {
    // If it's a valid absolute URL, return as is (after trimming)
    const parsed = new URL(cleanUrl);
    return parsed.toString();
  } catch {
    // Not an absolute URL → treat as relative
    // Ensure it starts with /
    if (!cleanUrl.startsWith('/')) {
      cleanUrl = '/' + cleanUrl;
    }

    // Replace multiple slashes with single slash
    cleanUrl = cleanUrl.replace(/\/{2,}/g, '/');

    // Remove trailing slash (except if it's just "/")
    if (cleanUrl.length > 1 && cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    return cleanUrl;
  }
};
type TProps = TActionsProps;
export const useNavigateAction = ({ data, valueStream, methods }: TProps): TUseActions => {
  const router = useRouter();
  const { getData } = useHandleData({ activeData: data, valueStream: valueStream, methods });

  const isValidUrl = (url: string): boolean => {
    try {
      // Accept absolute URLs with valid protocol
      const parsed = new URL(url);

      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      // Accept relative URLs like /product/123
      return /^\/[^\s]*$/.test(url);
    }
  };

  const handleNavigateAction = async (
    action: TAction<TActionNavigate>,
    params?: THandleDataParams
  ): Promise<void> => {
    try {
      const { url, isExternal, isNewTab, parameters = [] } = action?.data || {};
      if (!url) return;

      const urlConverted = await buildPathFromPattern(url, parameters, getData, params);

      if (!isValidUrl(urlConverted)) {
        return;
      }

      if (isNewTab) {
        window.open(urlConverted, '_blank');
      } else if (isExternal) {
        window.location.href = urlConverted;
      } else {
        router.push(urlConverted);
      }
    } catch (error) {
      console.error('❌ Error in handleNavigateAction:', error);
    }
  };

  return { handleNavigateAction };
};

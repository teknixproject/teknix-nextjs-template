import { App } from 'antd';

import { TAction, TActionMessage } from '@/types';

import { TActionsProps } from './useActionsV2';
import { THandleDataParams, useHandleData } from './useHandleData';

enum MESSAGE_TYPE {
  SHOW = 'show',
  DESTROY = 'destroy',
}

export const useMessageAction = (props: TActionsProps) => {
  const { getData } = useHandleData(props);
  const { message } = App.useApp();
  const showMessage = async (action: TAction<TActionMessage>, params?: THandleDataParams) => {
    const messageContent = await getData(action.data?.content, params);
    const duration = action.data?.duration;
    const status = action.data?.status;

    if (!messageContent || !status) return;

    message.open({
      type: status,
      content: messageContent,
      duration: duration,
    });
  };
  const handleMessageAction = async (
    action: TAction<TActionMessage>,
    params?: THandleDataParams
  ) => {
    const messageType = action.data?.option;
    if (!messageType) return;
    switch (messageType) {
      case MESSAGE_TYPE.SHOW:
        await showMessage(action, params);
        break;
      case MESSAGE_TYPE.DESTROY:
        break;

      default:
        break;
    }
  };

  return { handleMessageAction };
};

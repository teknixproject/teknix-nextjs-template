'use client';

import _ from 'lodash';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useConstructorDataAPI, usePreviewUI } from '@/app/actions/use-constructor';
// import GridSystemContainer from '@/components/grid-systems';
import { getDeviceType } from '@/lib/utils';
import { actionService } from '@/services';
import { apiCallService } from '@/services/apiCall';
import { stateManagerService } from '@/services/stateManagement';
import { apiResourceStore, layoutStore } from '@/stores';
import { actionsStore } from '@/stores/actions';
import { stateManagementStore } from '@/stores/stateManagement';
import { TTypeSelectState } from '@/types';

// import LoadingPage from './loadingPage';
// import SandPackUI from './preview-ui';
import dynamic from 'next/dynamic';

type DeviceType = 'mobile' | 'desktop';

// Lazy load các thành phần
const GridSystemContainer = dynamic(() => import('@/components/grid-systems'), {
  loading: () => <LoadingPage />, // Hiển thị LoadingPage trong khi chờ
  ssr: false, // Tắt SSR nếu chỉ cần tải phía client
});
const SandPackUI = dynamic(() => import('./preview-ui'), {
  loading: () => <LoadingPage />,
  ssr: false,
});
const LoadingPage = dynamic(() => import('./loadingPage'), {
  ssr: false,
});

export default function ClientWrapper(props: any) {
  // const { isLoading } = useConstructorDataAPI(props.documentId, props.pathName);

  const isPreviewUI = _.get(props, 'pathName') === 'preview-ui';

  if (isPreviewUI) {
    return <PreviewUI {...props} />;
  }
  return <RenderUIClient {...props} />;
}

const RenderUIClient = (props: any) => {
  //#region store
  const { setData } = layoutStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { addAndUpdateApiResource, apiResources } = apiResourceStore();
  const { setDataTypeDocumentVariable } = stateManagementStore();
  const { setActions } = actionsStore();

  const { bodyLayout, footerLayout, headerLayout, isLoading } = useConstructorDataAPI(
    props?.documentId,
    props?.pathName
  );

  useEffect(() => {
    if (bodyLayout) setData(bodyLayout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // #region hooks
  const searchParams = useSearchParams();
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  const uid = searchParams.get('uid') || 'home';

  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType());
  const selectedHeaderLayout = headerLayout[deviceType] ?? headerLayout ?? {};
  const selectedBodyLayout = bodyLayout[deviceType] ?? bodyLayout ?? {};
  const selectedFooterLayout = footerLayout[deviceType] ?? footerLayout ?? {};

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [props?.page]);

  const getStates = async () => {
    const list: TTypeSelectState[] = ['appState', 'componentState', 'globalState'];
    try {
      await Promise.all(
        list.map(async (type: TTypeSelectState) => {
          const result = await stateManagerService.getData(
            type === 'globalState'
              ? {
                  projectId: projectId ?? '',
                  type,
                }
              : {
                  uid: uid ?? 'home',
                  projectId: projectId ?? '',
                  type,
                }
          );
          if (_.isEmpty(result?.data)) return;
          const { state } = result?.data;
          if (_.isEmpty(state)) return;

          if (state) {
            setDataTypeDocumentVariable({
              type,
              dataUpdate: state,
            });
          }
        })
      );
    } catch (error) {
      console.log('🚀 ~ getStates ~ error:', error);
    }
  };

  const getActions = async () => {
    try {
      const result = await actionService.getData({
        projectId: projectId ?? '',
        uid: uid ?? '',
      });
      if (_.isEmpty(result?.data?.data)) return;
      setActions(result.data.data);
    } catch (error) {
      console.log('🚀 ~ getStates ~ error:', error);
    }
  };
  const getApiCall = async () => {
    try {
      const result = await apiCallService.get({ uid: uid ?? '', projectId: projectId ?? '' });
      addAndUpdateApiResource({ uid: uid ?? '', apis: result?.data?.apis });
    } catch (error) {
      console.log('🚀 ~ getApiCall ~ error:', error);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    getStates();
    getApiCall();
    getActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, projectId]);

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="relative">
      {!_.isEmpty(selectedHeaderLayout) && (
        <GridSystemContainer
          isLoading={isLoading}
          {...props}
          page={selectedHeaderLayout || {}}
          deviceType={deviceType}
          isHeader
        />
      )}

      {!_.isEmpty(selectedBodyLayout) && (
        <GridSystemContainer
          isLoading={isLoading}
          {...props}
          page={selectedBodyLayout || {}}
          deviceType={deviceType}
          isBody
        />
      )}

      {!_.isEmpty(selectedFooterLayout) && (
        <GridSystemContainer
          isLoading={isLoading}
          {...props}
          page={selectedFooterLayout || {}}
          deviceType={deviceType}
          isFooter
        />
      )}
    </div>
  );
};

const PreviewUI = (props: any) => {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');
  const projectId = searchParams.get('projectId');

  //#region store
  const { setData } = layoutStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { addAndUpdateApiResource, apiResources } = apiResourceStore();
  const { setDataTypeDocumentVariable } = stateManagementStore();
  const { setActions } = actionsStore();

  // #region hooks
  const [deviceType, setDeviceType] = useState(getDeviceType());
  const { dataPreviewUI, isLoading } = usePreviewUI(projectId ?? '', uid);

  // #region state

  const isPage = _.get(dataPreviewUI, 'typePreview') === 'page';

  const headerLayout = _.get(dataPreviewUI, 'headerLayout');
  const bodyLayout = _.get(dataPreviewUI, 'bodyLayout');
  const footerLayout = _.get(dataPreviewUI, 'footerLayout');

  const selectedHeaderLayout = !_.isEmpty(headerLayout) ? headerLayout[deviceType] : {};
  const selectedBodyLayout = !_.isEmpty(bodyLayout) ? bodyLayout[deviceType] : {};
  const selectedFooterLayout = !_.isEmpty(footerLayout) ? footerLayout[deviceType] : {};

  //#region function
  useEffect(() => {
    const handleResize = () => setDeviceType(getDeviceType());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getStates = async () => {
    const list: TTypeSelectState[] = ['appState', 'componentState', 'globalState'];
    try {
      await Promise.all(
        list.map(async (type: TTypeSelectState) => {
          const result = await stateManagerService.getData(
            type === 'globalState'
              ? {
                  projectId: projectId ?? '',
                  type,
                }
              : {
                  uid: uid ?? '',
                  projectId: projectId ?? '',
                  type,
                }
          );
          if (_.isEmpty(result?.data)) return;
          const { state } = result?.data;
          if (_.isEmpty(state)) return;

          if (state) {
            setDataTypeDocumentVariable({
              type,
              dataUpdate: state,
            });
          }
        })
      );
    } catch (error) {
      console.log('🚀 ~ getStates ~ error:', error);
    }
  };

  const getActions = async () => {
    try {
      const result = await actionService.getData({
        projectId: projectId ?? '',
        uid: uid ?? '',
      });
      if (_.isEmpty(result?.data?.data)) return;
      setActions(result.data.data);
    } catch (error) {
      console.log('🚀 ~ getStates ~ error:', error);
    }
  };
  const getApiCall = async () => {
    try {
      const result = await apiCallService.get({ uid: uid ?? '', projectId: projectId ?? '' });
      addAndUpdateApiResource({ uid: uid ?? '', apis: result?.data?.apis });
    } catch (error) {
      console.log('🚀 ~ getApiCall ~ error:', error);
    }
  };

  useEffect(() => {
    if (bodyLayout) setData(bodyLayout);

    getStates();
    getApiCall();
    getActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, projectId]);

  //#region render
  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="component-preview-container">
      {isPage ? (
        <div className="relative">
          {!_.isEmpty(selectedHeaderLayout) && (
            <GridSystemContainer
              isLoading={isLoading}
              {...props}
              page={selectedHeaderLayout || {}}
              deviceType={deviceType}
              isHeader
            />
          )}

          {!_.isEmpty(selectedBodyLayout) && (
            <GridSystemContainer
              isLoading={isLoading}
              {...props}
              page={selectedBodyLayout || {}}
              deviceType={deviceType}
              isBody
            />
          )}

          {!_.isEmpty(selectedFooterLayout) && (
            <GridSystemContainer
              isLoading={isLoading}
              {...props}
              page={selectedFooterLayout || {}}
              deviceType={deviceType}
              isFooter
            />
          )}
        </div>
      ) : (
        <SandPackUI dataPreviewUI={dataPreviewUI} />
      )}
    </div>
  );
};

import { FC } from 'react';

import RenderSliceItem from './RenderSliceItem';
import { GridSystemProps } from './types';

//#region Grid System
const GridSystemContainer: FC<GridSystemProps> = ({ page }) => {
  if (!page?.childs) return null;
  return <RenderSliceItem data={page} key={page.id} />;
};

export default GridSystemContainer;

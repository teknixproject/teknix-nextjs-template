'use client';

import { ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import { CSSProperties } from 'styled-components';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useData } from '@/hooks';
import { cn } from '@/lib/utils';
import { GridItem, TCollapse } from '@/types/gridItem';

type TProps = {
  data: GridItem;
  style?: CSSProperties;
};
const CollapsibleDemo: React.FC<TProps> = ({ data, style }) => {
  console.log('🚀 ~ style:', style);
  const collapse: TCollapse | undefined = React.useMemo(() => data?.collapse || undefined, [data]);
  const { title } = useData({ layoutData: data, defaultTitle: 'Collapsible' });
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('w-[350px] space-y-2')}
      style={style}
    >
      <div className="flex items-center justify-between space-x-4 px-4">
        <h4 className="text-sm font-semibold">{title}</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0  cursor-pointer">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        {collapse?.childs?.map((child, index) => (
          <div key={index} className="w-full">
            <div className="rounded-md px-4 py-3 font-mono text-sm" style={collapse.styleChild}>
              {child?.value}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CollapsibleDemo;

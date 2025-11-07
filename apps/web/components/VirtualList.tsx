import React from 'react';
import { FixedSizeList } from 'react-window';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  width?: string | number;
  className?: string;
}

/**
 * VirtualList component for efficiently rendering large lists
 * Uses react-window for virtual scrolling to improve performance
 *
 * @example
 * <VirtualList
 *   items={products}
 *   height={600}
 *   itemHeight={80}
 *   renderItem={(product, index) => (
 *     <ProductRow product={product} />
 *   )}
 * />
 */
export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  width = '100%',
  className = '',
}: VirtualListProps<T>) {
  return (
    <FixedSizeList
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width={width}
      className={className}
    >
      {({ index, style }) => (
        <div style={style}>
          {renderItem(items[index], index)}
        </div>
      )}
    </FixedSizeList>
  );
}

VirtualList.displayName = 'VirtualList';

/* eslint-disable */
// Simplified Configurator stub - full implementation will be added in Phase 6
import React from 'react';
import { MdSettings } from 'react-icons/md';

export default function Configurator(props: { [x: string]: any }) {
  return (
    <button
      className="h-[18px] min-h-[unset] w-max min-w-[unset] bg-none p-0"
      onClick={() => console.log('Configurator clicked - full implementation coming in Phase 6')}
    >
      <MdSettings className="h-[18px] w-[18px] text-gray-400 dark:text-white" />
    </button>
  );
}

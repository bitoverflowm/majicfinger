// iconMap.js
import * as Icons from '@radix-ui/react-icons';

export const iconMap = Object.keys(Icons).reduce((acc, key) => {
  acc[key] = Icons[key];
  return acc;
}, {});
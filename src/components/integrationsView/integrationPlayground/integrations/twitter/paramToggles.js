import React from 'react';
import { Badge } from '@/components/ui/badge';

const ParamToggles = ({field_type, val, toggle, arr}) => {
    // Your component logic here

    return (
        <Badge variant={`${arr.includes(val) ? 'default': 'outline'}`} className={`${arr.includes(val) ? 'bg-black text-white hover:bg-slate-500 hover:text-black': 'hover:bg-slate-300 hover:text-black'} cursor-pointer m-1`} onClick={()=>toggle(field_type,  val)}>{val}</Badge>
    );
};

export default ParamToggles;
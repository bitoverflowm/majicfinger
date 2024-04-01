import React from 'react';

const ParamToggles = ({field_type, val, toggle, arr}) => {
    // Your component logic here

    return (
        <div className={`${arr.includes(val) ? 'bg-lychee-green text-white hover:bg-white hover:text-black': 'bg-white text-black hover:bg-lychee-green hover:text-white'} text-xs border-slate-200 border px-2 p-1 rounded-md cursor-pointer m-1 my-2 `} onClick={()=>toggle(field_type,  val)}>{val}</div>
    );
};

export default ParamToggles;


import React from 'react';

/*
 * title: goes in the header of the group. It is as is.
 * options is an array of available options to choose from
 * val is the current value for this given option set
 * call is the set useState call to update val
*/


const Group = ({ title, options, val, call }) => {
    return (
        <div className="flex place-items-center">
            <div className="text-xs w-1/4">
                {title}
            </div>
            <select value={val} onChange={(e) => call(e.target.value)} className="w-3/4 text-xs p-2 border rounded">
                {options.map((option, index) => (
                    <option key={index} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default Group;
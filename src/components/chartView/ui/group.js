import { Transition } from '@headlessui/react';
import React, { useState } from 'react';
import { FaSortDown } from 'react-icons/fa';
import { AiOutlineClose } from "react-icons/ai";

/*
 * title: goes in the header of the group. It is as is.
 * options is an array of available options to choose from
 * val is the current value for this given option set
 * call is the set useState call to update val
*/

const Groups = ({title, options, val, call, opened=false}) => {
    const [open, setOpen] = useState(opened);

    return (
        <div className={`pl-3 p-1 border-b-2`}>
            <div className="w-full text-xs p-2 flex gap-2 cursor-pointer" onClick={()=>setOpen(!open)}>
                <div className='w-5/6 font-bold'>
                    {title} 
                </div>
                <div className='w-1/6 flex place-content-end'>{open ?  <AiOutlineClose /> : <FaSortDown />}</div>
            </div>
            <Transition 
                show={open}
                enter="transition-opacity duration-1000"
                enterFrom="opacity-0 h-0"
                enterTo="opacity-100 h-auto"
                leave="transition-opacity duration-150"
                leaveFrom="opacity-100 h-auto"
                leaveTo="opacity-0">
                    <div className="flex flex-wrap gap-2 pr-2 pb-4 pl-2">
                        {
                            options && options.map((opt, key) => (
                                <div
                                    key={key}
                                    className={`px-2 py-1 border border-white rounded-lg shadow-sm text-xs cursor-pointer ${val === opt ? 'bg-black text-white hover:bg-white hover:text-black': 'bg-white text-black hover:bg-black hover:text-white'}`}
                                    onClick={() => call(opt)}
                                >
                                    {opt}
                                </div>
                            ))
                        }
                    </div>
            </Transition>
        </div>
    );
}

export default Groups;
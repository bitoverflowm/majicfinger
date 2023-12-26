'use client'

import React, { useState, useEffect, useRef } from 'react'


const EditField = ({val, keyval, saveVal, type, dataIndex}) => {
    const [editing, setEditing] = useState(false)
    const [tempVal, setTempVal] = useState()

    const textareaRef = useRef(null)

    const handleChange = (e) => {
        setTempVal(e.target.value)
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (textareaRef.current && !textareaRef.current.contains(event.target)) {
                setEditing(false);
                // You can also call any other function here
                setTempVal(currentTempVal => { 
                    saveVal(keyval, currentTempVal, type, dataIndex); // Call saveVal if provided
                    return currentTempVal;
                });
            }
        }

        // Add event listener
        if (editing) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editing]);

    

    return (
        <>
            {
                editing ? <textarea ref={textareaRef} className='max-w-12' value = {tempVal} onChange={handleChange} style={{resize: 'none'}} autoFocus={true}/>
                : <div onClick={()=>setEditing(true)}>{ tempVal && tempVal.length>0 ? tempVal : val}</div>
            }
        </>
    )

}

export default EditField
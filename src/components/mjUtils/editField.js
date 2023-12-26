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
                if(textareaRef.current.value){
                    setEditing(false);
                    saveVal(keyval, textareaRef.current.value, type, dataIndex); // Call saveVal if provided
                    return
                    // You can also call any other function here
                }else{
                    if(val){
                        setTempVal(val)
                        setEditing(false)
                    }else{
                        setEditing(true)
                    }
                }
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

    useEffect(()=>{
        setTempVal()
    }, [val])

    

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
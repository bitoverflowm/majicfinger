'use client'

import React, { useState, useEffect, useRef } from 'react'


const EditField = ({val, keyval, saveVal, type, dataIndex, setEditingCell}) => {
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
                    setEditingCell(false)
                    saveVal(keyval, textareaRef.current.value, type, dataIndex); // Call saveVal if provided
                    return
                    // You can also call any other function here
                }else{
                    if(val){
                        setTempVal(val)
                        setEditing(false)
                        setEditingCell(false)
                    }else{
                        setEditing(true)
                        setEditingCell(false)
                    }
                }
            }
        }

        const handleEnter = (event) => {
            if (textareaRef.current) {
                if(textareaRef.current.value){
                    setEditing(false);
                    setEditingCell(false)
                    saveVal(keyval, textareaRef.current.value, type, dataIndex); // Call saveVal if provided
                    return
                    // You can also call any other function here
                }else{
                    if(val){
                        setTempVal(val)
                        setEditing(false)
                        setEditingCell(false)
                    }else{
                        setEditing(true)
                        setEditingCell(false)
                    }
                }
            }
        }

        // Add event listener
        if (editing) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', function(event) {
                if (event.key === 13) { // 13 is the keycode for Enter
                    handleEnter();
                }
            }, handleEnter)
        }

        // Cleanup event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editing]);

    const toggleClick = () => {
        setEditingCell(true)
        setEditing(true)
    }

    useEffect(()=>{
        setTempVal()
    }, [val])

    

    return (
        <>
            {
                editing ? <textarea ref={textareaRef} className='max-w-12' value = {tempVal} onChange={handleChange} style={{resize: 'none'}} autoFocus={true}/>
                : <div onClick={toggleClick}>{ tempVal && tempVal.length>0 ? tempVal : val}</div>
            }
        </>
    )

}

export default EditField
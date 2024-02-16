import { set } from 'mongoose';
import React from 'react';
import { useState } from 'react';

import { AiOutlineLoading3Quarters } from "react-icons/ai";



const AIMode = ({setData, setWorking}) => {
    
    const [generatedData, setGeneratedData] = useState()
    const [assistantId, setAssistantId] = useState()
    const [threadId, setThreadId] = useState()
    const [reccommendedCharts, setReccommendedCharts] = useState()
    const [reccommendedStats, setReccommendedStats] = useState()

    const [loading, setLoading] = useState(false)

    const genrateRandomData = async () => {
        //promot: "generate a compltely random data set in csv format and return what type of chart will be the best way to present this data and why"
        setLoading(true)
        try{
          const res = await fetch('/api/ai/generateRandomData', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          if(res.status === 200){
            const data = await res.json()

            // Extract the JSON part
            let dataText = String(data.data)
            console.log(dataText)
            const startIndex = dataText.indexOf('['); // Assuming '[' is the start of JSON data
            const endIndex = dataText.lastIndexOf(']') + 1; // Assuming ']' is the end of JSON data
            const jsonString = dataText.substring(startIndex, endIndex);
            console.log("some more data: ", jsonString)

            // Parse the JSON string into an object
            const jsonData = JSON.parse(jsonString);

            console.log("the data: ", jsonData)

            setData(jsonData)
            setGeneratedData(jsonData)
            setAssistantId(data.assistant_id)
            setThreadId(data.thread_id)
            console.log("the assistant ID: ", data.assistant_id)
            //setTableCode(data.response)
            console.log("parsing the summary", data.summary)
            try {
              // Replace single quotes with double quotes
              const validJsonString = data.summary.replace(/'/g, '"');
              const parsedArray = JSON.parse(validJsonString);
              setReccommendedCharts(parsedArray[0])
              setReccommendedStats(parsedArray[1])
              setLoading(false)
            } catch (error) {
                setLoading(false)
                console.error('Error parsing JSON string:', error);
            }
          } else {
            setLoading(false)
            throw new Error(await res.text())
          }
        } catch(error){
          setLoading(false)
          console.log("an error occurred")
        }
    }
    
    const triggerAction = (action) => {
        if(action === 'generateData'){
            genrateRandomData()
        }
    }


  return (
    <div className="flex flex-col place-content-end font-regular border-lychee-black rounded-lg border-2 min-h-2/3 px-10 py-4 text-xs">
        <div>Hello, I am Athena</div>
        <div>What do you want me to help you with today?</div>
        <div className="flex flex-wrap gap-1 p-2">
            <div className="bg-black py-1 px-2 text-white rounded-lg text-xxs cursor-pointer hover:bg-white hover:text-black" onClick={()=>triggerAction('generateData')}>Generate a Data Set</div>
            <div className="bg-black py-1 px-2 text-white rounded-lg text-xxs">Analyze your Data</div>
            <div className="bg-black py-1 px-2 text-white rounded-lg text-xxs">Help visualize your data</div>
            <div className="bg-black py-1 px-2 text-white rounded-lg text-xxs"> Analyze your viaualizations</div>
        </div>
        {
            loading &&
            <div><AiOutlineLoading3Quarters className='animate-spin'/>
            Loading...
            </div>
        }
        {
            generatedData &&
            <div className="flex flex-col gap-2">
                <div>Generated Data:</div>
                <div className='bg-black p-1 text-white' onClick={()=>setWorking('grid')}>Click to View</div>
                <div>Assistant ID: {assistantId}</div>
                <div>Thread ID: {threadId}</div>
                <div>Reccommended Charts: {reccommendedCharts}</div>
                <div>Reccommended Stats: {reccommendedStats}</div>
            </div>

        }        
    </div>
  )

};

export default AIMode;

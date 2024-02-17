import React from 'react';
import { useState } from 'react';

import { TypeAnimation } from "react-type-animation";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const AIMode = ({data, setData, setWorking, setDflt}) => {
    
    const [generatedData, setGeneratedData] = useState()
    const [assistantId, setAssistantId] = useState()
    const [threadId, setThreadId] = useState()
    const [reccommendedCharts, setReccommendedCharts] = useState()
    const [reccommendedStats, setReccommendedStats] = useState()

    const [loading, setLoading] = useState(false)

    //AI specific data
    const [uploadedFile, setUploadedFile] = useState()
    const [analysis, setAnalysis] = useState()

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

            // Parse the JSON string into an object
            const jsonData = JSON.parse(jsonString);

            setData(jsonData)
            setDflt(false)
            setGeneratedData(jsonData)
            setAssistantId(data.assistant_id)
            setThreadId(data.thread_id)
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

    //TODO:
    //add uploaded fileID (file-9IGqBb0VL9PJ64MqszR3YhZu)
    const analyzeData = async () => {
      /*
      * scenarios:
          * data is default data
          * new data has been uploaded
          * data already exists in AI convo
      */
     console.log("analyzing data: ", data)
      try{
        const res = await fetch('/api/ai/analyzeData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: data  }),
        });
        if(res.status === 200){
          const analysisData = await res.json()
          setAnalysis(analysisData.analysis)
          setUploadedFile(analysisData.file_id)          
        } else {
          throw new Error(await res.text())
        }
      } catch(error){
        console.log("an error occurred")
      }
    }

    /*const deleteFile = async () => {
      /*DELETE
      https://api.openai.com/v1/files/{file_id}
    }*/
    
    const triggerAction = (action) => {
        if(action === 'generateData'){
            genrateRandomData()
        } else if(action === 'analyzeData'){
            analyzeData()
        }
    }


  return (
    <div className="flex flex-col place-content-end font-regular border-lychee-black rounded-lg border-2 min-h-2/3 w-11/12 px-10 py-4 text-xs">
        <div>Hello, I am Athena</div>
        <div>What do you want me to help you with today?</div>
        <div className="flex flex-wrap gap-1 p-2">
            <div className="bg-black py-1 px-2 text-white rounded-lg text-xxs cursor-pointer hover:bg-white hover:text-black" onClick={()=>triggerAction('generateData')}>Generate a Data Set</div>
            <div className="bg-black py-1 px-2 text-white rounded-lg text-xxs cursor-pointer hover:bg-white hover:text-black" onClick={()=>triggerAction('analyzeData')}>Analyze your Data</div>
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
                <div className='p-1 flex place-content-center'><div className='text-xxs rounded-md bg-black p-1 text-white w-24 text-center hover:bg-white hover:text-black cursor-pointer' onClick={()=>setWorking('grid')}>Click to View</div></div>
                <TypeAnimation sequence={'Reccommended Stats'} speed={20} repeat={1}/>
                <TypeAnimation sequence={reccommendedStats.join(" ")} speed={20} repeat={1}/>
                <TypeAnimation sequence={'Reccommended Charts'} speed={20} repeat={1}/>
                <TypeAnimation sequence={reccommendedCharts.join(" ")} speed={20} repeat={1}/>
            </div>
        }
        {
          analysis && <div className="typing">
              <TypeAnimation sequence={'Here are my thoughts on what you uploaded:'} speed={20} repeat={1}/>
              <TypeAnimation sequence={[analysis]} speed={20} repeat={1}/>
            </div>
        }
        {
          uploadedFile &&
            <div >Uploaded File: {uploadedFile}</div>
        }
    </div>
  )

};

export default AIMode;

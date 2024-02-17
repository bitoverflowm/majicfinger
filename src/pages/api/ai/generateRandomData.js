import OpenAI from "openai"
import { pollRunStatus } from "./aiUtils";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_SECRET,
})

export default async (req, res) => {
    try{
        //create assistant
        const assistant = await openai.beta.assistants.create({
            name: "MajicFinger",
            instructions: "You are a data analysis expert and you have access to data files to answer user questions about the data. You can conduct data analysis, infer logic from the data, and also provide advice on interesting patterns that the data reveals. You also have the ability to generate arbitrary data in json format to analyze and also to sent to user in the situation that the user does not have their own data to work with. Only generate the json data when user requests it. When the json data has been generated. Remember it and we will refer to it as json data",
            model: "gpt-3.5-turbo",

        })

        console.log("added assistant: ", assistant.id)

        const newdataRun = await openai.beta.threads.createAndRun({
            assistant_id: assistant.id,
            thread: {
                messages: [{ role: "user", content: `Generate a JSON-formatted dataset about a topic of your choice. The dataset should include a few data rows. Format the data as a JSON array. Please output only the JSON data, with no additional text or explanations.
                
                Remember this json data, we will use it in the next steps. Output absolutely only the json data, no explanations, no additional text, no introduction, no plesantries, no outro texts, no 'Sure', no 'Data generated' only output the json data:

                Desired Format: <json data>` }]
            }
        });
        

        console.log("Polling to check data run")
        const completedRun = await pollRunStatus(newdataRun.thread_id, newdataRun.id);
        console.log("data poll complete")
        
        // Fetch the thread details to get the response
        const threadDetails = await openai.beta.threads.messages.list(newdataRun.thread_id);
        console.timeLog("thread details: ", threadDetails.data[0])
        const dataText = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content[0].text.value;
        console.log("data generated: ", dataText )

        const analysisMessage = await openai.beta.threads.messages.create(
            newdataRun.thread_id,
            { role: "user", content: `Please generate 2 arrays: 1st array is a list of possible visualizations that could be carried out on the previous json data. The 2nd array is a list of data analysis that could be carried out and what specifically we are analyzing. Your response should be in the following format [['',''] , ['','','']]. Do not output labels, only output the arrays. Do not provide any additional explanations or text. Do not add intro text or outro texts, do not even provide a response like 'Sure', only output the arrays in the following format:  
            
            Desired Format: [['<visualization1>', '<visualization2>', '<visualization3>', etc] , ['<analysis1>', '<analysis2>', '<analysis3>',etc]]
            ` }
        )

        const analysisRun = await openai.beta.threads.runs.create(
            newdataRun.thread_id,
            { 
              assistant_id: assistant.id,
            }
          );

        //analysis run start
        //startThread createRun
        /*
        const analysisRun = await openai.beta.threads.createAndRun({
            assistant_id: assistant.id,
            thread: {
                messages: [{ role: "user", content: "Please generate 2 arrays: 1st array is a list of possible visualizations that could be carried out on the previous csv data. The 2nd array is a list of data analysis that could be carried out and what specifically we are analyzing. Your response should be in the following format [['','']['','','']]. Do not output labels, only output the arrays. Do not provide any additional explanations or text. Do not add intro text or outro texts, do not even provide a response like 'Sure', only output the arrays in the following format  [['','']['','','']] and nothing else" }]
            }
        });*/

        console.log("Polling to check analysis run")
        const completedAnalysisRun = await pollRunStatus(newdataRun.thread_id, analysisRun.id);
        console.log("polling completed")

        console.log("Analysis run details: ", analysisRun)
        
        // Fetch the thread details to get the response
        const analysisThreadDetails = await openai.beta.threads.messages.list(newdataRun.thread_id, {
            order: 'desc', limit: '1'
        });
        const summaryArray = analysisThreadDetails.data.find(msg => msg.role === "assistant")?.content[0].text.value;
        //const summaryArray = analysisThreadDetails.data.find(msg => msg.role === "assistant" && msg.id === analysisRun.id)?.content[0].text.value;        
        console.log('summary array: ', summaryArray)

        res.status(200).json({success: true, data:dataText, summary: summaryArray, assistant_id: assistant.id, thread_id: newdataRun.thread_id})
    }
    catch(err){
        throw err
    }
}

/*
That data required for Nivo charts js requires data to be in the following format:

[ { "x-axis name": "name example", "category1": 125, "category1color": "hsl(94, 70%, 50%)", "category2": 39, "category2color": "hsl(178, 70%, 50%)", "category3": 62, "category3color": "hsl(80, 70%, 50%)", }, { "x-axis name": "name example 2", "category1": 125, "category1color": "hsl(94, 70%, 50%)", "category2": 39, "category2color": "hsl(178, 70%, 50%)", "category3": 62, "category3color": "hsl(80, 70%, 50%)", }, ... ]

Reformat the csv into this format. Assign pleasing colors to the color categories. Please provide only the object, without any additional explanations or text. Don't add intro text or outro texts, don't even provide a response like 'Sure', only output the object, literally nothing else, not even variable assignment.
*/

/*
* return the list of keys to match with the formatted data
 */


//and return what type of chart will be the best way to present this data and why
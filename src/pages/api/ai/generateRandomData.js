import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_SECRET,
})

export default async (req, res) => {
    try{
        //create assistant
        const assistant = await openai.beta.assistants.create({
            name: "MajicFinger",
            instructions: "You are a data analysis expert and you have access to data files to answer user questions about the data. You can conduct statically analysis, econometrics, infer logic from the data, and also provide advice on interesting patterns that the data reveals. You also have the ability to generate arbitrary data in csv format to analyze and also to sent to user in the situation that the user does not have their own data to work with. Only generate the csv data when user requests it",
            model: "gpt-3.5-turbo",

        })
    
        //startThread createRun
        const dataRun = await openai.beta.threads.createAndRun({
            assistant_id: assistant.id,
            thread: {
                messages: [{ role: "user", content: "generate a completely random data set in csv format. Pick a random topic. Pick column labels for the data which should be on topic and relevant. Please provide only the data, without any additional explanations or text." }]
            }
        });

        console.log("Polling to check data run")
        const completedRun = await pollRunStatus(dataRun.thread_id, dataRun.id);
        console.log("data poll complete")
        
        // Fetch the thread details to get the response
        const threadDetails = await openai.beta.threads.messages.list(dataRun.thread_id);
        console.log("threadDetails: ", threadDetails)
        const dataText = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === dataRun.id)?.content[0].text.value;

        //analysis run start
        //startThread createRun
        const analysisRun = await openai.beta.threads.createAndRun({
            assistant_id: assistant.id,
            thread: {
                messages: [{ role: "user", content: "What would you say is the best way to graphically represent this data? What stastical analysis could present interesting insights on the data? Please respond in 2 arrays. 1st array is a list of ways that the data could be graphically represented. The 2nd array is a list of stastical analysis that could pose interesting insights. provide arrays in the following format [['','']['','','']]. Don't label the arrays as 1st array and 2nd array, just provide the arrays. Don't provide any additonal explanations or text." }]
            }
        });

        console.log("Polling to check analysis run")
        const completedAnalysisRun = await pollRunStatus(analysisRun.thread_id, analysisRun.id);
        console.log("polling completed")
        
        // Fetch the thread details to get the response
        const analysisThreadDetails = await openai.beta.threads.messages.list(analysisRun.thread_id);
        const summaryArray = analysisThreadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === analysisRun.id)?.content[0].text.value;        

        res.status(200).json({success: true, data:dataText, summary: summaryArray})
    }
    catch(err){
        throw err
    }
}


async function checkRunStatus(threadId, runId) {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    return runStatus;
}

// Polling mechanism
function pollRunStatus(threadId, runId, interval = 5000, timeout = 60000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const intervalId = setInterval(async () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > timeout) {
                clearInterval(intervalId);
                reject(new Error("Timeout reached while waiting for run completion"));
            }

            const runStatus = await checkRunStatus(threadId, runId);
            if (runStatus && runStatus.status === "completed") { // Check the correct property for completion
                clearInterval(intervalId);
                resolve(runStatus);
            }
        }, interval);
    });
}

//and return what type of chart will be the best way to present this data and why
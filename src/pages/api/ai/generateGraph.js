import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_SECRET,
})

export default async (req, res) => {
    try{
        //create assistant
        const thread_id = req.query.threadId
        const assistant_id = req.query.assistantId

        let dataPrompt = `Reformat the previous csv data into the following format (these are all placeholders):

        [ { "x-axisName": x-axisName, "cat1": cat1Val, "cat1color": "hsl value", "cat2": cat2Val, "caty2color": "hsl value", "cat3": cat3val, "cat3color": "hsl value", }, { "x-axis name": "name example 2", "category1": 125, "category1color": "hsl(94, 70%, 50%)", "category2": 39, "category2color": "hsl(178, 70%, 50%)", "category3": 62, "category3color": "hsl(80, 70%, 50%)"}, ... ]
        
        Depending on the csv data there might just be 1 cat (catVal, catColor) or 2, 3, 4, 5, etc. Match the csv data exactly up to this format and remove any missing columns, categories or irelevant entries. Assign pleasing hsl colors. Output the object, without any additional explanations or text, do not add intro text or outro texts, do not provide a response like 'Sure', only output the object [], not even variable assignments.`
    
        //add message to thread with above prompt
        console.log("Creating message")
        console.log("thread_id: ", thread_id)
        const dataMessage = await openai.beta.threads.messages.create(
            thread_id,
            { 
                role: "user", content: dataPrompt
            }
        );
        
        console.log("Creating data Run")

        const dataRun = await openai.beta.threads.runs.create(
            thread_id,
            {
                assistant_id: assistant_id
            }
        )

        console.log("Polling to check data run")
        const completedRun = await pollRunStatus(thread_id, dataRun.id);
        console.log("data poll complete")
        
        // Fetch the thread details to get the response
        const threadDetails = await openai.beta.threads.messages.list(dataRun.thread_id,
            {
                order: 'desc', limit: '1'
            });
        const formattedGraphData = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === dataRun.id)?.content[0].text.value;
        console.log("formatted Graph data: ", formattedGraphData)

        /*getting graph keys */
        const keyMessage = await openai.beta.threads.messages.create(
            thread_id,
            { 
                role: "user", content: "return an array of categories in the data we just formatted data above"
            }
        );

        const keyRun = await openai.beta.threads.runs.create(
            thread_id,
            {
                assistant_id: assistant_id
            }
        )

        console.log("Polling to check data run")
        await pollRunStatus(thread_id, dataRun.id);
        console.log("data poll complete")
        
        // Fetch the thread details to get the response
        const keyThreadDetails = await openai.beta.threads.messages.list(dataRun.thread_id,
            {
                order: 'desc', limit: '1'
            });
        const formattedKeyData = keyThreadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === dataRun.id)?.content[0].text.value;
        console.log("formatted Graph data: ", formattedKeyData)

        /*getting graph y-axis name */
        const yMessage = await openai.beta.threads.messages.create(
            thread_id,
            { 
                role: "user", content: "return the y-axis name for formatted data"
            }
        );

        const yRun = await openai.beta.threads.runs.create(
            thread_id,
            {
                assistant_id: assistant_id
            }
        )

        console.log("Polling to check data run")
        await pollRunStatus(thread_id, dataRun.id);
        console.log("data poll complete")
        
        // Fetch the thread details to get the response
        const yThreadDetails = await openai.beta.threads.messages.list(dataRun.thread_id,
            {
                order: 'desc', limit: '1'
            });
        const formattedYData = keyThreadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === dataRun.id)?.content[0].text.value;
        console.log("formatted Y data: ", formattedYData)

        res.status(200).json({success: true, data:formattedGraphData, keys: formattedKeyData, y: formattedYData})
    }
    catch(err){
        throw err
    }
}

/*
That data required for Nivo charts js requires data to be in the following format:

[ { "x-axisName": "name example", "category1": 125, "category1color": "hsl(94, 70%, 50%)", "category2": 39, "category2color": "hsl(178, 70%, 50%)", "category3": 62, "category3color": "hsl(80, 70%, 50%)", }, { "x-axis name": "name example 2", "category1": 125, "category1color": "hsl(94, 70%, 50%)", "category2": 39, "category2color": "hsl(178, 70%, 50%)", "category3": 62, "category3color": "hsl(80, 70%, 50%)", }, ... ]

Reformat the csv into this format. Assign pleasing colors to the color categories. Please provide only the object, without any additional explanations or text. Don't add intro text or outro texts, don't even provide a response like 'Sure', only output the object, literally nothing else, not even variable assignment.
*/

/*
* return the list of keys to match with the formatted data
 */


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
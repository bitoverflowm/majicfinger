import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_SECRET,
})

export default async (req, res) => {
    try{
        //create assistant
        const thread_id = req.query.threadId
        const assistant_id = req.query.assistantId

        let dataPrompt = `Review the previous csv and extract interesting segments, columns or samles of the previous csv so that I can create a bar chart. Format in json, without any additional explanations or text, do not add intro text or outro texts, do not provide a response like 'Sure', only output the object [], not even variable assignments. Format the response in following manner (only replace placeholders marked by <>):

        Example: [{'category': 'Apples', 'Cost': 33}, 
        {'category': 'Bananas', 'Cost': 78}, 
        {'category': 'Pears', 'Cost': 14}, 
        {'category': 'Grapes', 'Cost': 41}]

        Desired Format: [{ 'category': <category name>, <value name>: <value>}, { 'category': <category name 2>, <value name>: <value 2>}]
        `
    
        //add message to thread with above prompt
        console.log("Creating message")
        console.log("thread_id: ", thread_id)
        const dataMessage = await openai.beta.threads.messages.create(
            thread_id,
            { 
                role: "user", content: dataPrompt
            }
        );
        
        console.log("Creating Graph data Message")

        const dataRun = await openai.beta.threads.runs.create(
            thread_id,
            {
                assistant_id: assistant_id
            }
        )

        console.log("Polling to check data run")
        await pollRunStatus(thread_id, dataRun.id);
        console.log("data pull complete")
        
        // Fetch the thread details to get the response
        const threadDetails = await openai.beta.threads.messages.list(thread_id,
            {
                order: 'desc', limit: '2'
            });
        console.log("thread details: ", threadDetails)
        const formattedGraphData = threadDetails.data.find(msg => msg.role === "assistant")?.content[0].text.value;
        console.log("formatted Graph data: ", formattedGraphData)

        

        /*getting graph keys */
        const keyMessage = await openai.beta.threads.messages.create(
            thread_id,
            { 
                role: "user", content: `return an array of category value names in the above formatted data. Return only the name of the array and nothing else:

                Example: for this data: [{'Fruit': 'Apples', 'Cost': 33}, 
                {'Fruit': 'Bananas', 'Cost': 78}, 
                {'Fruit': 'Pears', 'Cost': 14}, 
                {'Fruit': 'Grapes', 'Cost': 41}]
        
                Expected Output: ['Fruit']
                Note "Fruit" is the desired output not "Cost".
        
                Desired Format: ['<Key Value Name>', etc]
                                `
            }
        );

        const keyRun = await openai.beta.threads.runs.create(
            thread_id,
            {
                assistant_id: assistant_id
            }
        )

        console.log("Polling to check Key run")
        await pollRunStatus(thread_id, keyRun.id);
        console.log("Key poll complete")
        
        // Fetch the thread details to get the response
        const keyThreadDetails = await openai.beta.threads.messages.list(thread_id,
            {
                order: 'desc', limit: '2'
            });
        console.log("key thread details: ", keyThreadDetails)
        const formattedKeyData = keyThreadDetails.data.find(msg => msg.role === "assistant")?.content[0].text.value;
        console.log("formatted Key data: ", formattedKeyData)

        /*getting graph y-axis name */
        const yMessage = await openai.beta.threads.messages.create(
            thread_id,
            { 
                role: "user", content: `return the y-axis name that best matches a measure for category value name in the above formatted data. Return only the name of the y-axis nothing else:

                Example: for this data: [{"category": "Apples", "Cost": 33}, 
                {"category": "Bananas", "Cost": 78}, 
                {"category": "Pears", "Cost": 14}, 
                {"category": "Grapes", "Cost": 41}]

                Expected Output: 'Cost'

                Desired Format: <y-axis name>
                        `
            }
        );

        const yRun = await openai.beta.threads.runs.create(
            thread_id,
            {
                assistant_id: assistant_id
            }
        )

        console.log("Polling to check data run")
        await pollRunStatus(thread_id, yRun.id);
        console.log("data poll complete")
        
        // Fetch the thread details to get the response
        const yThreadDetails = await openai.beta.threads.messages.list(thread_id,
            {
                order: 'desc', limit: '2'
            });
        const formattedYData = yThreadDetails.data.find(msg => msg.role === "assistant")?.content[0].text.value;
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
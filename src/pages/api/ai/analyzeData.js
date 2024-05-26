const fs = require('fs');
const os = require('os');
const path = require('path');

import OpenAI from "openai"
import { pollRunStatus } from "./aiUtils";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_DEV_SECRET,
})
export default async (req, res) => {
    try {
        // check if req has data
        console.log("checking if data exists")
        if (!req.body.data) {
            return res.status(400).json({ error: "No data provided" });
        }
        console.log("setting file stream")
        const tempFilePath = path.join(os.tmpdir(), 'tempfile.json');

        fs.writeFileSync(tempFilePath, JSON.stringify(req.body.data));

        const fileStream = fs.createReadStream(tempFilePath);

        console.log("Uploading file")

        const file = await openai.files.create({
            file: fileStream,
            purpose: "assistants",
        })

        console.log("File uploaded: ", file.id)
        
        console.log("Creating assistant")
        // create assistant
        const assistant = await openai.beta.assistants.create({
            name: "Lychee0",
            instructions:
                "You are a expert data analysis and you have access to data. You can conduct data analysis, infer logic from the data, and also provide advice on interesting patterns that the data reveals.",
            model: "gpt-4o",
            tools: [{ type: "code_interpreter" }],
            tool_resources: {
                "code_interpreter": {
                    "file_ids": [file.id]
                }
            }
        });

        console.log("added assistant: ", assistant.id)

        const newdataRun = await openai.beta.threads.createAndRun({
            assistant_id: assistant.id,
            thread: {
                messages: [{ role: "user", content: `Please give me a summary of the data in the file. Also list some interesting further exploration that can be done with this data. And how could a user use this data for their or society's benefit.` }]
            }
        });
        

        console.log("Polling to check data run")
        const completedRun = await pollRunStatus(newdataRun.thread_id, newdataRun.id);
        console.log("data poll complete")
        
        // Fetch the thread details to get the response
        const threadDetails = await openai.beta.threads.messages.list(newdataRun.thread_id);
        console.timeLog("thread details: ", threadDetails.data)
        const dataText = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content[0].text.value;
        console.log("data generated: ", dataText )

        // Success message
        return res.status(200).json({ message: "API executed successfully", analysis: dataText, file_id: file.id });
            
    } catch (error) {
        console.log("an error occurred", error);
    }
}
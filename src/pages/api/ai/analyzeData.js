const fs = require('fs');
const os = require('os');
const path = require('path');

import OpenAI from "openai"
import { pollRunStatus } from "./aiUtils";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_SECRET,
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

        fs.writeFileSync(tempFilePath, JSON.stringify(req.body.data[0]));

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
            name: "MajicFinger",
            instructions:
                "You are a data analysis expert and you have access to data files to answer user questions about the data. You can conduct data analysis, infer logic from the data, and also provide advice on interesting patterns that the data reveals.",
            model: "gpt-4-turbo-preview",
            tools: [{"type": "retrieval"}],
            file_ids: [file.id],
        });

        console.log("added assistant: ", assistant.id)

        const newdataRun = await openai.beta.threads.createAndRun({
            assistant_id: assistant.id,
            thread: {
                messages: [{ role: "user", content: `As you are a data analyst, please give me a summary of the data in the file as a data analyst would do.` }]
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

        // Success message
        return res.status(200).json({ message: "API executed successfully", analysis: dataText, file_id: file.id });
            
    } catch (error) {
        console.log("an error occurred", error);
    }
}
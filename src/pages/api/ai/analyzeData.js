const fs = require('fs');
const os = require('os');
const path = require('path');

import OpenAI from "openai"
import { pollRunStatus } from "./aiUtils";

import AiUsage from "@/models/AiUsages";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId
import dbConnect from "@/lib/dbConnect";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_DEV_SECRET,
})

export default async (req, res) => {
    try {
        if (!req.body.data) {
            return res.status(400).json({ error: "No data provided" });
        }
        if(req.body.thread_id){
            console.log("Thread ID supplied. Appending to thread")
            let file
            if(req.body.data){
                const tempFilePath = path.join(os.tmpdir(), 'tempfile.json');

                fs.writeFileSync(tempFilePath, JSON.stringify(req.body.data));

                const fileStream = fs.createReadStream(tempFilePath);

                console.log("Uploading file")

                file = await openai.files.create({
                    file: fileStream,
                    purpose: "assistants",
                })
                console.log("File uploaded: ", file.id)
            }

            // Create a new run in the existing thread
            const newMessage = {
                role: 'user',
                content: req.body.prompt,
                attachments: file ? [{ file_id: file.id, tools: [{ type: 'code_interpreter' }] }] : [],
            };

            const newdataRun = await openai.beta.threads.runs.create(
                req.body.thread_id, 
                {
                    assistant_id: req.body.assistant_id
                },
                {
                messages: [newMessage],
                }
            );
            

            console.log("Polling to check data run")
            const completedRun = await pollRunStatus(newdataRun.thread_id, newdataRun.id);
            console.log("data poll complete")
            console.log("completed RUn log: ", completedRun)
            // Fetch the thread details to get the response

            const threadDetails = await openai.beta.threads.messages.list(newdataRun.thread_id);
            console.log("pliminary thread details log: ", threadDetails)

            const responseContent = threadDetails.data.find(msg => msg.role === 'assistant' && msg.run_id === newdataRun.id)?.content;
            
            // Save usage data in MongoDB
            const newUsage = new AiUsage({
                assistant_id: completedRun.assistant_id,
                thread_id: completedRun.thread_id,
                started_at: new Date(completedRun.started_at * 1000),
                completed_at: new Date(completedRun.completed_at * 1000),
                usage: completedRun.usage,
                user_id: req.body.user_id, // Ensure user_id is provided in the request body
                data_set_id: req.body.data_set_id, // Ensure data_set_id is provided in the request body
                res_content: threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content
            });

            await newUsage.save()
            console.log('Usage data saved!');

            console.log("this is where teh error normally is: ", threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content)

            const dataText = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content[0].text.value;

            console.log("data generated: ", dataText )

            // Success message
            return res.status(200).json({ message: "API executed successfully", analysis: dataText, file_id: file?.id, assistant_id: completedRun.assistant_id, thread_id: completedRun.thread_id, data_set_id: req.body.data_set_id, backup: responseContent});
        } else{
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
                    "You are a expert data analysis and you have access to the json data attached. You can conduct data analysis, infer logic from the data, and also provide advice on interesting patterns that the data reveals.",
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
                    messages: [{ role: "user", content: req.body.prompt }]
                }
            });
            

            console.log("Polling to check data run")
            const completedRun = await pollRunStatus(newdataRun.thread_id, newdataRun.id);
            console.log("data poll complete")
            console.log("completed RUn log: ", completedRun)
            // Fetch the thread details to get the response

            const threadDetails = await openai.beta.threads.messages.list(newdataRun.thread_id);
            console.log("pliminary thread details log: ", threadDetails)
            console.timeLog("thread details: ", threadDetails.data)
            
            // Save usage data in MongoDB
            const newUsage = await AiUsage.create({
                assistant_id: completedRun.assistant_id,
                thread_id: completedRun.thread_id,
                started_at: new Date(completedRun.started_at * 1000),
                completed_at: new Date(completedRun.completed_at * 1000),
                usage: completedRun.usage,
                user_id: req.body.user_id, // Ensure user_id is provided in the request body
                data_set_id: req.body.data_set_id, // Ensure data_set_id is provided in the request body
                res_content: threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content
            });

            let backup = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content

            const dataText = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content[0].text.value;

            console.log("data generated: ", dataText )

            // Success message
            return res.status(200).json({ message: "API executed successfully", analysis: dataText, file_id: file.id, assistant_id: completedRun.assistant_id, thread_id: completedRun.thread_id, usage: completedRun.usage, data_set_id: req.body.data_set_id, backup: backup});
        }
            
    } catch (error) {
        console.log("an error occurred", error);
    }
}
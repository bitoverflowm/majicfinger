const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch'); // Ensure node-fetch is installed and required

import OpenAI from "openai";
import { pollRunStatus } from "./aiUtils";

import AiUsage from "@/models/AiUsages";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId
import dbConnect from "@/lib/dbConnect";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_DEV_SECRET,
});


export default async (req, res) => {
    try {
        if (!req.body.imageUrl) {
            return res.status(400).json({ error: "No image provided" });
        }
        
        console.log("file received hitting direct vision AI")
        //

        // create request
        const scrapedResponse = await openai.chat.completions.create({
            model : "gpt-4o",
            messages:[
                {
                    role: "user",
                    content: [
                        {type: "text", text: `You are a data gatherer. Attached is an image of a website that contains information. Respond with a JSON object with columns indicated in this array:
                        ${JSON.stringify(req.body.columns.reduce((acc, column) => ({ ...acc, [column]: 'float' }), {}), null, 4)}
                        `},
                        {
                            type: "image_url",
                            image_url: {
                                "url": req.body.imageUrl,
                            },
                        }

                    ]
                }
            ],
        });

        console.log('scrapedResponse: ', scrapedResponse)
        console.log('scrapedResponse message: ', scrapedResponse.choices[0].message)

        const messageContent = scrapedResponse.choices[0].message.content;
        return res.status(200).json({ message: "API executed successfully", response: { role: "assistant", content: messageContent } });

    } catch (error) {
        console.log("an error occurred", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};




/*

const downloadImage = async (imageUrl, outputFilePath) => {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputFilePath, buffer);
    console.log(`Image downloaded and saved to ${outputFilePath}`);
};

export default async (req, res) => {
    try {
        if (!req.body.imageUrl) {
            return res.status(400).json({ error: "No image provided" });
        }

        console.log("setting file stream");
        const tempFilePath = path.join(os.tmpdir(), 'tempfile.jpg'); // Changed to .jpg for image file
        await downloadImage(req.body.imageUrl, tempFilePath);

        const fileStream = fs.createReadStream(tempFilePath);

        console.log("Uploading file");

        const file = await openai.files.create({
            file: fileStream,
            purpose: "assistants",
        });

        console.log("File uploaded: ", file.id);

        console.log("Creating assistant");
        // create assistant
        const assistant = await openai.beta.assistants.create({
            name: "Lychee0",
            instructions: `You are a data gatherer. You have access to an image of a website that contains information. You will respond in the following JSON format:
            ${JSON.stringify(req.body.columns.reduce((acc, column) => ({ ...acc, [column]: 'float' }), {}), null, 4)}
            `,
            model: "gpt-4o",
            tools: [{ type: "code_interpreter" }],
            tool_resources: {
                "code_interpreter": {
                    "file_ids": [file.id]
                }
            }
        });

        console.log("added assistant: ", assistant.id);

        const newdataRun = await openai.beta.threads.createAndRun({
            assistant_id: assistant.id,
            thread: {
                messages: [{ role: "user", content: "Return the requested json object for the uploaded image and nothing else" }]
            }
        });

        console.log("Polling to check data run");
        const completedRun = await pollRunStatus(newdataRun.thread_id, newdataRun.id);
        console.log("data poll complete");
        console.log("completed Run log: ", completedRun);

        // Fetch the thread details to get the response
        const threadDetails = await openai.beta.threads.messages.list(newdataRun.thread_id);
        console.log("preliminary thread details log: ", threadDetails);
        console.timeLog("thread details: ", threadDetails.data);

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

        let backup = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content;

        const dataText = threadDetails.data.find(msg => msg.role === "assistant" && msg.run_id === newdataRun.id)?.content[0].text.value;

        console.log("data generated: ", dataText);

        // Success message
        return res.status(200).json({ message: "API executed successfully", analysis: dataText, file_id: file.id, assistant_id: completedRun.assistant_id, thread_id: completedRun.thread_id, usage: completedRun.usage, data_set_id: req.body.data_set_id, backup: backup });

    } catch (error) {
        console.log("an error occurred", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
*/
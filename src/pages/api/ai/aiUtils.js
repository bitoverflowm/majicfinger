
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_DEV_SECRET,
})

async function checkRunStatus(threadId, runId) {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    return runStatus;
}


// Polling mechanism
export async function pollRunStatus(threadId, runId, interval = 5000, timeout = 60000, analysisRun=null) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const intervalId = setInterval(async () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > timeout) {
                clearInterval(intervalId);
                reject(new Error("Timeout reached while waiting for run completion"));
            }

            const runStatus = await checkRunStatus(threadId, runId);
            console.log(runStatus.status)
            if (runStatus && runStatus.status === "completed") { // Check the correct property for completion
                clearInterval(intervalId);
                resolve(runStatus);
            }
        }, interval);
    });
}

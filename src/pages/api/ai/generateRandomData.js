import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_SECRET,
})

export default async (req, res) => {
    try{
        const data = await openai.chat.completions.create({
            messages: [{ role: "user", content: "generate a compltely random data set in csv format. Pick a random topic. Pick column labels for the data which should be on topic and relevant. Please provide only the data, without any additional explanations or text."}],
            model: "gpt-3.5-turbo",
            temperature: 0.5,
            max_tokens: 1000,
            top_p: 1,
          });
        const dataText = data.choices[0].message.content
        console.log(dataText);

        const maxChunkSize = 25000; // Adjust this value based on token limits
        const chunks = splitCsvIntoChunks(dataText, maxChunkSize);

        //const prompt = "Write React code to display the following CSV data as a table. The data is stored in a state variable called 'generatedData', which is an array of objects, each representing a row in the CSV. Please provide only the JSX code for rendering the table, assuming that 'data' is already available in the component's state. No need for state management code or imports, or const component declarations, or ```jsx markers only return whatever will go in the <table></table> section of the code. Don't provide any additonal explanations or text Please use tailwindcss for styling: ";

        /*TODO: we might just be able to remove this segment complete
        TO convert CSV into react table */
        
        /*
        const prompt = "Write React code to display the following CSV data as a table. Write out each <thead> <th> <tr> <tbody> <td> element. Do not use a map function. Please provide only the JSX code for rendering the table. No need for state management code or imports, or const component declarations, or ```jsx markers only return whatever will go in the <table></table> section of the code. Don't provide any additonal explanations or text Please use tailwindcss for styling: ";

        let combinedResponse = []

        for (let chunk of chunks) {
            const response = await openai.chat.completions.create({
                messages: [{ role: "user", content: prompt + chunk }],
                model: "gpt-3.5-turbo",
                temperature: 0.5,
                max_tokens: 3286,
                top_p: 1,
            });

            let tableCode = response.choices[0].message.content;
            //console.log(tableCode);
            combinedResponse.push(tableCode)
            // Assuming you handle the response to integrate with your frontend code
        }

        */

        //suggest which chart type to use to plot
        const summaryPrompt = "Here is the top few rows of my data, what would you say is the best way to graphically represent this data? What stastical analysis could present interesting insights on the data? Please respond in 2 arrays. 1st array is a list of ways that the data could be graphically represented. The 2nd array is a list of stastical analysis that could pose interesting insights. provide arrays in the following format [['','']['','','']]. Don't label the arrays as 1st array and 2nd array, just provide the arrays. Don't provide any additonal explanations or text."
        const summaryRes = await openai.chat.completions.create({
            messages: [{ role: "user", content: summaryPrompt + chunks[0] }],
            model: "gpt-3.5-turbo",
            temperature: 0.5,
            max_tokens: 3286,
            top_p: 1,
        });

        let summary = summaryRes.choices[0].message.content;
        console.log(summary)

        res.status(200).json({success: true, /*response: combinedResponse, data: getStateData(dataText),*/ data:dataText, summary: summary})
    }
    catch(err){
        throw err
    }
}


// Function to split CSV data into chunks
function splitCsvIntoChunks(csv, maxChunkSize) {
    const lines = csv.split('\n');
    let chunks = [];
    let currentChunk = [];

    lines.forEach(line => {
        currentChunk.push(line);
        // Join current chunk and check length
        if (currentChunk.join('\n').length > maxChunkSize) {
            // Remove the last line as it exceeded the chunk size
            currentChunk.pop();
            chunks.push(currentChunk.join('\n'));
            currentChunk = [line]; // Start a new chunk with the current line
        }
    });

    // Add the last chunk if it has data
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }

    return chunks;
}

function getStateData(data){
    // Split the raw data into lines
    const lines = data.split('\n').filter(line => line);

    // Remove the first line (Topic)
    lines.shift();

    // Extract headers
    const headers = lines.shift().split(',');

    // Map each line to an object
    const generatedData = lines.map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {});
    });

    return generatedData
}


//and return what type of chart will be the best way to present this data and why
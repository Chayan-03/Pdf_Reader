// // run_challenge1b.js
// import fs from "fs-extra" 
// import path from "path";


// // const fs = require("fs-extra");
// // const path = require("path");
// // You will need to import your 1A functions here
// // For this example, let's assume you've exported them from 'task1a.js'
// const { processFileAndGetRuns } = require("./task1a.js"); // You'll need to adapt your 1A code for this

// // 1. Load the AI model
// // Use an dynamic import for ES Modules
// async function initializeModel() {
//     const { pipeline } = await import("@xenova/transformers");
//     // This will download the model on first run and cache it for offline use
//     const extractor = await pipeline(
//         "feature-extraction",
//         "Xenova/all-MiniLM-L6-v2"
//     );
//     return extractor;
// }


// // Helper function for cosine similarity
// function cosineSimilarity(vecA, vecB) {
//     let dotProduct = 0;
//     let normA = 0;
//     let normB = 0;
//     for (let i = 0; i < vecA.length; i++) {
//         dotProduct += vecA[i] * vecB[i];
//         normA += vecA[i] * vecA[i];
//         normB += vecB[i] * vecB[i];
//     }
//     return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
// }


// async function main() {
//     console.log("Initializing AI Model...");
//     const extractor = await initializeModel();
//     console.log("Model Initialized.");

//     // --- Configuration for a specific collection ---
//     const collectionDir = path.resolve(__dirname, "Collection 1"); // Example
//     const inputPath = path.join(collectionDir, "challenge1b_input.json");
//     const outputPath = path.join(collectionDir, "challenge1b_output.json");
//     const pdfsDir = path.join(collectionDir, "PDFs");

//     // 2. Read the input JSON
//     const inputData = await fs.readJson(inputPath);
//     const { persona, job_to_be_done, documents } = inputData;
//     const contextText = `Persona: ${persona.role}. Task: ${job_to_be_done.task}`;

//     // 3. Get text chunks from all PDFs using your 1A logic
//     console.log("Processing PDF documents...");
//     let allContentRuns = [];
//     for (const doc of documents) {
//         // You need to adapt your 1A code to be callable like this
//         const runs = await processFileAndGetRuns(path.join(pdfsDir, doc.filename));
//         allContentRuns.push(...runs);
//     }
//     console.log(`Extracted ${allContentRuns.length} text chunks.`);

//     // 4. Generate embeddings
//     console.log("Generating embeddings...");
//     const contextEmbedding = (await extractor(contextText, { pooling: "mean", normalize: true })).data;
    
//     const contentEmbeddings = await Promise.all(
//         allContentRuns.map(run => 
//             extractor(run.text, { pooling: "mean", normalize: true })
//             .then(result => result.data)
//         )
//     );

//     // 5. Calculate relevance and rank
//     console.log("Calculating relevance scores...");
//     const rankedRuns = allContentRuns.map((run, i) => ({
//         ...run,
//         relevance: cosineSimilarity(contextEmbedding, contentEmbeddings[i]),
//     })).sort((a, b) => b.relevance - a.relevance);

//     // 6. Format the final output JSON
//     console.log("Generating final output...");
//     const outputJson = {
//         metadata: {
//             input_documents: documents.map(d => d.filename),
//             persona: persona.role,
//             job_to_be_done: job_to_be_done.task,
//             processing_timestamp: new Date().toISOString(),
//         },
//         extracted_sections: rankedRuns.map((run, i) => ({
//             document: run.fileName, // Your 1A logic needs to add fileName to each run
//             section_title: run.level === "P" ? `Content from page ${run.page}` : run.text.substring(0, 80),
//             importance_rank: i + 1,
//             page_number: run.page,
//         })),
//         // For subsection_analysis, you could re-run the process on sentences
//         // within the top 5 ranked runs for a more "refined_text".
//         subsection_analysis: [],
//     };

//     await fs.writeJson(outputPath, outputJson, { spaces: 2 });
//     console.log(`✅ Success! Output written to ${outputPath}`);
// }

// main().catch(console.error);

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from 'url';

// Import the function from your refactored task1a.js
import { processFileAndGetRuns } from "./task1a.js";

// Helper to get the correct directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- AI and Helper Functions ---

async function initializeModel() {
    const { pipeline } = await import("@xenova/transformers");
    console.log("Initializing AI Model (will download on first run)...");
    const extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Model Initialized.");
    return extractor;
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Main Execution Logic ---

async function main() {
    const extractor = await initializeModel();

    const collectionDir = path.resolve(__dirname, "Collection 1");
    const inputPath = path.join(collectionDir, "challenge1b_input.json");
    const outputPath = path.join(collectionDir, "challenge1b_output.json");
    const pdfsDir = path.join(collectionDir, "PDFs");

    const inputData = await fs.readJson(inputPath);
    const { persona, job_to_be_done, documents } = inputData;
    const contextText = `Persona: ${persona.role}. Task: ${job_to_be_done.task}`;

    console.log("Processing PDF documents...");
    let allContentRuns = [];
    for (const doc of documents) {
        const fullPath = path.join(pdfsDir, doc.filename);
        console.log(`- Extracting from ${doc.filename}`);
        const runs = await processFileAndGetRuns(fullPath);
        allContentRuns.push(...runs);
    }
    console.log(`Extracted ${allContentRuns.length} total text chunks.`);

    console.log("Generating embeddings...");
    const contextEmbedding = (await extractor(contextText, { pooling: "mean", normalize: true })).data;
    
    const contentEmbeddings = await Promise.all(
        allContentRuns.map(run =>
            extractor(run.text, { pooling: "mean", normalize: true })
            .then(result => result.data)
        )
    );

    console.log("Calculating relevance scores...");
    const rankedRuns = allContentRuns.map((run, i) => ({
        ...run,
        relevance: cosineSimilarity(contextEmbedding, contentEmbeddings[i]),
    })).sort((a, b) => b.relevance - a.relevance);

    console.log("Generating final output...");
    const outputJson = {
        metadata: {
            input_documents: documents.map(d => d.filename),
            persona: persona.role,
            job_to_be_done: job_to_be_done.task,
            processing_timestamp: new Date().toISOString(),
        },
        extracted_sections: rankedRuns.map((run, i) => ({
            document: run.fileName,
            section_title: run.level === "P" ? `Content from page ${run.page}` : run.text.substring(0, 80),
            importance_rank: i + 1,
            page_number: run.page,
        })),
        subsection_analysis: [], // This can be implemented as a next step
    };

    await fs.writeJson(outputPath, outputJson, { spaces: 2 });
    console.log(`✅ Success! Output written to ${outputPath}`);
}

main().catch(console.error);
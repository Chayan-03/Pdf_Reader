


// const fs = require("fs-extra");
// const path = require("path");

// // Attempt to polyfill DOMMatrix and Path2D for Node-based rendering in pdf.js
// try {
//   const { DOMMatrix, Path2D } = require("canvas");
//   global.DOMMatrix = DOMMatrix;
//   global.Path2D = Path2D;
// } catch {
//   // If 'canvas' isn't installed, rendering warnings may appear but core extraction still works
// }

// // Load the legacy Node build of pdf.js and configure its worker
// const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
// pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve(
//   "pdfjs-dist/legacy/build/pdf.worker.js"
// );

// // Directories for input PDFs and output JSON
// const INPUT_DIR = path.resolve(__dirname, "input");
// const OUTPUT_DIR = path.resolve(__dirname, "output");

// /**
//  * extractOutline: Reads the built-in PDF outline (bookmarks) if available.
//  * Returns an array of { level, text, page } or null if no outline.
//  */
// async function extractOutline(pdfDoc) {
//   const outline = await pdfDoc.getOutline();
//   if (!outline || outline.length === 0) return null;
//   const results = [];

//   // Recursive walker to traverse nested outline items
//   async function walk(items, level) {
//     for (const item of items) {
//       let page = null;
//       try {
//         // Resolve destination to a page reference
//         const dest = Array.isArray(item.dest)
//           ? item.dest
//           : await pdfDoc.getDestination(item.dest);
//         if (dest && dest[0]) {
//           const idx = await pdfDoc.getPageIndex(dest[0]);
//           page = idx + 1;
//         }
//       } catch {
//         // Ignore any resolution errors
//       }

//       // Push the outline entry (limit depth to H3)
//       results.push({
//         level: `H${Math.min(level, 3)}`,
//         text: item.title.trim(),
//         page,
//       });

//       // Recurse into child items
//       if (item.items && item.items.length) {
//         await walk(item.items, level + 1);
//       }
//     }
//   }

//   await walk(outline, 1);
//   return results;
// }

// /**
//  * extractByFontMetrics: Fallback extraction when no built-in outline exists.
//  * Uses font-size clustering to distinguish headings (H1/H2/H3) vs. paragraphs (P).
//  * Returns merged runs in reading order: { level, text, page }.
//  */
// async function extractByFontMetrics(pdfDoc) {
//   const numPages = pdfDoc.numPages;
//   const allRuns = [];

//   // 1) Extract every text item with its computed font size and vertical position
//   for (let i = 1; i <= numPages; i++) {
//     const page = await pdfDoc.getPage(i);
//     const tc = await page.getTextContent();

//     tc.items.forEach((item) => {
//       const text = item.str.trim();
//       if (!text) return;

//       // Compute font size from transform matrix
//       const [a, , , d, , y] = item.transform;
//       const size = Math.hypot(a, d);

//       allRuns.push({ page: i, text, size, y });
//     });
//   }

//   // 2) Count frequencies of each font size
//   const sizeCounts = allRuns.reduce((m, r) => {
//     m[r.size] = (m[r.size] || 0) + 1;
//     return m;
//   }, {});

//   // 3) Pick the top 3 most frequent sizes as H1, H2, H3
//   const headingSizes = Object.keys(sizeCounts)
//     .map(Number)
//     .sort((a, b) => sizeCounts[b] - sizeCounts[a])
//     .slice(0, 3);

//   const sizeToLevel = {};
//   headingSizes.forEach((s, idx) => {
//     sizeToLevel[s] = `H${idx + 1}`;
//   });

//   // 4) Classify each run as heading or paragraph
//   const runs = allRuns.map((r) => ({
//     level: sizeToLevel[r.size] || "P",
//     text: r.text,
//     page: r.page,
//     y: r.y,
//   }));

//   // 5) Sort runs by page number, then top-to-bottom on the page
//   runs.sort((a, b) => a.page - b.page || b.y - a.y);

//   // 6) Merge consecutive runs of the same level on the same page
//   const merged = [];
//   runs.forEach((item) => {
//     const prev = merged[merged.length - 1];
//     if (prev && prev.level === item.level && prev.page === item.page) {
//       prev.text += " " + item.text;
//     } else {
//       merged.push({ level: item.level, text: item.text, page: item.page });
//     }
//   });

//   return merged;
// }

// /**
//  * processFile: Load a PDF, extract outline or fallback text runs,
//  * derive a title, then write the final JSON.
//  */
// async function processFile(fileName) {
//   const inPath = path.join(INPUT_DIR, fileName);
//   const outPath = path.join(OUTPUT_DIR, fileName.replace(/\.pdf$/i, ".json"));

//   // Load the PDF document
//   const pdfDoc = await await pdfjsLib.getDocument(inPath).promise;

//   // Attempt built-in outline first
//   let contentRuns = await extractOutline(pdfDoc);

//   // Fallback to font-metrics method if no outline
//   if (!contentRuns) {
//     contentRuns = await extractByFontMetrics(pdfDoc);
//   }

//   // Title: take first H1 if multi-heading PDF; else leave empty
//   let title = "";
//   const h1Runs = contentRuns.filter((r) => r.level === "H1");
//   if (
//     !(pdfDoc.numPages === 1 && h1Runs.length === 1 && contentRuns.length === 1)
//   ) {
//     if (h1Runs.length) {
//       title = h1Runs[0].text;
//       // Remove only the first H1 occurrence
//       const idx = contentRuns.findIndex(
//         (r) => r.level === "H1" && r.text === title
//       );
//       if (idx >= 0) contentRuns.splice(idx, 1);
//     }
//   }

//   // Ensure output directory exists, then write JSON
//   await fs.ensureDir(OUTPUT_DIR);
//   await fs.writeJson(outPath, { title, outline: contentRuns }, { spaces: 2 });
//   console.log(`Processed ${fileName}`);
// }

// // Main: iterate over all PDFs in input folder
// (async () => {
//   await fs.ensureDir(INPUT_DIR);
//   const files = await fs.readdir(INPUT_DIR);
//   for (const f of files.filter((f) => f.toLowerCase().endsWith(".pdf"))) {
//     try {
//       await processFile(f);
//     } catch (e) {
//       console.error(`Error processing ${f}:`, e.message);
//     }
//   }
// })();


import fs from "fs-extra";
import path from "path";
// import * as pdfjsLib from 'pdfjs-dist';
import pdfjsLib from 'pdfjs-dist';

// // Configure the worker script for pdf.js
// pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';
// This is the correct path
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js';

// --- Internal Helper Functions (from your original code) ---

async function extractOutline(pdfDoc) {
    const outline = await pdfDoc.getOutline();
    if (!outline || outline.length === 0) return null;
    const results = [];
    async function walk(items, level) {
        for (const item of items) {
            let page = null;
            try {
                const dest = Array.isArray(item.dest) ?
                    item.dest :
                    await pdfDoc.getDestination(item.dest);
                if (dest && dest[0]) {
                    const idx = await pdfDoc.getPageIndex(dest[0]);
                    page = idx + 1;
                }
            } catch {}
            results.push({
                level: `H${Math.min(level, 3)}`,
                text: item.title.trim(),
                page,
            });
            if (item.items && item.items.length) {
                await walk(item.items, level + 1);
            }
        }
    }
    await walk(outline, 1);
    return results;
}

async function extractByFontMetrics(pdfDoc) {
    const numPages = pdfDoc.numPages;
    const allRuns = [];
    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const tc = await page.getTextContent();
        tc.items.forEach((item) => {
            const text = item.str.trim();
            if (!text) return;
            const [a, , , d, , y] = item.transform;
            const size = Math.hypot(a, d);
            allRuns.push({ page: i, text, size, y });
        });
    }
    const sizeCounts = allRuns.reduce((m, r) => {
        m[r.size] = (m[r.size] || 0) + 1;
        return m;
    }, {});
    const headingSizes = Object.keys(sizeCounts)
        .map(Number)
        .sort((a, b) => sizeCounts[b] - sizeCounts[a])
        .slice(0, 3);
    const sizeToLevel = {};
    headingSizes.forEach((s, idx) => {
        sizeToLevel[s] = `H${idx + 1}`;
    });
    const runs = allRuns.map((r) => ({
        level: sizeToLevel[r.size] || "P",
        text: r.text,
        page: r.page,
        y: r.y,
    }));
    runs.sort((a, b) => a.page - b.page || b.y - a.y);
    const merged = [];
    runs.forEach((item) => {
        const prev = merged[merged.length - 1];
        if (prev && prev.level === item.level && prev.page === item.page) {
            prev.text += " " + item.text;
        } else {
            merged.push({ level: item.level, text: item.text, page: item.page });
        }
    });
    return merged;
}


// --- EXPORTED FUNCTION FOR 1B ---
// This is the new main function that run_challenge1b.js will call.
export async function processFileAndGetRuns(inPath) {
    const fileName = path.basename(inPath);
    const pdfDoc = await pdfjsLib.getDocument(inPath).promise;

    // Attempt built-in outline first
    let contentRuns = await extractOutline(pdfDoc);

    // Fallback to font-metrics method if no outline
    if (!contentRuns) {
        contentRuns = await extractByFontMetrics(pdfDoc);
    }

    // Add the source filename to each run for later reference
    contentRuns.forEach(run => {
        run.fileName = fileName;
    });

    return contentRuns;
}
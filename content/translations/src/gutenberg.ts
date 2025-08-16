// src/gutenberg.ts
import fetch from "node-fetch";
import { htmlToText } from "html-to-text";

export interface GutendexBookData {
   id: number;
   title: string;
   authors: { name: string }[];
   download_count: number;
   formats: Record<string, string>;
}

export interface GutenbergResult {
   id: number;
   title: string;
   authors: string[];
   downloadCount: number;
   formats: Record<string, string>;
}

// we prefer actual text if available, else html, etc.
const PREFERRED_FORMATS = [
   // highest priority for text
   "text/plain; charset=utf-8",
   "text/plain",
   // fallback to html if needed
   "text/html; charset=utf-8",
   "text/html"
];

/**
 * search gutendex
 */
export async function gutendexSearch(query: string): Promise<GutenbergResult[]> {
   const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
   const res = await fetch(url);
   if (!res.ok) {
      throw new Error(`gutendex search failed: ${res.status}`);
   }
   const jsonData = (await res.json()) as { results: GutendexBookData[] };

   return jsonData.results.map((item) => ({
      id: item.id,
      title: item.title,
      authors: item.authors.map((a) => a.name),
      downloadCount: item.download_count,
      formats: item.formats,
   }));
}

/**
 * pick the best format from the gutendex data
 */
function pickBestFormat(formats: Record<string, string>) {
   for (const fmt of PREFERRED_FORMATS) {
      if (formats[fmt]) {
         return { chosenFormat: fmt, downloadUrl: formats[fmt] };
      }
   }
   throw new Error("no recognized text/plain or text/html format in gutendex data");
}

/**
 * fetch the raw text from project gutenberg
 *
 * if we get 'text/plain', we store exactly that
 * if we only have 'text/html', we fetch it, then convert the markup to raw text
 */
export async function fetchBookText(bookId: number) {
   console.log(`fetchBookText: requesting metadata from gutendex for bookId=${bookId}`);
   const metadataUrl = `https://gutendex.com/books/${bookId}`;
   const metaRes = await fetch(metadataUrl);
   if (!metaRes.ok) {
      throw new Error(`failed to fetch metadata for book ${bookId}`);
   }
   const data = (await metaRes.json()) as GutendexBookData;

   const title: string = data.title;
   const authors: string[] = data.authors.map((a) => a.name) || ["unknown"];

   const { chosenFormat, downloadUrl } = pickBestFormat(data.formats);

   console.log(
      `fetchBookText: chosenFormat="${chosenFormat}", downloadUrl="${downloadUrl}"`
   );
   const textRes = await fetch(downloadUrl);
   if (!textRes.ok) {
      throw new Error(`failed to download text from ${downloadUrl}`);
   }
   const buf = await textRes.arrayBuffer();
   const utf8 = new TextDecoder("utf-8").decode(buf);

   let finalText = utf8;
   if (chosenFormat.includes("text/html")) {
      // convert to raw text from html
      finalText = htmlToText(utf8, {
         wordwrap: false,
         // additional config to tweak if you want, e.g.:
         // selectors: [{ selector: 'img', format: 'skip' }],
      });
   }

   return {
      title,
      authors,
      text: finalText,
   };
}

// src/chunk.ts
export const DEFAULT_CHUNK_SIZE = 18000

export function flexibleChunkText(fullText: string, maxSize = DEFAULT_CHUNK_SIZE): string[] {
   let paragraphs = fullText.split("\n\n")
   if (paragraphs.length < 2) {
      paragraphs = fullText.split("\n")
   }

   const chunks: string[] = []
   let current: string[] = []
   let currentSize = 0

   for (const para of paragraphs) {
      const sizeWithBuffer = para.length + 2
      if (currentSize + sizeWithBuffer > maxSize) {
         chunks.push(current.join("\n\n"))
         current = [para]
         currentSize = sizeWithBuffer
      } else {
         current.push(para)
         currentSize += sizeWithBuffer
      }
   }
   if (current.length) {
      chunks.push(current.join("\n\n"))
   }
   return chunks
}

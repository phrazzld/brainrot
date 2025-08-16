// src/cli.ts
import chalk from "chalk";
import { Command } from "commander";
import * as fs from "fs";
import ora from "ora";
import * as path from "path";
import { fetchBookText, gutendexSearch } from "./gutenberg";
import { translateFullText } from "./translator";

const program = new Command();

program
   .name("brainrot-translations")
   .description("cli for searching and translating public domain books w meltdown-tier slang");

program
   .command("search")
   .description("search project gutenberg for a title/author")
   .argument("<query>", "search query")
   .option("--limit <number>", "limit search results", "5")
   .action(async (query: string, options: { limit: string }) => {
      const spinner = ora(chalk.greenBright("searching...")).start();
      try {
         const results = await gutendexSearch(query);
         spinner.succeed(`found ${results.length} results for "${query}"`);
         const limit = parseInt(options.limit, 10);
         console.log(chalk.blueBright("\nTop results:"));
         results.slice(0, limit).forEach((b, i) => {
            console.log(
               chalk.yellow(
                  `[${i + 1}] id=${b.id}  title="${b.title}"  authors="${b.authors.join(", ")}"  downloads=${b.downloadCount}`
               )
            );
         });
      } catch (err) {
         spinner.fail(chalk.red("search failed"));
         console.error(err);
         process.exit(1);
      }
   });

program
   .command("translate")
   .requiredOption("--bookId <number>", "the gutendex book id")
   .option("--model <string>", "which model to use", "o3-mini")
   .option("--notes <string>", "extra notes to pass to system prompt", "")
   .action(async (opts: { bookId: string; model: string; notes: string }) => {
      const { bookId, model, notes } = opts;
      const fetchSpinner = ora(chalk.greenBright(`fetching book id=${bookId}...`)).start();
      try {
         const { title, authors, text } = await fetchBookText(Number(bookId));
         fetchSpinner.succeed(`fetched "${title}" (length=${text.length})`);

         const spinner = ora(chalk.cyanBright(`translating using model=${model}...`)).start();
         const translation = await translateFullText(text, authors.join(", "), title, {
            model,
            notes,
            openaiApiKey: process.env.OPENAI_API_KEY,
            openrouterApiKey: process.env.OPENROUTER_API_KEY,
         });
         spinner.succeed(chalk.cyanBright("translation done!"));

         // store files
         const slug = title.replace(/\W+/g, "_").toLowerCase();
         const dirPath = path.join("translations", slug);
         fs.mkdirSync(dirPath, { recursive: true });

         fs.writeFileSync(path.join(dirPath, "source.txt"), text, "utf-8");
         fs.writeFileSync(path.join(dirPath, "translation.txt"), translation, "utf-8");

         const meta = {
            title,
            authors,
            modelUsed: model,
            date: new Date().toISOString(),
            notes,
         };
         fs.writeFileSync(path.join(dirPath, "metadata.json"), JSON.stringify(meta, null, 2), "utf-8");
         console.log(chalk.greenBright("done! stored to:"), dirPath);
      } catch (err) {
         fetchSpinner.fail(chalk.red("error during translation"));
         console.error(err);
         process.exit(1);
      }
   });

program.parseAsync(process.argv).catch((err) => {
   console.error(chalk.red("cli error:"), err);
   process.exit(1);
});

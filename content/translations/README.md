# brainrot-translations

a node.js cli that searches project gutenberg (via gutendex) and translates public-domain texts into meltdown-tier gen-z/alpha slang. powered by openai or openrouter.

## features
- search: look up books by title or author on project gutenberg
- translate: fetch the text and rewrite it into extreme meltdown slang (based on the system prompt)

## prerequisites
- node.js (v18+ recommended)
- npm
- an openai api key (if using openai models) or an openrouter api key (if using openrouter models)

## installation
```bash
git clone https://github.com/yourusername/brainrot-translations.git
cd brainrot-translations
npm install
npm run build
```

## usage

to see available commands:
```
node dist/cli.js --help
```

### search

search for books:

`npm run search "pride and prejudice"`

### translate

translate a book by its gutenberg id:

`npm run translate -- --bookId 12345`

the script fetches the text, splits it into chunks, and then sends each chunk to your chosen model for meltdown-tier rewriting.

## configuration
- set the model argument (e.g., --model o3-mini) to choose which model you want to use. see OPENAI_MODELS and OPENROUTER_MODELS in src/translator.ts.

## project structure
- src/cli.ts: main cli entry points (search and translate commands)
- src/gutenberg.ts: handles gutendex api calls and text fetching
- src/chunk.ts: splits text into manageable chunks
- src/prompts.ts: constructs the system and user prompts
- src/translator.ts: orchestrates translation calls to openai or openrouter

# BrainRot Vision

Status: canonical root vision for BrainRot Publishing House. The repo is a
creative publishing lab first; revise this file when the publishing ambition,
format strategy, or translation philosophy changes.

## What BrainRot Is

BrainRot is a creative publishing platform for transforming public-domain
classics into absurd, faithful, high-craft cultural artifacts. The initial wedge
is brain-rot and meme-culture translations of canonical works — the Iliad, the
Odyssey, Shakespeare, Gilgamesh, and other public-domain texts — packaged as web
editions, ebooks, and physical books that take the object seriously even when
the translation is intentionally ridiculous.

The joke only works when both halves are real. The prose can be skibidi nonsense
and still carry the plot, characters, and emotional movement of the original.
The physical edition can be funny and still be a beautiful hardcover worth
owning.

## North Star

Make public-domain classics newly entertaining without hollowing them out:
faithful enough that the original story is still there, funny enough that a
reader wants to show a friend, and produced with enough craft that the book does
not feel like disposable AI slop.

## What Must Stay True

- Public-domain rights and source provenance are product constraints. Do not
  build publishing workflows around works we cannot legally transform and sell.
- Translation style is a deliberate artistic language, not random slang
  sprinkling. Follow the repo's methodology before generating or editing text.
- Faithfulness matters. A reader should be able to understand the actual story
  through the joke.
- Physical quality matters. KDP/Lulu/manual publishing workflows should move
  toward beautiful hardcovers, clean interiors, strong covers, and reliable
  metadata instead of merely dumping generated text into a file.
- Automation should remove publishing drudgery, not artistic judgment. Scripts,
  skills, and agents should help with conversion, layout, cover workflows,
  validation, metadata, storefront prep, and repeatable releases.
- AI images, graphic novel panels, and generated layouts require visual
  consistency checks. A gorgeous book with incoherent art direction is not done.

## What BrainRot Refuses

- Copyright-risk shortcuts.
- Translations that are funny but unfaithful enough to become a different work
  by accident.
- Low-effort AI artifact churn: malformed interiors, inconsistent covers,
  broken metadata, missing front matter, or unreviewed generated art.
- A pure web-content farm that forgets the physical book ambition.
- Automation that erases the weird human taste that makes the premise work.

## Current Bets

1. Make one high-craft physical public-domain classic edition the first revenue
   wedge, with the web edition serving proof, sampling, and audience growth.
2. Keep the brain-rot classic translation pipeline coherent and repeatable.
3. Automate more of the expensive manual path: book validation, format
   generation, front matter, covers, KDP/Lulu preparation, and publishing
   receipts.
4. Push physical editions toward intentionally high-quality objects: clothbound
   or premium hardcover taste where feasible, not novelty-paperback defaults.
5. Explore graphic novels and illustrated editions once image generation and
   art-direction workflows can preserve style across pages.
6. Treat scripts and agent workflows as product infrastructure so one good
   publishing process can create many good books.

## Ideal Form

A mature BrainRot run starts with a public-domain work and ends with a complete
release packet: translation source, provenance, editorial checks, generated
formats, cover and interior assets, storefront metadata, publishing receipts,
web edition, and a physical edition that can plausibly sit next to serious
classics while being completely unserious inside.

The long-term shape may include parallel editions: original language or source
translation on one side, brain-rot transformation on the other; faithful comic
or manga adaptations; free online editions; and premium physical runs. The
common thread is the same: old texts made funny, legible, and beautiful through
repeatable AI-assisted publishing craft.

## Where The Depth Lives

- `AGENTS.md` is the repo operating guide.
- `README.md` explains the monorepo and publishing surfaces.
- `TRANSLATION_GUIDELINES.md` defines the translation methodology.
- `content/translations/` holds source books, generated structure, and book
  package inputs.
- `apps/publisher/` owns publishing automation.
- `packages/@brainrot/converter` and `packages/@brainrot/templates` own format
  and layout conversion.

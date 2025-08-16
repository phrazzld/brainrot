#!/usr/bin/env python3

import argparse
import os
import re

# define your expansions here
EXPANSIONS = {
    'fr': 'for real',
    'bffr': 'be fucking for real',
    'smh': 'ess-emm-h',
    'rn': 'right now',
    'asf': 'as fuck',
    'asl': 'as hell',
    'af': 'as fuck',
    'ngl': 'not gonna lie',
    'npc': 'en-pee-see',
    'npcs': 'en-pee-sees',
    'btw': 'bee-tee dubbs', # or 'by the way' or 'btw'
    'lmao': 'luhmao',
    'rofl': 'rahfull',
    'roflmao': 'rahfullmao',
    'ody': 'oh-dee',
    '411': 'four-one-one',
    'idk': 'eye-dee-kay',
    'idgaf': 'eye-dee-gaff',
    'rly': 'really',
    'dl': 'd-l',
    'details': 'deets',
    'op': 'o-p',
    'OP': 'o-p',
    'wtf': 'w-t-f',
    'bde': 'b-d-e', # or 'big dick energy'
}

def expand_abbreviations(text, expansions):
    """
    expands only when abbreviations appear as standalone words,
    ignoring partial matches like 'frances' or 'afternoon'
    """
    for short, replacement in expansions.items():
        # \b ensures word boundaries, so we only replace standalone tokens
        pattern = rf'\b{re.escape(short)}\b'
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text

def process_file(in_file, expansions):
    """ Read a single file, expand abbreviations, return expanded text. """
    with open(in_file, 'r', encoding='utf-8') as fin:
        original_text = fin.read()
    return expand_abbreviations(original_text, expansions)

def write_output(text, out_file):
    """ Write the expanded text to the specified output file. """
    with open(out_file, 'w', encoding='utf-8') as fout:
        fout.write(text)

def main():
    parser = argparse.ArgumentParser(
        description="expand certain slang abbreviations in .txt files."
    )
    parser.add_argument("input_path", help="path to a file OR directory")
    args = parser.parse_args()

    input_path = args.input_path

    # handle single file input
    if os.path.isfile(input_path):
        base, ext = os.path.splitext(input_path)
        if not ext.lower() == '.txt':
            print(f"warning: file {input_path} doesn't end with .txt (continuing anyway)")

        # if it's already something-processed.txt, just overwrite it
        if base.lower().endswith("-processed"):
            out_file = input_path
            print(f"filename ends with '-processed'; overwriting {out_file}")
        else:
            out_file = f"{base}-processed{ext}"

        expanded_text = process_file(input_path, EXPANSIONS)
        write_output(expanded_text, out_file)
        print(f"wrote processed file: {out_file}")

    # handle directory input
    elif os.path.isdir(input_path):
        all_files = os.listdir(input_path)
        txt_files = [f for f in all_files if f.lower().endswith('.txt')]
        if not txt_files:
            print("no .txt files found in this directory.")
            return

        for filename in txt_files:
            in_file = os.path.join(input_path, filename)
            base, ext = os.path.splitext(filename)
            if base.lower().endswith("-processed"):
                out_file = in_file
                print(f"filename '{filename}' ends with '-processed'; overwriting {out_file}")
            else:
                out_file = os.path.join(input_path, f"{base}-processed{ext}")

            expanded_text = process_file(in_file, EXPANSIONS)
            write_output(expanded_text, out_file)
            print(f"processed {filename} -> {os.path.basename(out_file)}")

    else:
        print(f"error: {input_path} is not a file or directory.")

if __name__ == "__main__":
    main()

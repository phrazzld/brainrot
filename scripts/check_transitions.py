#!/usr/bin/env python3
"""
Script to systematically check all chapter transitions in Plato's Republic
"""
import os
import re

def get_chapter_files():
    """Get all chapter files in order"""
    base_dir = "/Users/phaedrus/Development/brainrot/content/translations/books/platos-republic/chapters"
    
    # Get all chapter files and sort them properly
    files = []
    for f in os.listdir(base_dir):
        if f.startswith('book-') and f.endswith('.txt') and 'chapter-' in f:
            files.append(f)
    
    # Sort by book number then chapter number
    def sort_key(filename):
        match = re.match(r'book-(\d+)-chapter-(\d+)\.txt', filename)
        if match:
            return (int(match.group(1)), int(match.group(2)))
        return (0, 0)
    
    files.sort(key=sort_key)
    return [os.path.join(base_dir, f) for f in files]

def get_file_content_lines(filepath):
    """Get content lines from file, skipping headers"""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Skip header lines (title and separator)
    content_start = 0
    for i, line in enumerate(lines):
        if '====' in line:
            content_start = i + 1
            break
    
    # Get actual content lines (non-empty)
    content_lines = []
    for line in lines[content_start:]:
        stripped = line.strip()
        if stripped:
            content_lines.append(stripped)
    
    return content_lines

def check_transition(file1, file2):
    """Check transition between two chapter files"""
    print(f"\n=== Checking transition: {os.path.basename(file1)} -> {os.path.basename(file2)} ===")
    
    # Get content from both files
    content1 = get_file_content_lines(file1)
    content2 = get_file_content_lines(file2)
    
    if not content1 or not content2:
        print("ERROR: One of the files has no content")
        return False
    
    # Get last 3 lines of first file
    last_lines = content1[-3:] if len(content1) >= 3 else content1
    print("Last lines of current chapter:")
    for i, line in enumerate(last_lines, 1):
        print(f"  -{len(last_lines)-i+1}: {line}")
    
    # Get first 3 lines of second file
    first_lines = content2[:3] if len(content2) >= 3 else content2
    print("First lines of next chapter:")
    for i, line in enumerate(first_lines, 1):
        print(f"  +{i}: {line}")
    
    # Check for issues
    issues = []
    
    # Check for repeated content
    for last_line in last_lines:
        for first_line in first_lines:
            if last_line == first_line:
                issues.append(f"REPEATED CONTENT: '{last_line}'")
    
    # Check for incomplete sentences (basic heuristic)
    if last_lines:
        last_line = last_lines[-1]
        if not last_line.endswith(('.', '!', '?', '"', "'")) and not last_line.endswith(('."', "!'", '?"')):
            issues.append(f"POSSIBLE INCOMPLETE SENTENCE: '{last_line}'")
    
    # Check for dialogue flow
    if last_lines and first_lines:
        last_is_question = last_lines[-1].strip().endswith('?')
        first_is_answer = any(word in first_lines[0].lower() for word in ['yes', 'no', 'indeed', 'certainly', 'of course', 'i think', 'i believe'])
        
        if last_is_question and not first_is_answer:
            # This might be okay if it's a new speaker, but flag for review
            issues.append(f"POSSIBLE DIALOGUE BREAK: Question '{last_lines[-1]}' not followed by clear answer")
    
    if issues:
        print("ISSUES FOUND:")
        for issue in issues:
            print(f"  ⚠️  {issue}")
        return False
    else:
        print("✅ Transition looks good")
        return True

def main():
    chapter_files = get_chapter_files()
    print(f"Found {len(chapter_files)} chapter files")
    
    problematic_transitions = []
    
    # Check each transition
    for i in range(len(chapter_files) - 1):
        current_file = chapter_files[i]
        next_file = chapter_files[i + 1]
        
        is_good = check_transition(current_file, next_file)
        if not is_good:
            transition_name = f"{os.path.basename(current_file)} -> {os.path.basename(next_file)}"
            problematic_transitions.append(transition_name)
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total transitions checked: {len(chapter_files) - 1}")
    print(f"Problematic transitions: {len(problematic_transitions)}")
    
    if problematic_transitions:
        print("\nProblematic transitions:")
        for transition in problematic_transitions:
            print(f"  ❌ {transition}")
    else:
        print("✅ All transitions look good!")

if __name__ == "__main__":
    main()
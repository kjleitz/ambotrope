# Add Word Skill

Add a word to the Ambotrope game word list.

## Instructions

The user has invoked `/add-word` with args: "$ARGS"

Extract the word from the args. If no word was provided, ask the user what word they want to add.

Then:
1. Read `/Users/keegan/Development/ambotrope/packages/game/src/words.ts`
2. Check if the word is already in `DEFAULT_WORD_LIST`. If so, tell the user and stop.
3. Append the word as a new string entry at the end of the `DEFAULT_WORD_LIST` array (before the closing `]`), maintaining consistent formatting with the rest of the list.
4. Confirm the word was added.

Do not add the word to `DEFAULT_DISABLED_WORDS`.

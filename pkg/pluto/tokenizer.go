package pluto

import (
	s "strings"
)

//borrows from Apollo's tokenizer (but removes stemming step, which is not necessary) to remove
//stop words from the data before we calculate document vectors

var punctuation map[string]bool
var stopWords map[string]bool

//helper function to add word
func addWord(sb *s.Builder, tokens *[]string) {
	currWord := s.ToLower(sb.String())
	//make sure it's not a stop word before we append it to our list of tokens
	//use a heuristic that any one-length words are probably missing apostrophes so don't append (only I & a are one letter English
	//words, both of which should not be added anyway, so no collateral damage missing anything important)
	if _, isStopWord := stopWords[currWord]; !isStopWord && sb.Len() != 1 {
		*tokens = append(*tokens, currWord)
		corpus[currWord] = len(corpus)
	}
	//"empty" string builder or remove current word
	sb.Reset()
}

//tokenizes a source of text into a list of lowercase tokens with stop words and punctuation removed
func splitByWhiteSpace(source string) []string {
	tokens := make([]string, 0)
	var sb s.Builder

	for index := 0; index < len(source); index++ {
		char := string(source[index])
		_, isPunc := punctuation[char]
		if char == " " {
			addWord(&sb, &tokens)
		} else if source[index] == 10 {
			//check if this is a newline character, have to checkout without converting into string since that causes issues
			addWord(&sb, &tokens)
			sb.Reset()
		} else if isPunc {
			// continue to next iteration, don't write the string
			//check if this is an apostrophe since we should treat contractions as two words
			if sb.Len() != 0 && char == "'" {
				addWord(&sb, &tokens)
				//add ' into the new word to represent the contraction
				sb.Reset()
				sb.WriteString("'")
			}
			continue
		} else {
			//if not white space or punctuation marks, just continue to the next character so add it to current word
			//write it as a byte and not string for speed
			sb.WriteByte(source[index])
		}
	}
	//tokenize last word
	if sb.Len() != 0 {
		addWord(&sb, &tokens)
	}
	return tokens
}

func analyze(source string) []string {
	tokens := tokenize(source)
	return tokens
}

//takes in a source of text and converts into an array of stemmed tokens (filtering out stop words and punctuation)
//This gets called when ingesting new data and when searching
//TODO: or is it better to just "generateAllPossibleVarations" of a word on the client side, then wouldn't need to stem on the backend?
func tokenize(source string) []string {
	//careful of single quotes vs. appostrophe
	if len(punctuation) == 0 || len(stopWords) == 0 {
		initConstants()
	}
	return splitByWhiteSpace(source)
}

//load the sets for the first time to prevent repeated work
func initConstants() {
	punct := []string{".", "?", "!", ",", ":", ";", "-", "(", ")", "\"", "'", "{", "}", "[", "]", "#", "<", ">", "\\",
		"~", "*", "_", "|", "%", "/"}
	stop := []string{"i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "'re", "yours", "yourself", "yourselves", "he", "him",
		"his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
		"what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
		"have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as",
		"until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before",
		"after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then",
		"once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some",
		"such", "no", "nor", "not", "'t", "'nt", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don",
		"should", "now"}
	punctuation = make(map[string]bool)
	stopWords = make(map[string]bool)
	//convert array into a set-like structure for fast-lookups
	for _, each := range punct {
		punctuation[each] = true
	}

	for _, each := range stop {
		stopWords[each] = true
	}
}

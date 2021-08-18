package pluto

import (
	"bufio"
	"errors"
	"io"
	"log"
	"math"
	"sort"
	"strconv"
	"strings"
)

//model containing our embeddings
type Model struct {
	embeddings map[string][]float64
	vectorDim  int64
}

type modelParser struct {
	scanner *bufio.Scanner
}

func newParser(source io.Reader) modelParser {
	return modelParser{
		scanner: bufio.NewScanner(source),
	}
}

//given a scanner with a source containing an io.Reader, parses the model and returns
//our model
func (parser *modelParser) parse() (Model, error) {
	//note our pretrained model stores the data in a new-line delinated fashion, meaning
	//every line contains a word and its associated vector
	//the first line of our model contains the number of words and size of our vector dimension

	//move to the first bit of data, otherwise Text() will just return an empty value
	parser.scanner.Scan()
	//get first line to parse the "metadata" i.e. number of words and vector dimension
	firstLine := strings.Split(parser.scanner.Text(), " ")
	numberOfWords, errWords := strconv.ParseInt(firstLine[0], 10, 64)
	vecDim, errDim := strconv.ParseInt(firstLine[1], 10, 64)
	if errWords != nil || errDim != nil {
		if errWords != nil {
			log.Println("Error parsing the number of embeddings: ", errWords)
			return Model{}, errWords
		} else if errDim != nil {
			log.Println("Error parsing the dimension of embeddings: ", errDim)
			return Model{}, errDim
		}
	}
	model := Model{
		embeddings: make(map[string][]float64, numberOfWords),
		vectorDim:  vecDim,
	}

	for parser.scanner.Scan() {
		model.parseLine(parser.scanner.Text())
	}

	return model, nil
}

//parses a given string line and stores the resulting vector in the embeddings map
func (model *Model) parseLine(line string) error {
	data := strings.Split(line, " ")
	vector, err := parseFloatArrayFromString(data[1:])
	if err != nil {
		log.Println("Error processing word vector: ", err)
		return err
	}
	model.embeddings[data[0]] = vector
	return nil
}

func parseFloatArrayFromString(floatArray []string) ([]float64, error) {
	floatVector := make([]float64, len(floatArray))
	for i, val := range floatArray {
		floatVal, err := strconv.ParseFloat(val, 64)
		if err != nil {
			return []float64{}, err
		}
		floatVector[i] = floatVal
	}
	return floatVector, nil
}

//calculates the document vector for a record's data by averaging all of the word vectors
func (model *Model) getDocumentVector(data string) ([]float64, error) {
	words := analyze(data)
	vectors := make([][]float64, 0)
	for _, word := range words {
		if wordEmbedding, isInVocab := model.embeddings[word]; isInVocab {
			vectors = append(vectors, wordEmbedding)
		}
	}
	documentVector, err := getMeanVectors(vectors, model.vectorDim)
	if err != nil {
		log.Println("Error calculating the mean of several word2vectors: ", err)
		return []float64{}, err
	}
	return documentVector, nil
}

var mismatchedSize = errors.New("Mismatched size in vector operation")

//computes the mean of a list of word vectors of size dim
func getMeanVectors(vectors [][]float64, dim int64) ([]float64, error) {
	documentVector := make([]float64, dim)
	size := len(vectors[0])
	//sums across the rows first (i.e. down the columns)
	for _, vector := range vectors {
		if len(vector) != size {
			log.Println("Uh oh, mismatched sizes of word vectors when trying to comput the average: ")
			return []float64{}, mismatchedSize
		}
		for index, value := range vector {
			documentVector[index] += value
		}
	}

	for i, val := range documentVector {
		documentVector[i] = val / float64(len(vectors))
	}
	return documentVector, nil
}

//computes the cosine similarity between two vectors
//returns a value between 0 and 1
func cosineSim(vector1 []float64, vector2 []float64) (float64, error) {
	if len(vector1) != len(vector2) {
		log.Println("Error trying to compute the cosine similarity due to mismatched sizes")
		return 0, mismatchedSize
	}
	//Refer to this equation for details
	//https://www.google.com/search?q=cosine+similarity+equation&rlz=1C5CHFA_enUS862US862&sxsrf=ALeKk03Ywzc6SsaavtnPfEIgQDjT9uZqCw:1629291448135&tbm=isch&source=iu&ictx=1&fir=0E6-Qrb_6Rcw5M%252CsQwyAnBcksNgkM%252C_&vet=1&usg=AI4_-kR8jvlEyr542SYRvM1149gNB4LuUA&sa=X&ved=2ahUKEwjj9oDQz7ryAhX14uAKHdSyBdcQ9QF6BAgMEAE&biw=1440&bih=659#imgrc=0E6-Qrb_6Rcw5M&imgdii=j12WREz4QykXyM
	sum1Squared := 0.0
	sum2Squared := 0.0
	sumProduct := 0.0
	for i := 0; i < len(vector1); i++ {
		a := vector1[i]
		b := vector2[i]
		sum1Squared += math.Pow(a, 2)
		sum2Squared += math.Pow(b, 2)
		sumProduct += a * b
	}
	return sumProduct / (math.Sqrt(sum1Squared) * math.Sqrt(sum2Squared)), nil
}

//get the tf-idf similarity between documents
//first compues the tf-idf document vectors for each record, then computes the cosine
//similarity between both
func tfIdfSim(tokenFreq1 map[string]int, tokenFreq2 map[string]int) (float64, error) {
	//generate the tf-idf vectors for each record
	//return the cosine similarity of these tf-idf vectors
	//important bit of nuance, to ensure we always have the same size tf-idf vectors
	//since different documents may have different vocabularies, we compute vectors over
	//the entire corpus
	res, err := cosineSim(getTfIdfVector(tokenFreq1, len(corpus)), getTfIdfVector(tokenFreq2, len(corpus)))
	if err != nil {
		return 0.0, err
	}
	return res, nil
}

func getTfIdfVector(tokenFreq map[string]int, size int) []float64 {
	result := make([]float64, size)
	numToksInDoc := len(tokenFreq)
	for token, frequencyOfToken := range tokenFreq {
		//multiplies the tf * idf
		result[corpus[token]] = (float64(frequencyOfToken) / float64(numToksInDoc)) * idf(token)
	}
	//note, all words which we don't access above default to 0 when we initalize our slice
	return result
}

//idf = log(total number of documents / number of documents that contain term) - ensures tokens which are rarer get a higher score
func idf(token string) float64 {
	return math.Log10(float64(len(data)) / float64(len(globalInvertedIndex[token])))
}

func computeScore(embedding1 []float64, embedding2 []float64, id1 string, id2 string) float64 {
	embeddingSim, err := cosineSim(embedding1, embedding2)
	if err != nil {
		return 0
	}
	tfSim, err := tfIdfSim(data[id1].TokenFrequency, data[id2].TokenFrequency)
	if err != nil {
		return 0
	}
	//score is just the average of the cosine similairty for the embedding and tf-idf vectors
	return (embeddingSim + tfSim) / 2
}

type result struct {
	score float64
	id    string
}

//takes the string id of a record and returns the n most similar records
func searchByID(id string, n int) []SearchResult {
	currVec := documentVectors[id]
	results := make([]result, len(documentVectors)-1)
	i := 0
	for recordID, recordVec := range documentVectors {
		if recordID != id {
			score := computeScore(currVec, recordVec, id, recordID)
			results[i] = result{score: score, id: recordID}
			i += 1
		}
	}
	return rank(results)[:n]
}

//helper struct used to package our results in a smaller form-factor for faster loads
type SearchResult struct {
	Title   string `json:"title"`
	Link    string `json:"link"`
	Content string `json:"content"`
	ID      string `json:"id"`
}

func rank(unsorted []result) []SearchResult {
	rankedResults := make([]SearchResult, len(unsorted))
	//sort by highest order score to lowest
	sort.Slice(unsorted, func(i, j int) bool {
		return unsorted[i].score > unsorted[j].score
	})

	i := 0
	//put sorted records into needed format and return
	for _, val := range unsorted {
		currData := data[val.id]
		rankedResults[i] = SearchResult{Title: currData.Title, Link: currData.Link,
			Content: currData.Title[:200], ID: currData.ID}
		i += 1
	}
	return rankedResults
}

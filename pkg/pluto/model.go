package pluto

import (
	"bufio"
	"io"
	"log"
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

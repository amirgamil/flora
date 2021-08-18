package pluto

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

//1. Get inverted index
//2. Get most frequent tokens
//3. Send back top n ranked results
//These are the ones we display
//4. When a user "enters/hovers over a tree", find most frequent tokens
//and associated records that "link to this", how to display?
//5. If a user clicks on one of them, repeat steps 2 - 4

var globalInvertedIndex map[string][]string
var data map[string]ApolloRecord

//choose to redefine our schema here to avoid importing apollo as an unnecessary dependency
type ApolloRecord struct {
	//unique identifier
	ID string `json:"id"`
	//title
	Title string `json:"title"`
	//potential link to the source if applicable
	Link string `json:"link"`
	//text content to display on results page
	Content string `json:"content"`
	//map of tokens to their frequency
	TokenFrequency map[string]int `json:"tokenFrequency"`
}

//load corresponding data files from our apollo database
const invertedIndexPath = "../apollo/data/index.json"
const lcRecordsPath = "../apollo/data/local.json"
const srRecordsPath = "../apollo/data/local.json"

func loadInvertedIndex() {
	jsonFile, err := os.Open(invertedIndexPath)
	if err != nil {
		fmt.Println("Error, could not load the inverted index")
		return
	}
	defer jsonFile.Close()
	//TODO: not sure if we can decode into pointers?
	json.NewDecoder(jsonFile).Decode(&globalInvertedIndex)
}

func loadData(path string) {
	jsonFile, err := os.Open(path)
	if err != nil {
		fmt.Println("Error, could not load the inverted index")
		return
	}
	defer jsonFile.Close()
	json.NewDecoder(jsonFile).Decode(&data)
}

func initData() {
	loadInvertedIndex()
	loadData(lcRecordsPath)
	loadData(srRecordsPath)
}

//load the pretrained model containing word embeddings
func loadPretrainedEmbeddings() (Model, error) {
	file, err := os.Open("./models/fast-text-wiki-news-300d.vec")
	if err != nil {
		log.Println("Error loading the pretrained model: ", err)
	}
	//create a new modelParser with our pretrained embeddings
	parser := newParser(file)
	//load the embeddings into memory
	model, errParsing := parser.parse()
	if errParsing != nil {
		return Model{}, err
	}

	fmt.Println(model.embeddings[","])
	return model, nil
}

//caled on server launch to generate all the embeddings of our data
func GenerateEmbeddings() {
	//load data first
	initData()

	//load pretrained embedinngs
	loadPretrainedEmbeddings()
}

//returns n most similar pieces of data?
func search(n int, source string) ([]string, error) {
	return []string{}, nil
}

package flora

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

//inverted index from Apollo
var globalInvertedIndex map[string][]string

//map of all of the records in our apollo database (from keys to their values)
var data map[string]ApolloRecord

//map of records to their associated document vectors
var documentVectors map[string][]float64

//corpus of all of the words in our vocabulary
var corpus map[string]int

//model for our embeddings
var model *Model

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
const srRecordsPath = "../apollo/data/sources.json"
const docVectorsPath = "./corpus/recordVectors.json"

func loadInvertedIndex() {
	jsonFile, err := os.Open(invertedIndexPath)
	if err != nil {
		fmt.Println("Error, could not load the inverted index: ", err)
		return
	}
	defer jsonFile.Close()
	//TODO: not sure if we can decode into pointers?
	json.NewDecoder(jsonFile).Decode(&globalInvertedIndex)
}

func loadData(path string) {
	jsonFile, err := os.Open(path)
	if err != nil {
		fmt.Println("Error, could not load a records database: ", err, " for path: ", path)
		return
	}
	defer jsonFile.Close()
	json.NewDecoder(jsonFile).Decode(&data)
}

func loadRecordVectors() {
	jsonFile, err := os.Open(docVectorsPath)
	if err != nil {
		fmt.Println("Error, could not load the document vectors for records: ", err)
		return
	}
	defer jsonFile.Close()
	json.NewDecoder(jsonFile).Decode(&documentVectors)
}

func initData() {
	corpus = make(map[string]int)
	documentVectors = make(map[string][]float64)
	loadInvertedIndex()
	loadData(lcRecordsPath)
	loadData(srRecordsPath)
	ensureDataExists(docVectorsPath)
	loadRecordVectors()
}

func ensureDataExists(path string) {
	jsonFile, err := os.Open(path)
	if err != nil {
		createFile(path)
	} else {
		defer jsonFile.Close()
	}
}

func createFile(path string) {
	f, errCreating := os.Create(path)
	if errCreating != nil {
		log.Fatal("Error, could not create database for path: ", path, " with: ", errCreating)
		return
	}
	f.Close()
}

//load the pretrained model containing word embeddings
func loadPretrainedEmbeddings() error {
	//./models/fast-text-wiki-news-300d.vec
	file, err := os.Open("./models/fast-text-wiki-news-300d100k.vec")
	if err != nil {
		log.Println("Error loading the pretrained model: ", err)
	}
	//create a new modelParser with our pretrained embeddings
	parser := newParser(file)
	//load the embeddings into memory
	model, err = parser.parse()
	if err != nil {
		return err
	}

	return nil
}

func calculateDocumentVectors() error {
	for recordKey, record := range data {
		docVec, err := model.getDocumentVector(record.Content)
		if err != nil {
			log.Println("Error parsing document vecotr: ", recordKey, err)
			return err
		}
		documentVectors[recordKey] = docVec
	}
	//write new document vectors to disk
	writeDocumentVectorsToDisk()
	return nil
}

func writeDocumentVectorsToDisk() {
	//flags we pass here are important, need to replace the entire file
	jsonFile, err := os.OpenFile(docVectorsPath, os.O_WRONLY|os.O_CREATE, 0755)
	if err != nil {
		fmt.Println("Error trying to write the new document vectors index to disk: ", err)
	}
	defer jsonFile.Close()
	json.NewEncoder(jsonFile).Encode(documentVectors)
}

//caled on server launch to generate all the embeddings of our data
func generateEmbeddings() error {
	//load data first
	initData()

	//load pretrained embedinngs
	err := loadPretrainedEmbeddings()
	if err != nil {
		return err
	}

	//generate embeddings for all of the documents we're going to be processing
	calculateDocumentVectors()
	return err
}

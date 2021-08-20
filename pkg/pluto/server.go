package pluto

import (
	"encoding/json"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func index(w http.ResponseWriter, r *http.Request) {
	indexFile, err := os.Open("./static/index.html")
	if err != nil {
		io.WriteString(w, "error reading index")
		return
	}
	defer indexFile.Close()

	io.Copy(w, indexFile)
}

func loadJSONFile(path string) (map[string]interface{}, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	data, errReading := ioutil.ReadAll(file)
	if errReading != nil {
		return nil, errReading
	}

	var jsonData map[string]interface{}
	if err := json.Unmarshal(data, &jsonData); err != nil {
		return nil, err
	}

	return jsonData, nil
}

func loadMap(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	mapData, err := loadJSONFile("./map.json")
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
	}
	tileData, errTileset := loadJSONFile("./tileset.json")
	if errTileset != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
	}

	type Data struct {
		Map     map[string]interface{} `json:"map"`
		Tileset map[string]interface{} `json:"tileset"`
	}

	json.NewEncoder(w).Encode(Data{Map: mapData, Tileset: tileData})
}

func findRelatedData(w http.ResponseWriter, r *http.Request) {
	type query struct {
		ID string `json:"id"`
	}
	var searchData query
	err := json.NewDecoder(r.Body).Decode(&searchData)
	if err != nil {
		log.Println("Error parsing JSON request: ", err)
		w.WriteHeader(http.StatusBadGateway)
	}
	results := searchByID(searchData.ID, 350)
	json.NewEncoder(w).Encode(results)
}

func getRecord(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("q")
	record, inMap := data[id]
	if id == "" || !inMap {
		w.WriteHeader(http.StatusBadRequest)
	} else {
		json.NewEncoder(w).Encode(record)
	}
}

func loadInitialData(w http.ResponseWriter, r *http.Request) {
	//queries is a list of strings, each string may contain one or more key words
	//which we will use to generate a document vector of
	type query struct {
		Queries []string `json:"queries"`
	}
	var keyWordData query
	err := json.NewDecoder(r.Body).Decode(&keyWordData)
	if err != nil {
		log.Println("Error loading the initial data: ", err)
		w.WriteHeader(http.StatusBadGateway)
	}
	results := searchMultipleKeywordQueries(keyWordData.Queries, 350)
	json.NewEncoder(w).Encode(results)
}

func Start() {
	err := generateEmbeddings()
	//don't start the server if the word embeddings are not successfully generated
	if err != nil {
		return
	}

	r := mux.NewRouter()

	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:8992",
		WriteTimeout: 60 * time.Second,
		ReadTimeout:  60 * time.Second,
	}

	r.HandleFunc("/", index)
	r.Methods("GET").Path("/map").HandlerFunc(loadMap)
	r.Methods("POST").Path("/initialData").HandlerFunc(loadInitialData)
	r.Methods("POST").Path("/getRecordDetail").HandlerFunc(getRecord)
	r.Methods("POST").Path("/search").HandlerFunc(findRelatedData)
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))
	r.PathPrefix("/assets/").Handler(http.StripPrefix("/assets/", http.FileServer(http.Dir("./assets"))))
	log.Printf("Server listening on %s\n", srv.Addr)
	log.Fatal(srv.ListenAndServe())

}

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

func Start() {
	r := mux.NewRouter()

	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:8992",
		WriteTimeout: 60 * time.Second,
		ReadTimeout:  60 * time.Second,
	}

	r.HandleFunc("/", index)
	r.Methods("GET").Path("/map").HandlerFunc(loadMap)
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))
	r.PathPrefix("/assets/").Handler(http.StripPrefix("/assets/", http.FileServer(http.Dir("./assets"))))
	log.Printf("Server listening on %s\n", srv.Addr)
	log.Fatal(srv.ListenAndServe())

}

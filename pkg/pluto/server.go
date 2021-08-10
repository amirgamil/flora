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

func loadMap(w http.ResponseWriter, r *http.Request) {
	mapFile, err := os.Open("./map.json")
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
	}
	data, errReading := ioutil.ReadAll(mapFile)
	if errReading != nil {
		w.WriteHeader(http.StatusBadRequest)
	}

	var jsonData map[string]interface{}
	if err := json.Unmarshal(data, &jsonData); err != nil {
		w.WriteHeader(http.StatusBadRequest)
	}
	json.NewEncoder(w).Encode(jsonData)
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

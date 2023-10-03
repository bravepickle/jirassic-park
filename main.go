package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func HelloServer(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("This is an example server.\n"))
	// fmt.Fprintf(w, "This is an example server.\n")
	// io.WriteString(w, "This is an example server.\n")
}

func main() {
	http.HandleFunc("/hello", HelloServer)

	godotenv.Load(`.env.app`)

	log.Println(`ENV:`, os.Environ())

	// err := http.ListenAndServeTLS(":443", "./server.crt", "./server.key", nil)
	err := http.ListenAndServe(":80", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

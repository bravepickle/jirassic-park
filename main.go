package main

import (
	"errors"
	"flag"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

var debug bool

func HelloServer(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("This is an example server.\n"))
}

func HomePage(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "text/html")

	filename := `home.tmpl.html`
	filepath := `view/` + filename
	// tpl, err := ioutil.ReadFile(filepath)

	// if err != nil {
	// 	log.Println(`[WARN] Failed to read file: `, err)
	// }

	template, err := template.New(filename).ParseFiles(filepath)
	// template, err := template.New(filepath).Parse(`<html>aaa</html>`)
	if err != nil {
		log.Println(`[WARN] Failed to parse file `, filepath, `: `, err)
	}

	// err = template.Execute(w, `This is test input!!!`)
	err = template.Execute(w, map[string]string{
		`user`: os.Getenv(`APP_AUTH_USER`),
		`uri`:  os.Getenv(`APP_JIRA_BASE_URI`),
	})

	if err != nil {
		log.Fatal(`[ERROR] Failed to build page from the template: `, err)
	}
}

func main() {
	var envFile string

	flag.BoolVar(&debug, `debug`, false, `Enable debug mode`)
	flag.StringVar(&envFile, `env`, ``, `ENV file path`)
	flag.Parse()

	if envFile != `` {
		if _, err := os.Stat(envFile); errors.Is(err, os.ErrNotExist) {
			log.Fatal(`[INFO] ENV was not found: `, envFile)

			os.Exit(1)
		}

		if debug {
			log.Println(`[INFO] Loading ENV file: `, envFile)
		}

		godotenv.Load(envFile)
	} else if debug {
		log.Println(`[INFO] ENV file is not defined`)
	}

	if debug {
		log.Println("[INFO] ENV:\n" + strings.Join(os.Environ(), "\n"))
	}

	apiUri := os.Getenv(`APP_JIRA_BASE_URI`)
	if apiUri == `` {
		log.Fatal(`[ERROR] APP_JIRA_BASE_URI is not defined`)

		os.Exit(1)
	}

	serverAddr := os.Getenv(`APP_SERVER_ADDR`)
	if serverAddr == `` {
		log.Fatal(`[ERROR] APP_SERVER_ADDR is not defined`)

		os.Exit(1)
	}

	if debug {
		log.Println(`[INFO] Starting in Debug mode server`, serverAddr)
	}

	var useTls string
	useTls = strings.ToLower(os.Getenv(`APP_SERVER_TLS`))

	http.HandleFunc("/hello", HelloServer)
	http.HandleFunc("/", HomePage)

	var err error
	if useTls == `true` || useTls == `1` {
		if os.Getenv(`APP_SERVER_TLS_CERT`) == `` {
			log.Fatal(`[ERROR] ENV param must be defined: APP_SERVER_TLS_CERT`)

			os.Exit(1)
		}

		if os.Getenv(`APP_SERVER_TLS_KEY`) == `` {
			log.Fatal(`[ERROR] Env param must be defined: APP_SERVER_TLS_KEY`)

			os.Exit(1)
		}

		err = http.ListenAndServeTLS(serverAddr, os.Getenv(`APP_SERVER_TLS_CERT`), os.Getenv(`APP_SERVER_TLS_KEY`), nil)
	} else {
		err = http.ListenAndServe(serverAddr, nil)
	}

	if err != nil {
		log.Fatal("[ERROR] ListenAndServe: ", err)
	}
}

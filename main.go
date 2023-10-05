package main

import (
	"encoding/json"
	"errors"
	"flag"
	"html/template"
	"io/ioutil"
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
		// `token`: os.Getenv(`APP_AUTH_PASS`),
		`token`: ``,
		`uri`: os.Getenv(`APP_JIRA_PROXY_URI`),
		`jira_uri`: os.Getenv(`APP_JIRA_BASE_URI`),
	})

	if err != nil {
		log.Fatal(`[ERROR] Failed to build page from the template: `, err)
	}
}

func ActionPage(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	body, _ := ioutil.ReadAll(req.Body)

	w.Write(body)

	var data map[string]interface{}
	err := json.Unmarshal(body, &data)
	if err != nil {
		if debug {
			log.Printf("[WARN] Could not unmarshal json: %s\n", err)
		}

		return
	}

	if debug {
		log.Printf("[INFO] JSON map: %v\n", data)
	}

	// TODO: list filters handle
}

func makeGetRequest(uri string) ([]byte, error) {
	req, err := http.NewRequest(`GET`, uri, nil)
	// res, err := http.Get(uri)
	if err != nil {
		if debug {
			log.Printf("[INFO] Error making http request: %s\n", err)
		}

		return nil, err
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		if debug {
			log.Printf("[INFO] Client: error making http request: %s\n", err)
		}

		return nil, err
	}

	log.Printf("[INFO] client: got response!\n")
	log.Printf("[INFO] client: status code: %d\n", res.StatusCode)

	return ioutil.ReadAll(res.Body)
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

	apiUri := os.Getenv(`APP_JIRA_PROXY_URI`)
	if apiUri == `` {
		log.Fatal(`[ERROR] APP_JIRA_PROXY_URI is not defined`)

		os.Exit(1)
	}

	if os.Getenv(`APP_JIRA_BASE_URI`) == `` {
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
	http.HandleFunc("/action", ActionPage)
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

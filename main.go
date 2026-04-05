package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
)

//go:embed templates/*
var templateFS embed.FS

//go:embed static/*
var staticFS embed.FS

func main() {
	mux := http.NewServeMux()

	// Serve the single-page app
	mux.HandleFunc("GET /", handleIndex(templateFS))

	// API proxy routes
	mux.HandleFunc("GET /api/standings", handleStandings)
	mux.HandleFunc("GET /api/roster/{team}", handleRoster)
	mux.HandleFunc("GET /api/player/{id}", handlePlayer)

	// Static files (CSS, JS)
	staticSub, _ := fs.Sub(staticFS, "static")
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServerFS(staticSub)))

	addr := ":8080"
	fmt.Printf("NHL Stats server running at http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

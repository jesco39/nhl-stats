package main

import (
	"encoding/json"
	"html/template"
	"io/fs"
	"net/http"
	"strconv"
)

func handleIndex(tmplFS fs.FS) http.HandlerFunc {
	tmpl := template.Must(template.ParseFS(tmplFS, "templates/index.html"))
	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		tmpl.Execute(w, nil)
	}
}

func handleStandings(w http.ResponseWriter, r *http.Request) {
	data, err := fetchStandings()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func handleRoster(w http.ResponseWriter, r *http.Request) {
	team := r.PathValue("team")
	if team == "" {
		http.Error(w, "team abbreviation required", http.StatusBadRequest)
		return
	}
	data, err := fetchRoster(team)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func handlePlayer(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "player ID required", http.StatusBadRequest)
		return
	}
	data, err := fetchPlayer(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func handlePlayoffBracket(w http.ResponseWriter, r *http.Request) {
	data, err := fetchPlayoffBracket()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func handlePlayoffCarousel(w http.ResponseWriter, r *http.Request) {
	data, err := fetchPlayoffCarousel()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func handlePlayoffSeries(w http.ResponseWriter, r *http.Request) {
	letter := r.PathValue("letter")
	if letter == "" {
		http.Error(w, "series letter required", http.StatusBadRequest)
		return
	}
	data, err := fetchPlayoffSeries(letter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func handleGame(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "game ID required", http.StatusBadRequest)
		return
	}
	data, err := fetchGameLanding(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func handlePlayoffSkaterLeaders(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	if category == "" {
		http.Error(w, "category required", http.StatusBadRequest)
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 10
	}
	data, err := fetchPlayoffSkaterLeaders(category, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func handlePlayoffGoalieLeaders(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	if category == "" {
		http.Error(w, "category required", http.StatusBadRequest)
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 10
	}
	data, err := fetchPlayoffGoalieLeaders(category, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, data)
}

func writeJSON(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

# nhl-stats

A Go web application for browsing live NHL standings, team rosters, and player statistics. Data is fetched from the public [NHL API](https://api-web.nhle.com).

## Features

- **Standings** — View current NHL standings grouped by division and conference
- **Team Rosters** — Click any team to browse their full roster
- **Player Stats** — Click any player to see current season stats, career totals, last 5 games, and season-by-season history
- Supports both skaters and goalies with position-appropriate stat displays

## Prerequisites

- [Go](https://go.dev/dl/) 1.22+

## Running locally

```bash
go run .
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Building

```bash
go build -o nhl-stats .
./nhl-stats
```

## Architecture

| File | Purpose |
|------|---------|
| **main.go** | HTTP server, embedded assets, route registration |
| **api.go** | NHL API client with typed Go structs for standings, rosters, and players |
| **handlers.go** | HTTP handlers that proxy NHL API data as JSON |
| **templates/index.html** | Single-page HTML shell |
| **static/app.js** | Frontend logic — fetches data and renders standings, team, and player views |
| **static/style.css** | Dark-themed responsive styling |

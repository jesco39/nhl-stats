package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const nhlBaseURL = "https://api-web.nhle.com/v1"

var httpClient = &http.Client{Timeout: 10 * time.Second}

// nhlGet fetches a path from the NHL API and decodes JSON into out.
func nhlGet(path string, out any) error {
	resp, err := httpClient.Get(nhlBaseURL + path)
	if err != nil {
		return fmt.Errorf("NHL API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("NHL API returned status %d for %s", resp.StatusCode, path)
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decoding NHL API response: %w", err)
	}
	return nil
}

// --- Standings ---

type StandingsResponse struct {
	Standings []TeamStanding `json:"standings"`
}

type TeamStanding struct {
	TeamName       LocalizedName `json:"teamName"`
	TeamAbbrev     LocalizedName `json:"teamAbbrev"`
	TeamLogo       string        `json:"teamLogo"`
	ConferenceName string        `json:"conferenceName"`
	DivisionName   string        `json:"divisionName"`
	GamesPlayed    int           `json:"gamesPlayed"`
	Wins           int           `json:"wins"`
	Losses         int           `json:"losses"`
	OtLosses       int           `json:"otLosses"`
	Points         int           `json:"points"`
	GoalFor        int           `json:"goalFor"`
	GoalAgainst    int           `json:"goalAgainst"`
	GoalDifferential int         `json:"goalDifferential"`
	StreakCode     string        `json:"streakCode"`
	StreakCount    int           `json:"streakCount"`
	L10Wins        int           `json:"l10Wins"`
	L10Losses      int           `json:"l10Losses"`
	L10OtLosses    int           `json:"l10OtLosses"`
	PointPctg      float64       `json:"pointPctg"`
	RegulationWins int           `json:"regulationWins"`
	SeasonID       int           `json:"seasonId"`
}

type LocalizedName struct {
	Default string `json:"default"`
}

func fetchStandings() (*StandingsResponse, error) {
	var data StandingsResponse
	if err := nhlGet("/standings/now", &data); err != nil {
		return nil, err
	}
	return &data, nil
}

// --- Roster ---

type RosterResponse struct {
	Forwards   []RosterPlayer `json:"forwards"`
	Defensemen []RosterPlayer `json:"defensemen"`
	Goalies    []RosterPlayer `json:"goalies"`
}

type RosterPlayer struct {
	ID            int           `json:"id"`
	Headshot      string        `json:"headshot"`
	FirstName     LocalizedName `json:"firstName"`
	LastName      LocalizedName `json:"lastName"`
	SweaterNumber int           `json:"sweaterNumber"`
	PositionCode  string        `json:"positionCode"`
	ShootsCatches string        `json:"shootsCatches"`
	HeightInInches int          `json:"heightInInches"`
	WeightInPounds int          `json:"weightInPounds"`
	BirthDate     string        `json:"birthDate"`
	BirthCountry  string        `json:"birthCountry"`
	BirthCity     LocalizedName `json:"birthCity"`
}

func currentSeasonID() string {
	now := time.Now()
	year := now.Year()
	// NHL season spans two calendar years; if before September, we're in the previous year's season
	if now.Month() < time.September {
		year--
	}
	return fmt.Sprintf("%d%d", year, year+1)
}

func fetchRoster(teamAbbrev string) (*RosterResponse, error) {
	var data RosterResponse
	if err := nhlGet(fmt.Sprintf("/roster/%s/%s", teamAbbrev, currentSeasonID()), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

// --- Player ---

type PlayerLanding struct {
	FirstName     LocalizedName   `json:"firstName"`
	LastName      LocalizedName   `json:"lastName"`
	Position      string          `json:"position"`
	Headshot      string          `json:"headshot"`
	HeroImage     string          `json:"heroImage"`
	SweaterNumber int             `json:"sweaterNumber"`
	TeamLogo      string          `json:"teamLogo"`
	ShootsCatches string          `json:"shootsCatches"`
	HeightInInches int            `json:"heightInInches"`
	WeightInPounds int            `json:"weightInPounds"`
	BirthDate     string          `json:"birthDate"`
	BirthCity     LocalizedName   `json:"birthCity"`
	BirthCountry  string          `json:"birthCountry"`
	CurrentTeamAbbrev string        `json:"currentTeamAbbrev"`
	FeaturedStats json.RawMessage `json:"featuredStats"`
	Last5Games    json.RawMessage `json:"last5Games"`
	CareerTotals  json.RawMessage `json:"careerTotals"`
	SeasonTotals  json.RawMessage `json:"seasonTotals"`
}

func fetchPlayer(playerID string) (*PlayerLanding, error) {
	var data PlayerLanding
	if err := nhlGet(fmt.Sprintf("/player/%s/landing", playerID), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

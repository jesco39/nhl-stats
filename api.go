package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
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

// --- Playoffs ---

func currentPlayoffYear() int {
	now := time.Now()
	if now.Month() < time.September {
		return now.Year()
	}
	return now.Year() + 1
}

type BracketTeam struct {
	ID       int           `json:"id"`
	Abbrev   string        `json:"abbrev"`
	Name     LocalizedName `json:"name"`
	Logo     string        `json:"logo"`
	DarkLogo string        `json:"darkLogo"`
}

type BracketSeries struct {
	SeriesLetter         string      `json:"seriesLetter"`
	PlayoffRound         int         `json:"playoffRound"`
	SeriesTitle          string      `json:"seriesTitle"`
	SeriesAbbrev         string      `json:"seriesAbbrev"`
	TopSeedWins          int         `json:"topSeedWins"`
	BottomSeedWins       int         `json:"bottomSeedWins"`
	TopSeedRankAbbrev    string      `json:"topSeedRankAbbrev"`
	BottomSeedRankAbbrev string      `json:"bottomSeedRankAbbrev"`
	WinningTeamID        int         `json:"winningTeamId"`
	TopSeedTeam          BracketTeam `json:"topSeedTeam"`
	BottomSeedTeam       BracketTeam `json:"bottomSeedTeam"`
}

type BracketResponse struct {
	Series []BracketSeries `json:"series"`
}

type CarouselResponse struct {
	SeasonID     int `json:"seasonId"`
	CurrentRound int `json:"currentRound"`
}

type SeriesSeedTeam struct {
	ID         int           `json:"id"`
	Abbrev     string        `json:"abbrev"`
	Name       LocalizedName `json:"name"`
	Seed       int           `json:"seed"`
	SeriesWins int           `json:"seriesWins"`
	Logo       string        `json:"logo"`
	DarkLogo   string        `json:"darkLogo"`
}

type GameTeam struct {
	Abbrev string `json:"abbrev"`
	Score  int    `json:"score"`
}

type SeriesGame struct {
	ID           int      `json:"id"`
	GameNumber   int      `json:"gameNumber"`
	StartTimeUTC string   `json:"startTimeUTC"`
	HomeTeam     GameTeam `json:"homeTeam"`
	AwayTeam     GameTeam `json:"awayTeam"`
	GameState    string   `json:"gameState"`
	IfNecessary  bool     `json:"ifNecessary"`
}

type SeriesScheduleResponse struct {
	Round          int             `json:"round"`
	RoundLabel     string          `json:"roundLabel"`
	SeriesLetter   string          `json:"seriesLetter"`
	TopSeedTeam    SeriesSeedTeam  `json:"topSeedTeam"`
	BottomSeedTeam SeriesSeedTeam  `json:"bottomSeedTeam"`
	NeededToWin    int             `json:"neededToWin"`
	Games          []SeriesGame    `json:"games"`
}

func fetchPlayoffBracket() (*BracketResponse, error) {
	var data BracketResponse
	if err := nhlGet(fmt.Sprintf("/playoff-bracket/%d", currentPlayoffYear()), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func fetchPlayoffCarousel() (*CarouselResponse, error) {
	var data CarouselResponse
	if err := nhlGet(fmt.Sprintf("/playoff-series/carousel/%s", currentSeasonID()), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func fetchPlayoffSeries(letter string) (*SeriesScheduleResponse, error) {
	var data SeriesScheduleResponse
	if err := nhlGet(fmt.Sprintf("/schedule/playoff-series/%s/%s", currentSeasonID(), strings.ToLower(letter)), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

// --- Game Summary ---

type GameLandingTeam struct {
	Abbrev   string `json:"abbrev"`
	Score    int    `json:"score"`
	Logo     string `json:"logo"`
	DarkLogo string `json:"darkLogo"`
}

type GameAssist struct {
	PlayerID  int           `json:"playerId"`
	FirstName LocalizedName `json:"firstName"`
	LastName  LocalizedName `json:"lastName"`
}

type GameGoal struct {
	PlayerID     int           `json:"playerId"`
	FirstName    LocalizedName `json:"firstName"`
	LastName     LocalizedName `json:"lastName"`
	TeamAbbrev   LocalizedName `json:"teamAbbrev"`
	Headshot     string        `json:"headshot"`
	TimeInPeriod string        `json:"timeInPeriod"`
	Strength     string        `json:"strength"`
	Assists      []GameAssist  `json:"assists"`
}

type PeriodDescriptor struct {
	Number     int    `json:"number"`
	PeriodType string `json:"periodType"`
}

type PeriodScoring struct {
	PeriodDescriptor PeriodDescriptor `json:"periodDescriptor"`
	Goals            []GameGoal       `json:"goals"`
}

type ThreeStar struct {
	Star     int           `json:"star"`
	PlayerID int           `json:"playerId"`
	TeamAbbrev string      `json:"teamAbbrev"`
	Headshot string        `json:"headshot"`
	Name     LocalizedName `json:"name"`
	Position string        `json:"position"`
	Goals    int           `json:"goals"`
	Assists  int           `json:"assists"`
	Points   int           `json:"points"`
}

type GameSummary struct {
	Scoring    []PeriodScoring `json:"scoring"`
	ThreeStars []ThreeStar     `json:"threeStars"`
}

type GameLandingResponse struct {
	ID        int             `json:"id"`
	GameDate  string          `json:"gameDate"`
	GameState string          `json:"gameState"`
	AwayTeam  GameLandingTeam `json:"awayTeam"`
	HomeTeam  GameLandingTeam `json:"homeTeam"`
	Summary   GameSummary     `json:"summary"`
}

func fetchGameLanding(gameID string) (*GameLandingResponse, error) {
	var data GameLandingResponse
	if err := nhlGet(fmt.Sprintf("/gamecenter/%s/landing", gameID), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

// --- Playoff Leaders ---

type LeaderEntry struct {
	ID            int           `json:"id"`
	FirstName     LocalizedName `json:"firstName"`
	LastName      LocalizedName `json:"lastName"`
	SweaterNumber int           `json:"sweaterNumber"`
	Headshot      string        `json:"headshot"`
	TeamAbbrev    string        `json:"teamAbbrev"`
	TeamLogo      string        `json:"teamLogo"`
	Position      string        `json:"position"`
	Value         float64       `json:"value"`
}

type LeadersResult struct {
	Category string        `json:"category"`
	Players  []LeaderEntry `json:"players"`
}

func fetchPlayoffLeaders(endpoint, category string, limit int) (*LeadersResult, error) {
	path := fmt.Sprintf("/%s/%s/3?categories=%s&limit=%d", endpoint, currentSeasonID(), category, limit)
	var raw map[string][]LeaderEntry
	if err := nhlGet(path, &raw); err != nil {
		return nil, err
	}
	return &LeadersResult{Category: category, Players: raw[category]}, nil
}

func fetchPlayoffSkaterLeaders(category string, limit int) (*LeadersResult, error) {
	return fetchPlayoffLeaders("skater-stats-leaders", category, limit)
}

func fetchPlayoffGoalieLeaders(category string, limit int) (*LeadersResult, error) {
	return fetchPlayoffLeaders("goalie-stats-leaders", category, limit)
}

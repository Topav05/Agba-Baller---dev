import pandas as pd
import random
from fastapi import FastAPI, Query, Request
from pydantic import BaseModel
from typing import List
from fastapi.responses import JSONResponse
from app.data_processing import load_data
from app.optimisation import optimise
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from unidecode import unidecode

app = FastAPI()
club_df = pd.read_csv("app/df/club.csv")
league_df = pd.read_csv("app/df/league.csv")
nation_df = pd.read_csv("app/df/nation.csv")


# Mount the static files directory
app.mount("/static", StaticFiles(directory="app/static"), name="static")


templates = Jinja2Templates(directory="app/templates")

df = load_data()

def best_players(formation):
    # Filter players with at least one rating greater than 80
    rating_columns = ['GK_rating', 'CB_rating', 'FB_rating', 'CDM_rating', 'CM_rating', 'WM_rating', 'CAM_rating', 'W_rating', 'ST_rating']
    filtered_df = df[df[rating_columns].max(axis=1) > 85]
    
    # Pass the filtered player list to the optimization function
    return optimise(df, filtered_df['index'].tolist(), formation)

def select_players(player_list, formation):
    while len(player_list) < 11:
        n = random.randint(1, len(df))
        if n not in player_list:
            player_list.append(n)
    return optimise(df, player_list, formation)

def getInfo(index):
    row = df[df['index'] == index].iloc[0]  # Fetch the first matching row
    return {
        "Name": row['long_name'],
        "Position": row['Position'],
        "GK Rating": row['GK_rating'],
        'CB Rating': row['CB_rating'],
        'FB Rating': row['FB_rating'],
        'DM Rating': row['CDM_rating'],
        'CM Rating': row['CM_rating'],
        'WM Rating': row['WM_rating'],
        'CAM Rating': row['CAM_rating'],
        'W Rating': row['W_rating'],
        'ST Rating': row['ST_rating'],
        "player_face_url": row['player_face_url']
    }


class SelectPlayersModel(BaseModel):
    player_index: List[int]
    formation: str

class SelectClubsModel(BaseModel):
    clubs: List[str]
    formation: str

class SelectNationsModel(BaseModel):
    nations: List[str]
    formation: str


class SelectLeaguesModel(BaseModel):
    leagues: List[int]
    formation: str

@app.get("/index")
def index(request: Request):
    return templates.TemplateResponse("index.html", {'request': request})

@app.get("/best")
def index(request: Request):
    return templates.TemplateResponse("best.html", {'request': request})

@app.get("/playerSelect")
def index(request: Request):
    return templates.TemplateResponse("selectPlayer.html", {'request': request})

@app.get("/playerS")
def index(request: Request):
    return templates.TemplateResponse("splayer.html", {'request': request})

@app.get("/PlayerInfo/{player}")
def get_info(player: int):
    result = getInfo(player)
    return JSONResponse(content=result)

@app.get("/best_players/{formation}")
def get_best_players(formation: str):
    # Get the best players for the given formation
    result = best_players(formation)
    return JSONResponse(content=result)

@app.get("/search_players")
def search_players(query: str = Query(None, description="Player name to search for")):
    # Create matching player list with only the first 5 results
    matching_players = [
        {
            "long_name": name,
            "short_name": shortName,
            "face_url": face_url,
            "index": index
        }
        for name, shortName, face_url, index in zip(df['long_name'], df['short_name'], df['player_face_url'], df['index'].astype(str))
        if query.lower() in unidecode(name).lower() or query.lower() in unidecode(shortName).lower()
    ][:7]
    
    return {"matching_players": matching_players}

@app.get("/search_clubs")
def search_clubs(query: str = Query(None, description="Club name to search for")):
    if query is None:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    
    # Ensure all relevant fields are strings and handle NaN
    club_names = club_df['club_name'].fillna('').astype(str)
    club_urls = club_df['club_url'].fillna('').astype(str)
    club_team_ids = club_df['club_team_id'].fillna(-1).astype(int)  # Assuming 'club_team_id' should be integer

    matching_clubs = [
        {
            "long_name": name,
            "short_name": name,  # Assuming 'short_name' is same as 'long_name' for clubs
            "face_url": face_url,
            "index": club_team_id
        }
        for name, face_url, club_team_id in zip(club_names, club_urls, club_team_ids)
        if query.lower() in unidecode(name).lower()
    ][:7]
    
    return {"matching_clubs": matching_clubs}

@app.get("/search_nations")
def search_nations(query: str = Query(None, description="Nation name to search for")):
    if query is None:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    
    # Ensure all relevant fields are strings and handle NaN
    nation_name = nation_df['nation_name'].fillna('').astype(str)
    nation_urls = nation_df['nation_url'].fillna('').astype(str)
    nation_team_ids = nation_df['nation_id'].fillna(-1).astype(int)  # Assuming 'nation_team_id' should be integer

    matching_nations = [
        {
            "long_name": name,
            "short_name": name,  # Assuming 'short_name' is same as 'long_name' for nations
            "nation_url": nation_url,
            "index": nation_team_id
        }
        for name, nation_url, nation_team_id in zip(nation_name, nation_urls, nation_team_ids)
        if query.lower() in unidecode(name).lower()
    ][:7]
    
    return {"matching_nations": matching_nations}

@app.get("/search_leagues")
def search_leagues(query: str = Query(None, description="League name to search for")):
    if query is None:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    
    # Ensure all relevant fields are strings and handle NaN
    league_name = league_df['league_name'].fillna('').astype(str)
    league_urls = league_df['league_url'].fillna('').astype(str)
    league_ids = league_df['league_id'].fillna(-1).astype(int)  # Assuming 'league_team_id' should be integer

    matching_leagues = [
        {
            "long_name": name,
            "short_name": name,  # Assuming 'short_name' is same as 'long_name' for leagues
            "league_url": league_url,
            "index": league_id
        }
        for name, league_url, league_id in zip(league_name, league_urls, league_ids)
        if query.lower() in unidecode(name).lower()
    ][:7]
    
    return {"matching_leagues": matching_leagues}

@app.post("/select_players/")
def get_selected_players(data: SelectPlayersModel):
    # Call the select_players function with the provided player list and formation
    return select_players(data.player_index, data.formation)

@app.post("/select_clubs/")
def get_selected_clubs(data: SelectClubsModel):
    # Extract the list of players and the formation from the input data
    players = df[df['club_name'].isin(data.clubs)]['index'].tolist()
    # Call the select_players function with the provided player list and formation
    return select_players(players, data.formation)

@app.post("/select_nations/")
def get_selected_nations(data: SelectNationsModel):
    # Extract the list of players and the formation from the input data
    players = df[df['nationality_name'].isin(data.nations)]['index'].tolist()
    # Call the select_players function with the provided player list and formation
    return select_players(players, data.formation)

@app.post("/select_leagues/")
def get_selected_clubs(data: SelectLeaguesModel):
    # Extract the list of players and the formation from the input data
    players = df[df['league_id'].isin(data.leagues)]['index'].tolist()
    # Call the select_players function with the provided player list and formation
    return select_players(players, data.formation)
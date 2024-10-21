import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.linear_model import LinearRegression

def load_data():
    # Read the dataset
    df = pd.read_csv("app/df/fifa_23_ratings.csv", encoding='utf-8')

    # Rename column for better readability
    df.rename(columns={"player_positions": "Position"}, inplace=True)

    # Drop unnecessary columns
    df.drop(columns=[
        'Unnamed: 0', 'fifa_version', 'fifa_update', 'age', 'body_type',
        'league_level', 'potential', 'club_team_id', 'club_position'
    ], inplace=True)

    df["index"] = list(range(len(df)))

    # Fill missing club names
    df.fillna({"club_name": "Unattached"}, inplace=True)

    # Split work_rate into attacking and defensive columns and map to numerical values
    work_rate_mapping = {'Low': -1, 'Medium': 0, 'High': 1}
    df[['attacking_work_rate', 'defensive_work_rate']] = df['work_rate'].str.split('/', expand=True)
    df['attacking_work_rate'] = df['attacking_work_rate'].map(work_rate_mapping)
    df['defensive_work_rate'] = df['defensive_work_rate'].map(work_rate_mapping)
    df.drop('work_rate', axis=1, inplace=True)
    
    df["Pref"] = df["Position"].apply(categorize_position)

    target_columns = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']

    # Attributes for prediction
    all_attributes = [
        'height_cm', 'weight_kg', 'attacking_crossing', 'attacking_finishing',
        'attacking_heading_accuracy', 'attacking_short_passing', 'attacking_volleys', 
        'skill_dribbling', 'skill_curve', 'skill_fk_accuracy', 'skill_long_passing', 
        'skill_ball_control', 'movement_acceleration', 'movement_sprint_speed', 
        'movement_agility', 'movement_reactions', 'movement_balance', 'power_shot_power',
        'power_jumping', 'power_stamina', 'power_strength', 'power_long_shots',
        'mentality_aggression', 'mentality_interceptions', 'attacking_work_rate',
        'mentality_positioning', 'mentality_vision', 'mentality_penalties',
        'mentality_composure', 'defending_marking_awareness',
        'defending_standing_tackle', 'defending_sliding_tackle',
        'goalkeeping_diving', 'goalkeeping_handling', 'goalkeeping_kicking',
        'goalkeeping_positioning', 'goalkeeping_reflexes', 'defensive_work_rate',
    'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']

    # Columns with missing values to be predicted
    target_columns = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']

    # Attributes for prediction
    attributes = [
        'attacking_crossing', 'attacking_finishing',
        'attacking_heading_accuracy', 'attacking_short_passing', 'attacking_volleys', 
        'skill_dribbling', 'skill_long_passing', 
        'skill_ball_control', 'movement_acceleration', 'movement_sprint_speed', 
        'movement_agility', 'movement_reactions', 'movement_balance', 'power_shot_power',
        'power_jumping', 'power_stamina', 'power_strength', 'power_long_shots',
        'mentality_aggression', 'mentality_interceptions', 'attacking_work_rate',
        'mentality_positioning', 'mentality_vision',
        'mentality_composure', 'defending_marking_awareness',
        'defending_standing_tackle', 'defending_sliding_tackle', 'defensive_work_rate'
    ]

    # Predict and fill missing values in target columns
    
    for column in target_columns:
        model = LGBMRegressor(verbose=-1)
        not_null_idx = df[column].notna()
        null_idx = df[column].isna()
        
        X_train = df.loc[not_null_idx, attributes]
        y_train = df.loc[not_null_idx, column]
        X_pred = df.loc[null_idx, attributes]
        
        model.fit(X_train, y_train)
        df.loc[null_idx, column] = model.predict(X_pred)
        
    # Position Columns
    position_mappings = {
        'GK': 'Y_GK', 
        'CB': 'Y_CB', 
        'RB': 'Y_FB', 'LB': 'Y_FB',
        'CDM': 'Y_CDM', 
        'CM': 'Y_CM', 
        'CAM': 'Y_CAM',
        'RM': 'Y_WM', 'LM': 'Y_WM',
        'RW': 'Y_W', 'LW': 'Y_W',
        'ST': 'Y_ST', 'CF': 'Y_ST'
    }

    for pos, col in position_mappings.items():
        if col not in df.columns:
            df[col] = 0
        df.loc[df['Position'].str.contains(pos, regex=False), col] = 1

    # Modelling
    Y_set = list(position_mappings.values())

    best_models = {}

    for position in Y_set:
        var_name = position.split('_')[1]
        position_df = df[df[position] == 1]
        
        x = position_df[all_attributes]
        y = position_df['overall']
        
        model = LinearRegression() if var_name == 'GK' else LGBMRegressor(verbose=-1)
        
        model.fit(x, y)
        
        best_models[var_name] = model

    # Add predicted ratings to the dataframe
    for position, model in best_models.items():
        df[f"{position}_rating"] = model.predict(df[all_attributes])
    return df


def categorize_position(position):
    if 'R' in position and 'L' in position:
        return 'b'
    elif 'R' in position:
        return 'R'
    elif 'L' in position:
        return 'L'
    else:
        return 'O'
from pulp import LpProblem, LpVariable, lpSum, LpMaximize, LpBinary
import pandas as pd
def handle_sides(tf, left, right):

    # Get indices for the left and right positions
    try:
        left_idx = tf.query(f"`Pos.` == '{left}'").index[0]
        right_idx = tf.query(f"`Pos.` == '{right}'").index[0]
    except IndexError:
        return tf

    # Get preferences for left and right positions
    l, r = tf.loc[left_idx, 'Pref'], tf.loc[right_idx, 'Pref']

    # Perform swap if conditions are met
    if (r == 'L' and l != 'L') or (l == 'R' and r != 'R') or \
       (r == l == 'L' and tf.loc[left_idx, 'Rating'] < tf.loc[right_idx, 'Rating']) or \
       (r == l == 'R' and tf.loc[left_idx, 'Rating'] > tf.loc[right_idx, 'Rating']):
        
        # Create a copy to avoid issues with direct assignment
        temp_pos = tf.loc[left_idx, 'Pos.']
        tf.loc[left_idx, 'Pos.'] = tf.loc[right_idx, 'Pos.']
        tf.loc[right_idx, 'Pos.'] = temp_pos

    return tf

def Wing(n, limit):
    r = 0
    if n > limit:
        r += 2
        n -= 2
    return n, r


def optimise(df, player_list, formation):
    pos_constraints = {'GK_rating': 1, 'CB_rating': 0, 'FB_rating': 0, 'CDM_rating': 0, 'CM_rating': 0, 'WM_rating': 0,'CAM_rating': 0, 'W_rating': 0, 'ST_rating': 0}

    # Split the formation and convert to integers
    f = list(map(int, formation.split("-")))

    # n-n-n: 4-3-3
    # n-n-n-n: 4-2-3-1
    # n-n-n-n-n: 4-1-2-1-2

    # Assign CB and FB ratings
    
    pos_constraints['CB_rating'], pos_constraints['FB_rating'] = Wing(f[0], 3)

    # Calculate m and assign CM and WM ratings
    m = (len(f) - 1)//2
    
    pos_constraints['CM_rating'], pos_constraints['WM_rating'] = Wing(f[m], 3)
    # Assign ST and W ratings
    pos_constraints['ST_rating'] = f[-1]
    pos_constraints['ST_rating'], pos_constraints['W_rating'] = Wing(f[-1], 2)

    if len(f) > 3:
        pos_constraints['CAM_rating'] = f[-2]
        if f[-1] < 3:
            pos_constraints['CAM_rating'], pos_constraints['W_rating'] = Wing(f[-2], 2)

    # If the formation has 5 parts, assign CDM rating
    if len(f) == 5:
        pos_constraints['CDM_rating'] = f[1]

    players = df[df['index'].isin(player_list)]
    

    sel = players[['index'] + [pos for pos in pos_constraints.keys()]]
    prob = LpProblem("Maximize_Sum", LpMaximize)
    
    variables = {(i, j): LpVariable(f"x_{i}_{j}", cat=LpBinary) for i in range(sel.shape[0]) for j in range(1, sel.shape[1])}
    
    prob += lpSum(sel.iloc[i, j] * variables[i, j] for i in range(sel.shape[0]) for j in range(1, sel.shape[1]))
    
    for i in range(sel.shape[0]):
        prob += lpSum(variables[i, j] for j in range(1, sel.shape[1])) <= 1
    
    for j in range(1, sel.shape[1]):
        prob += lpSum(variables[i, j] for i in range(sel.shape[0])) == pos_constraints[sel.columns[j]]
    
    prob.solve()
    
    selected_info = [(i, j) for i in range(sel.shape[0]) for j in range(1, sel.shape[1]) if variables[i, j].varValue == 1]
    
    position_mapping = {
        'GK_rating': 'GK', 
        'CB_rating': ['CB{}'.format(i+1) for i in range(pos_constraints['CB_rating'])],
        'FB_rating': ['LB', 'RB'],
        'CDM_rating': ['DM{}'.format(i+1) for i in range(pos_constraints['CDM_rating'])],
        'CM_rating': ['CM{}'.format(i+1) for i in range(pos_constraints['CM_rating'])],
        'WM_rating': ['LM','RM'],
        'CAM_rating': ['AM{}'.format(i+1) for i in range(pos_constraints['CAM_rating'])],
        'W_rating': ['LW','RW'],
        'ST_rating': ['ST{}'.format(i+1) for i in range(pos_constraints['ST_rating'])],
    }
    
    position_counts = {key: 0 for key in position_mapping.keys()}
    player_positions = {}

    for i, j in selected_info:
        pos = position_mapping[sel.columns[j]]
        if isinstance(pos, list):
            pos = pos[position_counts[sel.columns[j]]]
            position_counts[sel.columns[j]] += 1
        player_positions[pos] = (sel.iloc[i, 0], sel.iloc[i, j])
    
    tf = pd.DataFrame([(pos, val[0], val[1]) for pos, val in player_positions.items()], columns=["Pos.", "index", "Rating"])
    tf = pd.merge(tf, df[['long_name', 'short_name', 'Pref', 'player_face_url', 'index']], on="index", how="left").rename(columns={'short_name': 'Name'})
    # long_map = tf[['Name', 'long_name']]
    tf = tf[['Name', 'Pos.', 'Rating', 'Pref', 'player_face_url', 'index']]
    
    if 'LB' in tf['Pos.'].values: tf = handle_sides(tf, 'LB', 'RB')
    if 'LM' in tf['Pos.'].values: tf = handle_sides(tf, 'LM', 'RM')
    if 'LW' in tf['Pos.'].values: tf = handle_sides(tf, 'LW', 'RW')

    return [
        {
            "Name": row['Name'],
            "Pos": row['Pos.'],
            "Rating": round(row['Rating'], 2),
            "player_face_url": row['player_face_url'],
            "index": row['index']
         }
          for _, row in tf.iterrows()
        ]

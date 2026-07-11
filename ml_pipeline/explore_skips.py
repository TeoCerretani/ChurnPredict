import pandas as pd
import json

data = []
with open('../mini_sparkify_event_data.json', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if line.strip():
            data.append(json.loads(line))
        if i > 10000:  # just load a subset for exploration
            break

df = pd.DataFrame(data)
df = df[df['userId'] != '']
df = df.sort_values(['userId', 'ts'])

# Get only NextSong
df_songs = df[df['page'] == 'NextSong'].copy()

# Calculate time until next event for the same user
df_songs['next_ts'] = df_songs.groupby('userId')['ts'].shift(-1)
df_songs['listen_duration'] = (df_songs['next_ts'] - df_songs['ts']) / 1000.0 # to seconds

df_songs['is_skipped'] = (df_songs['listen_duration'] < (df_songs['length'] - 5)).astype(int)
df_songs['is_skipped'] = df_songs['is_skipped'].fillna(0) # Last song of user has no next_ts

print(df_songs[['userId', 'ts', 'length', 'listen_duration', 'is_skipped']].head(20))
print("Skip rate:", df_songs['is_skipped'].mean())

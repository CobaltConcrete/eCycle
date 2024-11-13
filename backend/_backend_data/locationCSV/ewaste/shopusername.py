import pandas as pd

FILENAME = "IctBatteriesLamps"

# Load the CSV file
file_path = f'{FILENAME}.csv'
df = pd.read_csv(file_path)

df['ShopUsername'] = 'dispose' + df['IndexName'].str.extract('(\d+)')[0]

output_path = f'usernames/{FILENAME}username.csv'
df.to_csv(output_path, index=False)

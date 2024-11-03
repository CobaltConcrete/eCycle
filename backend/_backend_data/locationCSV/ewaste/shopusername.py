import pandas as pd

FILENAME = "IctBatteriesLamps"

# Load the CSV file
file_path = f'{FILENAME}.csv'
df = pd.read_csv(file_path)

# Add the "ShopUsername" column based on the "IndexName" values
df['ShopUsername'] = 'dispose' + df['IndexName'].str.extract('(\d+)')[0]

# Save the modified DataFrame to a new CSV file
output_path = f'usernames/{FILENAME}username.csv'
df.to_csv(output_path, index=False)

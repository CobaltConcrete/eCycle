import pandas as pd

# Load the CSV file
file_path = 'generalwaste.csv'
df = pd.read_csv(file_path)

# Add the "ShopUsername" column based on the "IndexName" values
df['ShopUsername'] = 'general' + df['IndexName'].str.extract('(\d+)')[0]

# Save the modified DataFrame to a new CSV file
output_path = 'generalusername.csv'
df.to_csv(output_path, index=False)

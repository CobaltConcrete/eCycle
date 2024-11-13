import pandas as pd

file_path = 'generalwaste.csv'
df = pd.read_csv(file_path)

df['ShopUsername'] = 'general' + df['IndexName'].str.extract('(\d+)')[0]

output_path = 'generalusername.csv'
df.to_csv(output_path, index=False)

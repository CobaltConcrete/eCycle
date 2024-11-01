import csv

def process_csv(input_file, output_file):
    with open(input_file, 'r', newline='') as infile, open(output_file, 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in reader:
            # Split the Hyperlink field and keep only the first URL
            row['Hyperlink'] = row['Hyperlink'].split(';')[0].strip()
            writer.writerow(row)

# Usage
input_file = 'ewastefinal.csv'
output_file = 'ewastefinal_processed.csv'
process_csv(input_file, output_file)
print(f"Processed CSV saved as {output_file}")
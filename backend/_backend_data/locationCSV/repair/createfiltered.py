import csv

STRING = "electr"

def drop_rows_from_csv(input_file, output_file, drop_condition):
    with open(input_file, 'r', newline='', encoding='utf-8') as infile, \
         open(output_file, 'w', newline='', encoding='utf-8') as outfile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in reader:
            if drop_condition(row):
                writer.writerow(row)

def should_drop_row(row):
    return STRING in row['AcceptedItems']

# Usage
input_file = 'repair.csv'
output_file = 'electrical.csv'
drop_rows_from_csv(input_file, output_file, should_drop_row)
print(f"Filtered CSV saved as {output_file}")

import csv

STRING = "Small household appliances, gaming consoles, audio systems, power supplies"

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
    return STRING in row['Description']

# Usage
input_file = 'ewaste_cleaned.csv'
output_file = 'HhGameAudioPower.csv'
drop_rows_from_csv(input_file, output_file, should_drop_row)
print(f"Filtered CSV saved as {output_file}")

# def remove_rows_from_csv(input_file, output_file, removal_condition):
#     with open(input_file, 'r', newline='', encoding='utf-8') as infile, \
#          open(output_file, 'w', newline='', encoding='utf-8') as outfile:
#         reader = csv.DictReader(infile)
#         fieldnames = reader.fieldnames
        
#         writer = csv.DictWriter(outfile, fieldnames=fieldnames)
#         writer.writeheader()
        
#         for row in reader:
#             if not removal_condition(row):
#                 writer.writerow(row)

# def should_remove_row(row):
#     return STRING in row['Description']

# input_file = 'ewaste_cleaned.csv'
# output_file = 'ewaste_cleaned.csv'
# remove_rows_from_csv(input_file, output_file, should_remove_row)
# print(f"Cleaned CSV saved as {output_file}")
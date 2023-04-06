import os
import json
import re
import subprocess
import tempfile
import sys


def table_to_json(raw_table):
    # Split the raw data into rows
    rows = re.split(r'\n', raw_table.strip())

    # Extract the header row and remove whitespace
    header = [col.strip() for col in re.findall(r'\|\s*(.*?)\s*(?=\|)', rows[0])]

    # Extract the data rows and remove whitespace
    data_rows = [re.findall(r'\|\s*(.*?)\s*(?=\|)', row) for row in rows[2:]]

    result_dict = {"columns": header, "rows": data_rows}
    # Convert the list of dictionaries to a JSON object
    return result_dict


def run_sql_query(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise NotImplementedError(status_code=403, detail="Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write(query_str)
        query_file = f.name
    print(query_str)
    try:
        # Build command string
        cmd = ["/home/michael/projects/code/build/lingodb-release/run-sql", query_file,
               "/home/michael/projects/code/resources/data/" + db]

        # Execute command and capture output
        output = subprocess.check_output(cmd, universal_newlines=True, stderr=subprocess.STDOUT)
        # Parse output and skip first and last 4 lines
        splitted = output.split("\n")
        header_list = splitted[-2].split()
        times_list = splitted[-1].split()
        times_dict = {}

        for i in range(len(header_list)):
            if header_list[i] != 'name':
                times_dict[header_list[i]] = times_list[i]
        result = "\n".join(splitted[1:-4])
        table_as_json = table_to_json(raw_table=result)
        return {"rows": table_as_json, "times": times_dict}

    except subprocess.CalledProcessError as e:
        # Print error message to stderr
        print(e.output, file=sys.stderr)
        raise NotImplementedError(status_code=400, detail="Query could not be executed")


    finally:
        # Delete temporary file
        if query_file:
            os.remove(query_file)


print(run_sql_query("select * from studenten", "uni"))

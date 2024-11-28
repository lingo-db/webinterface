import os

from fastapi import FastAPI, HTTPException,Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

import re
import json
import subprocess
import tempfile
import sys
import resource
import os


DATA_ROOT = os.environ['DATA_ROOT'] #"/home/michael/projects/code/resources/data/"
BINARY_DIR = os.environ['LINGODB_BINARY_DIR'] #"/home/michael/projects/code/build/lingodb-release/"
app = FastAPI()
api_app = FastAPI(title="api app")
if "WEBINTERFACE_LOCAL" in os.environ:
    api_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Replace with a list of allowed origins, or use ["*"] to allow all origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

memory_limit = 10 * 1024 * 1024 * 1024
resource.setrlimit(resource.RLIMIT_AS, (memory_limit, memory_limit))


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


def get_analyzed_query_plan(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise RuntimeError("Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
        f.write(query_str)
        query_file = f.name
        f.flush()
        # Define the chained command as a string
        command = BINARY_DIR + "sql-to-mlir " + query_file + " "+ DATA_ROOT + db + "/metadata.json | "+BINARY_DIR+"mlir-db-opt --use-db "+ DATA_ROOT + db + " --relalg-query-opt --relalg-track-tuples"
        print(command)
        # Create a temporary file to store the output
        with tempfile.NamedTemporaryFile(mode='w', delete=True) as tmpfile:
            # Call the chained command using subprocess.run()
            result = subprocess.run(command, shell=True, stdout=tmpfile, text=True, timeout=5, env={"LINGODB_PARALLELISM":"4"})

            # Check that the command exited successfully
            if result.returncode == 0:
                try:
                    # Build command string
                    cmd = [BINARY_DIR + "mlir-to-json", tmpfile.name,
                           DATA_ROOT + db]

                    # Execute command and capture output
                    output = subprocess.check_output(cmd, universal_newlines=True, stderr=subprocess.STDOUT, timeout=20)
                    return json.loads(output.split("\n")[0]);

                except subprocess.CalledProcessError as e:
                    # Print error message to stderr
                    print(e.output, file=sys.stderr)
                    raise HTTPException(status_code=400, detail="Query could not be executed")
                except subprocess.TimeoutExpired as e:
                    raise HTTPException(status_code=400, detail="Query took too long")
            else:
                # Print the error message
                print(result.stderr.strip())


def get_query_plan(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise RuntimeError("Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
        f.write(query_str)
        query_file = f.name
        f.flush()
        # Define the chained command as a string
        command = BINARY_DIR + "sql-to-mlir " + query_file + " "+DATA_ROOT + db + "/metadata.json |  "+BINARY_DIR+"/mlir-db-opt --use-db "+DATA_ROOT + db + " --relalg-query-opt"
        print(command)
        # Create a temporary file to store the output
        with tempfile.NamedTemporaryFile(mode='w', delete=True) as tmpfile:
            # Call the chained command using subprocess.run()
            result = subprocess.run(command, shell=True, stdout=tmpfile, text=True, timeout=5)

            # Check that the command exited successfully
            if result.returncode == 0:
                try:
                    # Build command string
                    cmd = [BINARY_DIR + "mlir-to-json", tmpfile.name]

                    # Execute command and capture output
                    output = subprocess.check_output(cmd, universal_newlines=True, stderr=subprocess.STDOUT, timeout=5)
                    return json.loads(output.split("\n")[0]);

                except subprocess.CalledProcessError as e:
                    # Print error message to stderr
                    print(e.output, file=sys.stderr)
                    raise HTTPException(status_code=400, detail="Query could not be executed")
                except json.decoder.JSONDecodeError as e:
                    raise HTTPException(status_code=400, detail="JSON Query Plan could not be created")
            else:
                # Print the error message
                print(result.stderr.strip())


def run_sql_query(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise HTTPException(status_code=403, detail="Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write(query_str)
        query_file = f.name
    print(query_str)
    try:
        # Build command string
        cmd = [BINARY_DIR + "run-sql", query_file,
               DATA_ROOT + db]

        # Execute command and capture output
        output = subprocess.check_output(cmd, universal_newlines=True, stderr=subprocess.STDOUT, timeout=20, env={"LINGODB_PARALLELISM":"4"})
        # Parse output and skip first and last 4 lines
        splitted = output.split("\n")
        header_list = splitted[-2].split()
        times_list = splitted[-1].split()
        times_dict = {}

        for i in range(len(header_list)):
            if header_list[i] != 'name':
                times_dict[header_list[i]] = float(times_list[i])
        result = "\n".join(splitted[1:-4])
        table_as_json = table_to_json(raw_table=result)
        return {"result": table_as_json, "timing": times_dict}

    except subprocess.CalledProcessError as e:
        # Print error message to stderr
        print(e.output, file=sys.stderr)
        raise HTTPException(status_code=400, detail="Query could not be executed:\n" + e.output)
    except subprocess.TimeoutExpired as e:
        raise HTTPException(status_code=400, detail="Query took too long")

    finally:
        # Delete temporary file
        if query_file:
            os.remove(query_file)


def sql_to_mlir(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise HTTPException(status_code=403, detail="Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
        f.write(query_str)
        query_file = f.name
        f.flush()
        try:
            # Build command string
            cmd = [BINARY_DIR + "sql-to-mlir", query_file,
                   DATA_ROOT + db + "/metadata.json"]
            # Execute command and capture output
            output = subprocess.check_output(cmd, universal_newlines=True, timeout=5)
            print(cmd)
            return output

        except subprocess.CalledProcessError as e:
            # Print error message to stderr
            print(e.output, file=sys.stderr)
            raise HTTPException(status_code=400, detail="Failed to generate MLIR")


def mlir_opt(mlir_str, db, opts):
    if db and db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise HTTPException(status_code=403, detail="Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
        f.write(mlir_str)
        mlir_file = f.name
        f.flush()
        try:
            # Build command string
            cmd = [BINARY_DIR + "mlir-db-opt"]
            if db:
                cmd.append("--use-db")
                cmd.append(DATA_ROOT + db)
            cmd.extend(opts)
            cmd.append(mlir_file)
            # Execute command and capture output
            output = subprocess.check_output(cmd, universal_newlines=True, timeout=5)
            print(cmd)
            return output

        except subprocess.CalledProcessError as e:
            # Print error message to stderr
            print(e.output, file=sys.stderr)
            raise HTTPException(status_code=400, detail="Failed to generate MLIR")


@api_app.post("/query_plan")
async def query_plan(database: str=Body(...), query: str=Body(...)):
    return get_query_plan(query, database)
@api_app.post("/analyzed_query_plan")
async def analyzed_query_plan(database: str=Body(...), query: str=Body(...)):
    return get_analyzed_query_plan(query, database)


@api_app.post("/execute")
async def execute(database: str=Body(...), query: str=Body(...)):
    return run_sql_query(query, database)


@api_app.post("/mlir_steps")
async def mlir_steps(database: str=Body(...), query: str=Body(...)):
    canonical = sql_to_mlir(query, database)
    qopt = mlir_opt(canonical, database, ["--relalg-query-opt"])
    subop = mlir_opt(qopt, None, ["--lower-relalg-to-subop"])
    imperative = mlir_opt(subop, None, ["--lower-subop"])
    lowlevel = mlir_opt(imperative, None, ["--lower-db", "--lower-dsa"])

    return {
        "canonical": canonical,
        "qopt": qopt,
        "subop": subop,
        "imperative": imperative,
        "lowlevel": lowlevel,
    }
app.mount("/api",api_app)
if "WEBINTERFACE_LOCAL" not in os.environ:
    app.mount("/", StaticFiles(directory="/webinterface/frontend",html=True), name="frontend")

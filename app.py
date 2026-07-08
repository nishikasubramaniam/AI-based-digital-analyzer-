"""
Flask + Pandas Backend
----------------------
Oru simple REST API — CSV file data-ah pandas use panni manage pannuvom.

Endpoints:
  GET    /                     -> health check
  POST   /upload               -> CSV file upload pannalam (form-data key: 'file')
  GET    /data                 -> ella data-vum (pagination support: ?page=1&limit=10)
  GET    /data/filter          -> column & value vachu filter (?column=name&value=John)
  GET    /data/stats           -> numeric columns oda mean/sum/min/max stats
  POST   /data                 -> puthu row add pannalam (JSON body)
  PUT    /data/<row_id>        -> row_id (index) vachu update pannalam
  DELETE /data/<row_id>        -> row_id (index) vachu delete pannalam
  GET    /data/download        -> current data-ah CSV ah download pannalam
"""

"""
Flask + Pandas Backend + Frontend (served together as one website)
--------------------------------------------------------------------
Ithu ippo ஒரே server-ல frontend (HTML/CSS/JS) and backend (API) rendaiyum
serve pannuthu. So file:// venaam, ella page-um http://127.0.0.1:5000/...
nu real website maari open aagum.

Website pages:
  GET  /                       -> login.html ku redirect pannuthu
  GET  /login.html             -> Login page
  GET  /registration.html      -> Register page
  GET  /dashboard.html         -> Dashboard page
  GET  /crud.html              -> CRUD / Ledger page

API endpoints:
  GET    /api/health           -> health check
  POST   /upload               -> CSV file upload pannalam (form-data key: 'file')
  GET    /data                 -> ella data-vum (pagination support: ?page=1&limit=10)
  GET    /data/filter          -> column & value vachu filter (?column=name&value=John)
  GET    /data/stats           -> numeric columns oda mean/sum/min/max stats
  POST   /data                 -> puthu row add pannalam (JSON body)
  PUT    /data/<row_id>        -> row_id (index) vachu update pannalam
  DELETE /data/<row_id>        -> row_id (index) vachu delete pannalam
  GET    /data/download        -> current data-ah CSV ah download pannalam
"""

import os
from flask import Flask, request, jsonify, send_file, send_from_directory, redirect
from flask_cors import CORS
import pandas as pd

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)  # extra safety; same-origin ah irundhalum problem varadhu

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DATA_FILE = os.path.join(DATA_DIR, "data.csv")

os.makedirs(DATA_DIR, exist_ok=True)


# ---------------- Website (frontend) routes ----------------

@app.route("/")
def home():
    """Root URL -> login page ku redirect pannuthu (real website maari)"""
    return redirect("/login.html")


@app.route("/<page_name>.html")
def serve_page(page_name):
    """login.html, registration.html, dashboard.html, crud.html serve pannum"""
    return send_from_directory(FRONTEND_DIR, f"{page_name}.html")




def load_data():
    """CSV file irundha load pannu, illa na empty DataFrame return pannu."""
    if os.path.exists(DATA_FILE):
        return pd.read_csv(DATA_FILE)
    return pd.DataFrame()


def save_data(df):
    df.to_csv(DATA_FILE, index=False)


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "Flask + Pandas backend running!",
        "data_file_exists": os.path.exists(DATA_FILE)
    })


@app.route("/upload", methods=["POST"])
def upload_file():
    """CSV file upload pannitu, athuve data source ah save pannum."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided. Use form-data key 'file'."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only .csv files allowed."}), 400

    try:
        df = pd.read_csv(file)
        save_data(df)
        return jsonify({
            "message": "File uploaded successfully",
            "rows": len(df),
            "columns": list(df.columns)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/data", methods=["GET"])
def get_data():
    """Ella data-vum pagination oda kudukum."""
    df = load_data()
    if df.empty:
        return jsonify({"message": "No data available. Upload a CSV first via /upload."}), 200

    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))

    start = (page - 1) * limit
    end = start + limit

    paginated = df.iloc[start:end].copy()
    paginated["_id"] = paginated.index  # row id reference ku

    return jsonify({
        "page": page,
        "limit": limit,
        "total_rows": len(df),
        "columns": list(df.columns),
        "data": paginated.to_dict(orient="records")
    })


@app.route("/data/filter", methods=["GET"])
def filter_data():
    """column & value query params vachu filter pannum."""
    df = load_data()
    if df.empty:
        return jsonify({"error": "No data available."}), 404

    column = request.args.get("column")
    value = request.args.get("value")

    if not column or value is None:
        return jsonify({"error": "Provide both 'column' and 'value' query params."}), 400

    if column not in df.columns:
        return jsonify({"error": f"Column '{column}' not found. Available: {list(df.columns)}"}), 400

    filtered = df[df[column].astype(str).str.contains(value, case=False, na=False)].copy()
    filtered["_id"] = filtered.index

    return jsonify({
        "matched_rows": len(filtered),
        "data": filtered.to_dict(orient="records")
    })


@app.route("/data/stats", methods=["GET"])
def get_stats():
    """Numeric columns oda basic stats (mean, sum, min, max, count)."""
    df = load_data()
    if df.empty:
        return jsonify({"error": "No data available."}), 404

    numeric_df = df.select_dtypes(include="number")
    if numeric_df.empty:
        return jsonify({"message": "No numeric columns found to compute stats."}), 200

    stats = {
        col: {
            "mean": round(float(numeric_df[col].mean()), 2),
            "sum": round(float(numeric_df[col].sum()), 2),
            "min": round(float(numeric_df[col].min()), 2),
            "max": round(float(numeric_df[col].max()), 2),
            "count": int(numeric_df[col].count())
        }
        for col in numeric_df.columns
    }
    return jsonify(stats)


@app.route("/data", methods=["POST"])
def add_row():
    """Puthu row add pannalam. JSON body -> {"col1": "val1", "col2": "val2"}"""
    df = load_data()
    new_row = request.get_json()

    if not new_row:
        return jsonify({"error": "JSON body required."}), 400

    new_df = pd.DataFrame([new_row])
    df = pd.concat([df, new_df], ignore_index=True)
    save_data(df)

    return jsonify({
        "message": "Row added successfully",
        "new_row_id": len(df) - 1,
        "total_rows": len(df)
    }), 201


@app.route("/data/<int:row_id>", methods=["PUT"])
def update_row(row_id):
    """row_id (index) vachu andha row update pannalam."""
    df = load_data()

    if df.empty or row_id not in df.index:
        return jsonify({"error": f"Row id {row_id} not found."}), 404

    updates = request.get_json()
    if not updates:
        return jsonify({"error": "JSON body required."}), 400

    for key, value in updates.items():
        if key in df.columns:
            df.at[row_id, key] = value
        else:
            return jsonify({"error": f"Column '{key}' does not exist."}), 400

    save_data(df)
    return jsonify({"message": f"Row {row_id} updated successfully"})


@app.route("/data/<int:row_id>", methods=["DELETE"])
def delete_row(row_id):
    """row_id (index) vachu andha row delete pannalam."""
    df = load_data()

    if df.empty or row_id not in df.index:
        return jsonify({"error": f"Row id {row_id} not found."}), 404

    df = df.drop(index=row_id).reset_index(drop=True)
    save_data(df)
    return jsonify({"message": f"Row {row_id} deleted successfully", "total_rows": len(df)})


@app.route("/data/download", methods=["GET"])
def download_data():
    """Current data-ah CSV file ah download pannalam."""
    if not os.path.exists(DATA_FILE):
        return jsonify({"error": "No data available to download."}), 404

    return send_file(DATA_FILE, as_attachment=True, download_name="data_export.csv")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

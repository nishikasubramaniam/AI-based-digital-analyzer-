from flask import Flask, request, jsonify
from database import create_connection

app = Flask(__name__)

@app.route("/")
def home():
    return "AI Digital Analyzer Backend Running"

@app.route("/analyze", methods=["POST"])
def analyze():
    return jsonify({
        "status": "success",
        "result": "Analysis Completed"
    })

if __name__ == "__main__":
    app.run(debug=True)

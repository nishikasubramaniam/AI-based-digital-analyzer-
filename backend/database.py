import sqlite3

def create_connection():
    conn = sqlite3.connect("database/ai_analyzer.db")
    return conn

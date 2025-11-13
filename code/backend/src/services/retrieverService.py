# retrieverService.py
import os
import json
import time
import numpy as np
import requests
import psycopg2
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer

# CONFIG via env
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "rag_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "yourpassword")
RETRIEVER_PORT = int(os.getenv("RETRIEVER_PORT", 9000))
BIOBERT_API = os.getenv("BIOBERT_API", "http://0.0.0.0:8000/ask")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
EMBED_DIM = int(os.getenv("EMBED_DIM", 384))
RISK_QUESTION = os.getenv("RISK_QUESTION", "Assess the risk of high-grade cervical lesions based on this report")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 500))
TOP_K = int(os.getenv("TOP_K", 3))

app = FastAPI(title="Retriever Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[Retriever] Loading embedder model:", EMBEDDING_MODEL)
embedder = SentenceTransformer(EMBEDDING_MODEL)
print("[Retriever] Embedder ready.")

DB_PORT = int(os.getenv("DB_PORT", 5432))  # read port from environment

def get_conn(retries=5, delay=3):
    for i in range(retries):
        try:
            return psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD
            )
        except psycopg2.OperationalError as e:
            print(f"[Retriever] DB connection failed (attempt {i+1}/{retries}): {e}")
            time.sleep(delay)
    raise Exception(f"[Retriever] Could not connect to DB after {retries} attempts")


def init_db():
    print("[Retriever] Ensuring pgvector extension and table exist...")
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    except Exception as e:
        # Some managed PGs may not allow extension creation; print and continue
        print("[Retriever] Warning: could not create extension (maybe already exists or not allowed):", e)
    cur.execute(f"""
    CREATE TABLE IF NOT EXISTS report_chunks (
        id SERIAL PRIMARY KEY,
        doc_id TEXT,
        chunk_text TEXT,
        embedding VECTOR({EMBED_DIM}),
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("[Retriever] DB initialized.")

init_db()

def chunks_from_text(text: str):
    text = text.strip()
    if not text:
        return []
    return [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]

def store_embeddings(doc_id: str, text: str):
    chunks = chunks_from_text(text)
    if not chunks:
        print("[Retriever] No chunks to store.")
        return 0

    embeddings = embedder.encode(chunks, convert_to_numpy=True)
    conn = get_conn()
    cur = conn.cursor()
    inserted = 0
    try:
        for chunk, emb in zip(chunks, embeddings):
            # convert numpy floats to Python floats and format into array literal
            emb_list = [float(x) for x in emb.tolist()]
            emb_str = "[" + ",".join(map(str, emb_list)) + "]"
            cur.execute(
                "INSERT INTO report_chunks (doc_id, chunk_text, embedding) VALUES (%s, %s, %s::vector)",
                (doc_id, chunk, emb_str),
            )
            inserted += 1
        conn.commit()
        print(f"[Retriever] Stored {inserted} chunks for doc_id={doc_id}")
    finally:
        cur.close()
        conn.close()
    return inserted

def retrieve_context(query: str, doc_id: str, top_k: int = TOP_K):
    q_emb = embedder.encode([query])[0]
    q_emb_list = [float(x) for x in q_emb.tolist()]
    q_emb_str = "[" + ",".join(map(str, q_emb_list)) + "]"

    conn = get_conn()
    cur = conn.cursor()
    sql = f"""
        SELECT chunk_text, (embedding <=> '{q_emb_str}') AS dist
        FROM report_chunks
        WHERE doc_id = %s
        ORDER BY dist ASC
        LIMIT %s;
    """
    cur.execute(sql, (doc_id, top_k))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        print(f"[Retriever] No matching chunks found for doc_id={doc_id}")
        return ""  # safely return empty string

    try:
        context = "\n".join([r[0] for r in rows if len(r) > 0])
    except Exception as e:
        print(f"[Retriever] Error building context: {e}")
        context = ""

    print(f"[Retriever] Retrieved {len(rows)} chunks (top_k={top_k}) for doc_id={doc_id}")
    return context


def ask_biobert(context: str, question: str, timeout=30):
    try:
        payload = {"context": context, "question": question}
        r = requests.post(BIOBERT_API, json=payload, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BioBERT API error: {str(e)}")

class AnalyzeRequest(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "retriever", "embedder": EMBEDDING_MODEL}

@app.post("/analyze")
def analyze_report(request: AnalyzeRequest):
    try:
        report_text = request.text.strip()
        if not report_text:
            raise HTTPException(status_code=400, detail="Empty text provided")

        doc_id = f"doc_{int(time.time())}"

        # 1) store embeddings
        count = store_embeddings(doc_id, report_text)

        # 2) retrieve context for risk question
        context = retrieve_context(RISK_QUESTION, doc_id, top_k=TOP_K)


        # if no context found, fallback to entire report_text
        if not context:
            print("[Retriever] No context found via similarity; using full report as context.")
            context = report_text[:2000]  # limit length

        # 3) call LLM (BioBERT)
        result = ask_biobert(context, RISK_QUESTION)
        print("[Retriever] BioBERT raw response:", result)
        answer = result.get("answer", "No answer").lower()
        # interpret answer semantically
        score=0
        if "high" in answer:
            score = 9.0
        elif "moderate" in answer or "intermediate" in answer:
            score = 6.0
        elif "low" in answer:
            score = 2.0
        else:
            score = 5.0  


        return {
            "doc_id": doc_id,
            "stored_chunks": count,
            "answer": answer,
            "score": score,
            "context_preview": context[:1000]
        }
    except HTTPException:
        raise
    except Exception as e:
        print("[Retriever] Unexpected error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print(f"[Retriever] Starting service on 0.0.0.0:{RETRIEVER_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=RETRIEVER_PORT)

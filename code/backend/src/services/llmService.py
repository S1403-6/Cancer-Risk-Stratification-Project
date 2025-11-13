# from fastapi import FastAPI
# from pydantic import BaseModel
# from transformers import pipeline
# import uvicorn

# app = FastAPI()

# print("Loading BioBERT model...")
# nlp_pipeline = pipeline('question-answering', 
#                         model='dmis-lab/biobert-base-cased-v1.1-squad',
#                         tokenizer='dmis-lab/biobert-base-cased-v1.1-squad')
# print("Model loaded successfully.")

# class Query(BaseModel):
#     context: str
#     question: str

# @app.post("/ask")
# def ask_biobert(query: Query):
#     try:
#         result = nlp_pipeline(question=query.question, context=query.context)
#         return {"answer": result["answer"], "score": result["score"]}
#     except Exception as e:
#         return {"error": str(e)}

# if __name__ == "__main__":
#     uvicorn.run(app, host="127.0.0.1", port=8000)
# llmService.py
import os
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

MODEL_NAME = os.getenv("BIOBERT_MODEL", "dmis-lab/biobert-base-cased-v1.1-squad")
LLM_PORT = int(os.getenv("LLM_PORT", 8000))

app = FastAPI(title="BioBERT LLM Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[LLM] Initializing LLM service...")
try:
    from transformers import pipeline
    print(f"[LLM] Loading model {MODEL_NAME} (this may take a while)...")
    nlp_pipeline = pipeline('question-answering', model=MODEL_NAME, tokenizer=MODEL_NAME)
    print("[LLM] Model loaded.")
except Exception as e:
    print("[LLM] Failed to load model:", str(e))
    nlp_pipeline = None

class Query(BaseModel):
    context: str
    question: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "llm", "model_loaded": nlp_pipeline is not None}

@app.post("/ask")
def ask_biobert(query: Query):
    if nlp_pipeline is None:
        return {"error": "Model not loaded"}
    try:
        result = nlp_pipeline(question=query.question, context=query.context)
        # result contains 'answer', 'score', 'start', 'end'
        return {"answer": result.get("answer", ""), "score": float(result.get("score", 0.0))}
    except Exception as e:
        print("[LLM] Error during inference:", str(e))
        return {"error": str(e)}

if __name__ == "__main__":
    print(f"[LLM] Starting LLM service on 0.0.0.0:{LLM_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=LLM_PORT)


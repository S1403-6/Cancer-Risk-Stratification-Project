
import os
import tempfile
import json
import requests
import uvicorn
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

OCR_PORT = int(os.getenv("OCR_PORT", 7000))
RETRIEVER_API = os.getenv("RETRIEVER_API", "http://0.0.0.0:9000/analyze")
FORWARD_TO_RETRIEVER = os.getenv("FORWARD_TO_RETRIEVER", "true").lower() in ("1", "true", "yes")
TIMEOUT = int(os.getenv("OCR_FORWARD_TIMEOUT", 30))

app = FastAPI(title="OCR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    doc = fitz.open(pdf_path)
    for page in doc:
        text += page.get_text()
    doc.close()
    return text

@app.get("/health")
def health():
    return {"status": "ok", "service": "ocr", "port": OCR_PORT}

@app.post("/ocr")
async def process_ocr(file: UploadFile = File(...)):
    try:
        print("[OCR] Received file:", getattr(file, "filename", "unknown"))
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            data = await file.read()
            tmp.write(data)
            tmp_path = tmp.name

        text = extract_text_from_pdf(tmp_path)
        print(f"[OCR] Extracted {len(text)} chars")

        # Save local copy for debugging
        out = {"ocr_text": text}
        with open("output.json", "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)

        response_payload = {"extracted_text": text}

        # Optionally forward to retriever/analyze service (so backend can be simpler)
        if FORWARD_TO_RETRIEVER:
            try:
                print(f"[OCR] Forwarding extracted text to retriever at {RETRIEVER_API}")
                r = requests.post(RETRIEVER_API, json={"text": text}, timeout=TIMEOUT)
                r.raise_for_status()
                retriever_resp = r.json()
                print("[OCR] Retriever response received.")
                response_payload["retriever_response"] = retriever_resp
            except Exception as e:
                print("[OCR] Warning: failed to forward to retriever:", str(e))
                response_payload["retriever_error"] = str(e)

        return response_payload

    except Exception as e:
        print("[OCR] Error:", str(e))
        return {"error": str(e)}

if __name__ == "__main__":
    print(f"[OCR] Starting OCR service on 0.0.0.0:{OCR_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=OCR_PORT)


import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import analytics, predict, ask, pdf

app = FastAPI(title="Barzel Analytics V3", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"(https://barzel-v3-dashboard-.*\.vercel\.app|http://localhost:3000)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(predict.router, prefix="/api/predict", tags=["predict"])
app.include_router(ask.router, prefix="/api/ask", tags=["ask"])
app.include_router(pdf.router, prefix="/api/pdf", tags=["pdf"])

@app.get("/api/health")
async def health():
    return {"status": "ok"}

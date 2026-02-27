from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import spotify, ml

app = FastAPI(title="Music Taste DNA API")

_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(spotify.router, prefix="/spotify", tags=["spotify"])
app.include_router(ml.router, prefix="/ml", tags=["ml"])


@app.get("/health")
def health():
    return {"status": "ok"}

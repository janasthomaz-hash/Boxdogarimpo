"""Minimal health endpoint for the independent O GARIMPO backend.

This module deliberately exposes no product, credential, or publishing endpoints.
"""
from fastapi import FastAPI

app = FastAPI(
    title="O GARIMPO Backend",
    version="0.1.0",
    description="Health endpoint only; integrations are not yet enabled.",
)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "o-garimpo-backend",
        "integrations_enabled": False,
        "publishing_enabled": False,
    }

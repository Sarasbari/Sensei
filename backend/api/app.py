"""
app.py — FastAPI Application Entry Point

Main Sensei backend application.
Registers all routers and middleware.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.webhooks.handler import router as webhooks_router
from backend.api.routes import router as api_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title="Sensei",
        description="Generative + Agentic AI platform for autonomous code review",
        version="0.1.0",
    )

    # CORS middleware for frontend dashboard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(webhooks_router)
    app.include_router(api_router)

    @app.on_event("startup")
    async def startup():
        """Initialize connections on startup."""
        # TODO: Initialize ChromaDB client
        # TODO: Initialize PostgreSQL connection pool
        # TODO: Verify Groq API connectivity
        pass

    @app.on_event("shutdown")
    async def shutdown():
        """Cleanup connections on shutdown."""
        # TODO: Close database connections
        pass

    return app


app = create_app()

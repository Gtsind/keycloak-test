from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import Base, engine
from app.routers import organizations

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="aibydna user-service", lifespan=lifespan)
app.include_router(organizations.router)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

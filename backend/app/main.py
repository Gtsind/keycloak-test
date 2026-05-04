from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import Base, engine
from app.routers import audit, me, members, organizations, subscriptions

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="aibydna user-service", lifespan=lifespan)
app.include_router(organizations.router)
app.include_router(members.router)
app.include_router(subscriptions.router)
app.include_router(me.router)
app.include_router(audit.router)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

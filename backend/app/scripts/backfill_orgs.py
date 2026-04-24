import asyncio
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert

from app import keycloak_admin
from app.db import SessionLocal
from app.models import Organization


async def main() -> None:
    kc_orgs = await keycloak_admin.list_organizations()
    inserted = 0
    async with SessionLocal() as session:
        for org in kc_orgs:
            stmt = (
                insert(Organization)
                .values(id=UUID(org["id"]), name=org["name"])
                .on_conflict_do_nothing(index_elements=["id"])
            )
            result = await session.execute(stmt)
            inserted += result.rowcount or 0
        await session.commit()
    print(f"backfill: {inserted} inserted, {len(kc_orgs) - inserted} skipped")


if __name__ == "__main__":
    asyncio.run(main())

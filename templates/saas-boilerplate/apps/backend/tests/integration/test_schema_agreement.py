import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run integration tests against compose DB",
)


@pytest.mark.asyncio
async def test_schema_agreement_passes_against_compose_db():
    from saas_forge_backend.db.engine import get_engine
    from saas_forge_backend.db.schema_check import assert_schema_agreement

    await assert_schema_agreement(get_engine())

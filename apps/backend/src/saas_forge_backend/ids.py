from __future__ import annotations

from cuid2 import cuid_wrapper

# cuid2 exposes a generator factory, not a module-level cuid() function.
new_id = cuid_wrapper()

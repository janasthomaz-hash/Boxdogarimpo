"""Safe preflight cycle for O GARIMPO.

No external data is fetched and no offer is published. The production cycle must
not be enabled until an authorized source, persistent storage, affiliate-link
validation and integration tests are implemented.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone


def build_preflight_report() -> dict[str, object]:
    return {
        "service": "o-garimpo",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mode": "dry-run",
        "offers_processed": 0,
        "published": 0,
        "status": "BLOCKED_PENDING_INTEGRATIONS",
        "blockers": [
            "authorized_product_source_not_configured",
            "persistent_database_not_configured",
            "official_affiliate_link_flow_not_verified",
            "publication_channel_not_homologated",
        ],
        "side_effects": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print preflight status only; no network or write operations.",
    )
    args = parser.parse_args()

    # Fail closed: this scaffold intentionally has no live execution mode.
    if not args.dry_run:
        parser.error("Live cycle is disabled. Use --dry-run until integrations are implemented and tested.")

    print(json.dumps(build_preflight_report(), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

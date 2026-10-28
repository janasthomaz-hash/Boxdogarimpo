import unittest

from backend.cycle import build_preflight_report


class PreflightReportTests(unittest.TestCase):
    def test_preflight_is_blocked_until_integrations_are_verified(self) -> None:
        report = build_preflight_report()
        self.assertEqual(report["status"], "BLOCKED_PENDING_INTEGRATIONS")
        self.assertEqual(report["published"], 0)
        self.assertEqual(report["offers_processed"], 0)
        self.assertFalse(report["side_effects"])
        self.assertGreaterEqual(len(report["blockers"]), 4)


if __name__ == "__main__":
    unittest.main()

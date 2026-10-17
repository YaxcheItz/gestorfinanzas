import unittest
from urllib.parse import parse_qs, urlsplit

from gmail_auth import SCOPE, authorization_url, callback_code


class OAuthTest(unittest.TestCase):
    def test_pkce_readonly_scope_and_state(self):
        url = authorization_url(
            "client", "http://127.0.0.1:123/callback", "random-state", "verifier"
        )
        parsed = urlsplit(url)
        self.assertEqual(parsed.hostname, "accounts.google.com")
        query = parse_qs(parsed.query)
        self.assertEqual(query["scope"], [SCOPE])
        self.assertEqual(query["code_challenge_method"], ["S256"])
        self.assertEqual(query["state"], ["random-state"])
        self.assertNotIn("verifier", url)

    def test_callback_rejects_wrong_state_path_duplicate_values(self):
        self.assertEqual(callback_code("/callback?code=ok&state=state", "state"), "ok")
        for path in [
            "/other?code=x&state=state",
            "/callback?code=x&state=forged",
            "/callback?code=x&code=y&state=state",
            "/callback?error=denied&state=state",
        ]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                callback_code(path, "state")


if __name__ == "__main__":
    unittest.main()

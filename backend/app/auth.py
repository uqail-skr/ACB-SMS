import base64
import hashlib
import hmac
import json
import secrets
import time
from uuid import UUID


PASSWORD_ITERATIONS = 600_000
PASSWORD_ALGORITHM = "pbkdf2_sha256"
TOKEN_LIFETIME_SECONDS = 8 * 60 * 60


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"{PASSWORD_ALGORITHM}${PASSWORD_ITERATIONS}${_b64encode(salt)}${_b64encode(derived)}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, rounds_text, salt_text, expected_text = password_hash.split("$")
        rounds = int(rounds_text)
        if algorithm != PASSWORD_ALGORITHM or not 100_000 <= rounds <= 1_000_000:
            raise ValueError
        salt = _b64decode(salt_text)
        expected = _b64decode(expected_text)
    except (ValueError, TypeError):
        hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), b"invalid-password-hash", PASSWORD_ITERATIONS)
        return False

    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
    return hmac.compare_digest(derived, expected)


def create_access_token(user_id: UUID, secret: str, now: int | None = None) -> str:
    issued_at = int(time.time()) if now is None else now
    header = _b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64encode(
        json.dumps(
            {"sub": str(user_id), "iat": issued_at, "exp": issued_at + TOKEN_LIFETIME_SECONDS},
            separators=(",", ":"),
        ).encode()
    )
    unsigned_token = f"{header}.{payload}"
    signature = hmac.new(secret.encode("utf-8"), unsigned_token.encode("ascii"), hashlib.sha256).digest()
    return f"{unsigned_token}.{_b64encode(signature)}"


def decode_access_token(token: str, secret: str, now: int | None = None) -> UUID:
    try:
        header_text, payload_text, signature_text = token.split(".")
        unsigned_token = f"{header_text}.{payload_text}"
        expected_signature = hmac.new(
            secret.encode("utf-8"), unsigned_token.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(expected_signature, _b64decode(signature_text)):
            raise ValueError

        header = json.loads(_b64decode(header_text))
        payload = json.loads(_b64decode(payload_text))
        current_time = int(time.time()) if now is None else now
        if header.get("alg") != "HS256" or int(payload["exp"]) <= current_time:
            raise ValueError
        return UUID(payload["sub"])
    except (ValueError, TypeError, KeyError, AttributeError, json.JSONDecodeError):
        raise ValueError("Invalid or expired access token.") from None


DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(24))

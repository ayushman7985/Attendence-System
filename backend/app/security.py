import os
import secrets
import string
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt

# bcrypt only hashes the first 72 bytes of a password.
_MAX_BYTES = 72

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "dev-secret-change-in-production-use-a-long-random-string",
)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))


def _truncate(password: str) -> bytes:
    return password.encode("utf-8")[:_MAX_BYTES]


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(_truncate(password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return bcrypt.checkpw(_truncate(plain), hashed.encode("utf-8"))


def create_access_token(*, user_id: int, role: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "role": role,
        "email": email.lower(),
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid token") from exc


def generate_invite_code(db, length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(length))
        import models

        exists = db.query(models.Company).filter(
            models.Company.invite_code == code
        ).first()
        if not exists:
            return code


def normalize_invite_code(code: str) -> str:
    return code.strip().upper()
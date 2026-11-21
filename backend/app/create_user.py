from getpass import getpass

from sqlalchemy import func, select

from app.auth import hash_password
from app.database import SessionLocal
from app.models import User, UserRole


def create_user() -> None:
    username = input("Username: ").strip().lower()
    email_username = len(username) <= 254 and "@" in username and not any(character.isspace() for character in username)
    standard_username = 3 <= len(username) <= 50 and all(
        character.isalnum() or character in "._-" for character in username
    )
    if not email_username and not standard_username:
        raise ValueError("Use a 3-50 character username or an email address as the username.")

    email = input("Email address: ").strip().lower()
    if len(email) > 254 or email.count("@") != 1 or any(character.isspace() for character in email):
        raise ValueError("Enter a valid email address.")

    print("Available roles: " + ", ".join(role.name for role in UserRole))
    role_name = input("Role: ").strip().upper()
    try:
        role = UserRole[role_name]
    except KeyError:
        raise ValueError("Choose one of the listed roles.") from None

    password = getpass("Password (at least 12 characters): ")
    if len(password) < 12 or len(password) > 128:
        raise ValueError("Password must be between 12 and 128 characters.")
    if password != getpass("Confirm password: "):
        raise ValueError("Passwords do not match.")

    with SessionLocal.begin() as db:
        existing = db.scalar(select(User).where(func.lower(User.username) == username))
        if existing:
            if existing.email.lower() != email:
                raise ValueError("The username already belongs to a different email address.")
            existing.password_hash = hash_password(password)
            existing.role = role
        else:
            if db.scalar(select(User.id).where(User.email == email)):
                raise ValueError("That email address already belongs to another username.")
            db.add(
                User(
                    username=username,
                    email=email,
                    password_hash=hash_password(password),
                    role=role,
                )
            )
    print(f"Saved {role.name} account '{username}'.")


if __name__ == "__main__":
    create_user()

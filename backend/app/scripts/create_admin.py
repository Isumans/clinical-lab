import argparse
from getpass import getpass

from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.services.auth import get_user_by_email
from app.services.security import hash_password


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create the initial LabSync administrator")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    email = args.email.strip().lower()
    password = getpass("Password: ")
    confirmation = getpass("Confirm password: ")

    if password != confirmation:
        raise SystemExit("Passwords do not match.")
    if len(password) < 12:
        raise SystemExit("Password must be at least 12 characters.")

    with SessionLocal() as db:
        if get_user_by_email(db, email) is not None:
            raise SystemExit("A user with that email already exists.")
        db.add(
            User(
                name=args.name.strip(),
                email=email,
                password_hash=hash_password(password),
                role=UserRole.ADMIN,
            )
        )
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise SystemExit("Unable to create administrator.") from exc

    print(f"Administrator created for {email}.")


if __name__ == "__main__":
    main()

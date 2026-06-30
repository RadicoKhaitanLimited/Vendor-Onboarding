#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        import django
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    django_version = tuple(int(part) for part in django.get_version().split('.')[:2])
    if sys.version_info >= (3, 14) and django_version < (6, 0):
        raise RuntimeError(
            f"Django {django.get_version()} is not compatible with Python "
            f"{sys.version_info.major}.{sys.version_info.minor} in this project. "
            "Run the backend with backend\\venv\\Scripts\\python.exe or install "
            "the versions from backend\\requirements.txt."
        )
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

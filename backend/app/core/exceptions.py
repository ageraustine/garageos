class AppException(Exception):
    """Base exception for application errors."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ConflictError(AppException):
    """Resource already exists (409)."""

    pass


class UnauthorizedError(AppException):
    """Authentication failed (401)."""

    pass


class NotFoundError(AppException):
    """Resource not found (404)."""

    pass

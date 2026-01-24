"""
Error handling middleware for FastAPI.
Provides centralized exception handling and error responses.
"""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

try:
    # Try relative import (when used as package)
    from app.exceptions import (
        AppError,
        ValidationError,
        AuthenticationError,
        AuthorizationError,
        NotFoundError,
        DuplicateError,
        DatabaseError,
        FileProcessingError,
        ExternalServiceError,
        BusinessLogicError,
        TransactionError,
        RateLimitError,
        ConfigurationError
    )
except ImportError:
    # Fallback to absolute import (when main.py is entry point)
    from exceptions import (
        AppError
    )

logger = logging.getLogger(__name__)


def add_exception_handlers(app: FastAPI) -> None:
    """
    Add exception handlers to FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        """Handle custom AppError exceptions."""
        logger.error(
            f"AppError: {exc.message}",
            extra={
                "status_code": exc.status_code,
                "details": exc.details,
                "path": request.url.path,
                "method": request.method
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle Pydantic validation errors."""
        logger.warning(
            f"Validation error: {exc.errors()}",
            extra={
                "path": request.url.path,
                "method": request.method
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "ValidationError",
                "message": "Request validation failed",
                "details": exc.errors()
            }
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Handle HTTP exceptions."""
        logger.warning(
            f"HTTP {exc.status_code}: {exc.detail}",
            extra={
                "path": request.url.path,
                "method": request.method
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTPException",
                "message": exc.detail
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all other unhandled exceptions."""
        logger.error(
            f"Unhandled exception: {str(exc)}",
            exc_info=True,
            extra={
                "path": request.url.path,
                "method": request.method
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred"
            }
        )

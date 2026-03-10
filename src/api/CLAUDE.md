# API Module Context

## Purpose
Handles HTTP API endpoints and request/response logic for the Jupityr platform.

## Guidelines
- Use FastAPI for endpoint definitions
- Keep route handlers thin — delegate to core logic
- Validate input at the boundary using Pydantic models
- Return consistent response formats

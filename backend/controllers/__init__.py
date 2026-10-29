"""Controller layer.

Routers declare the HTTP contract (path, verb, query model, response model);
controllers decide *what* has to happen to satisfy it; services know *how* to
talk to the data plane. Nothing here parses a request or raises an HTTP
exception on its own — it either returns the payload or lets a service's
`APIError` travel up to the registered handler.
"""

__all__ = ["site_controller"]

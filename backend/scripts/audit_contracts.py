"""Architecture and audit-trail contract audit.

Three rules the backend claims to follow, checked mechanically instead of by
inspection:

1. **Every admin mutation writes an audit row.** The decorators prove a request
   was authorised; they say nothing about whether it was recorded. This walks
   the AST of `routers/` and `controllers/`, builds a call graph across module
   imports, and follows it until it reaches a `log_action` call. A delegate
   (`admin_site` -> `admin_site_controller`) therefore counts, because the
   audit row is written where the write happens.

2. **Only the data-access layer speaks HTTP.** `core/db.py` owns PostgREST.
   Every other module must go through `db`, so a missing timeout, a missing
   retry or a leaked key can only appear in one file.

3. **No GET route writes.** A read endpoint that reaches an INSERT/UPDATE/
   DELETE/RPC turns page loads into mutations: it breaks the moment the
   database is read-only, and it makes caching and retries unsafe.

Run from the `backend` directory:  python scripts/audit_contracts.py
"""

from __future__ import annotations

import ast
import os
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

ROOT = Path(__file__).resolve().parent.parent
MUTATION_DECORATORS = {"post", "put", "patch", "delete"}

#: Modules allowed to open a network connection. Everything else must use `db`
#: or the transport helper it exports.
NETWORK_OWNERS = {"core/db.py", "core/ai_client.py"}

#: Admin mutations whose audit row is written by a database function inside the
#: same transaction as the change. A second Python-side log would only add a
#: window where the write committed but the trail did not.
AUDITED_IN_SQL = {
    "routers.admin::assign_categories": "fn_rerank_device (07) writes audit_log",
    "routers.admin_content::remove_category_member": "fn_remove_category_member (08) writes audit_log",
    "routers.admin_content::reorder_category": "fn_rerank_category_batch (08) writes audit_log",
}

#: Admin mutations that legitimately produce no audit row, with the reason.
#: Keys are "<module>::<function>".
UNAUDITED_ADMIN_MUTATIONS: Dict[str, str] = {}

HTTP_MODULES = {"httpx", "requests", "aiohttp", "urllib3", "supabase", "psycopg", "psycopg2", "asyncpg"}

#: Calls that change data. A GET route reaching one of these makes a read
#: request depend on write access.
WRITE_PRIMITIVES = {"db.insert", "db.update", "db.delete", "db.rpc"}
WRITE_HELPERS = {"call_rpc", "log_action", "record_audit", "ensure_user"}

#: GET routes permitted to reach a write, with the reason the read survives a
#: failure of that write.
READ_PATHS_WITH_WRITE: Dict[str, str] = {
    "routers.retail::public_card": (
        "the view counter is wrapped: any failure falls back to a plain SELECT "
        "of the same card, so a locked database still serves the link"
    ),
    "routers.compare::saved_comparison": (
        "compare_devices is called with save_session=False; the only INSERT "
        "sits behind that flag, which this route never sets"
    ),
    "routers.recommendations::quick_recommendations": (
        "recommend() defaults to persist=False; the cache delete/insert sits "
        "behind that flag, which this route never sets"
    ),
}


# ── module discovery ──────────────────────────────────────────────
def _discover() -> Dict[str, Tuple[Path, ast.Module]]:
    """Every importable module under `routers/` and `controllers/`."""
    found: Dict[str, Tuple[Path, ast.Module]] = {}
    for package in ("routers", "controllers", "services", "core"):
        for path in sorted((ROOT / package).glob("*.py")):
            if path.name == "__init__.py":
                continue
            name = f"{package}.{path.stem}"
            found[name] = (path, ast.parse(path.read_text(encoding="utf-8"), filename=str(path)))
    return found


def _imports(tree: ast.Module) -> Dict[str, str]:
    """Local alias -> fully-qualified target ("module" or "module:attr")."""
    table: Dict[str, str] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                table[alias.asname or alias.name.split(".")[0]] = alias.name
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            for alias in node.names:
                table[alias.asname or alias.name] = f"{node.module}:{alias.name}"
    return table


def _chain(node: ast.AST) -> Optional[str]:
    """`a.b.c` for an attribute/name chain, else None."""
    parts: List[str] = []
    while isinstance(node, ast.Attribute):
        parts.append(node.attr)
        node = node.value
    if not isinstance(node, ast.Name):
        return None
    parts.append(node.id)
    return ".".join(reversed(parts))


def _called_names(func: ast.AST) -> Set[str]:
    """Dotted names of everything the function calls, resolved to modules."""
    names: Set[str] = set()
    for node in ast.walk(func):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node is not func:
            continue
        if isinstance(node, ast.Call):
            chain = _chain(node.func)
            if chain:
                names.add(chain)
    return names


# ── call-graph resolution ────────────────────────────────────────
class Graph:
    def __init__(self, modules: Dict[str, Tuple[Path, ast.Module]]) -> None:
        self.modules = modules
        self.imports = {name: _imports(tree) for name, (_, tree) in modules.items()}
        self.functions: Dict[str, ast.AST] = {}
        self.calls: Dict[str, Set[str]] = {}
        self.decorators: Dict[str, List[str]] = {}
        self.paths: Dict[str, str] = {}
        self._index()

    def _index(self) -> None:
        # Pass 1: every function name, across every module. Resolution in pass 2
        # needs the whole universe, otherwise a router that calls a controller
        # which calls a service resolves to nothing (module order decides).
        for module, (_, tree) in self.modules.items():
            for node in tree.body:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    self.functions[f"{module}::{node.name}"] = node

        # Pass 2: call edges and route metadata.
        for module, (_, tree) in self.modules.items():
            for node in tree.body:
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                key = f"{module}::{node.name}"
                self.calls[key] = self._resolve(module, node)
                self.decorators[key] = [
                    _chain(d.func) if isinstance(d, ast.Call) else _chain(d)
                    for d in node.decorator_list
                ]
                router_path = self._router_path(node)
                if router_path:
                    self.paths[key] = router_path

    def _resolve(self, module: str, func: ast.AST) -> Set[str]:
        """Map local call names onto "<module>::<function>" where known."""
        table = self.imports.get(module, {})
        resolved: Set[str] = set()
        for chain in _called_names(func):
            head, _, rest = chain.partition(".")
            first = rest.split(".")[0] if rest else ""
            target = table.get(head)
            if target is None:
                candidate = f"{module}::{head}"
            elif ":" in target:
                target_module, _, attr = target.partition(":")
                # `from controllers import admin_site_controller` then
                # `admin_site_controller.create_setting(...)`.
                candidate = (
                    f"{target_module}.{attr}::{first}" if rest else f"{target_module}::{attr}"
                )
            else:
                candidate = f"{target}::{first}" if rest else ""
            if candidate and candidate in self.functions:
                resolved.add(candidate)
        return resolved

    @staticmethod
    def _router_path(func: ast.AST) -> Optional[str]:
        """The literal path of the route decorator, if any."""
        for decorator in func.decorator_list:
            if isinstance(decorator, ast.Call) and decorator.args:
                first = decorator.args[0]
                if isinstance(first, ast.Constant) and isinstance(first.value, str):
                    return first.value
        return None

    def _audited(self, key: str, seen: Optional[Set[str]] = None) -> bool:
        seen = seen or set()
        if key in seen:
            return False
        seen.add(key)
        if key.endswith("::log_action"):
            return True
        func = self.functions.get(key)
        if func is None:
            return False
        if "log_action" in _called_names(func):
            return True
        return any(self._audited(callee, seen) for callee in self.calls.get(key, ()))

    def _writes(self, key: str, seen: Optional[Set[str]] = None) -> bool:
        """True when this function, or anything it reaches, mutates storage."""
        seen = seen or set()
        if key in seen:
            return False
        seen.add(key)
        func = self.functions.get(key)
        if func is None:
            return False
        for chain in _called_names(func):
            if chain in WRITE_PRIMITIVES or chain.split(".")[-1] in WRITE_HELPERS:
                return True
        return any(self._writes(callee, seen) for callee in self.calls.get(key, ()))


# ── checks ───────────────────────────────────────────────────────
def check_audit_coverage(graph: Graph) -> List[str]:
    problems: List[str] = []
    for key, decorators in sorted(graph.decorators.items()):
        module = key.split("::")[0]
        verbs = {
            d.split(".")[-1]
            for d in decorators
            if d and d.split(".")[-1] in MUTATION_DECORATORS
        }
        if not verbs:
            continue
        path = graph.paths.get(key, "")
        is_admin = module in {"routers.admin", "routers.admin_content", "routers.admin_site"} or path.startswith(
            "/admin"
        )
        if not is_admin:
            continue
        if key in UNAUDITED_ADMIN_MUTATIONS:
            continue
        if key in AUDITED_IN_SQL:
            continue
        if not graph._audited(key):
            problems.append(f"{key}  [{', '.join(sorted(verbs)).upper()} {path or '?'}]")
    return problems


def check_read_paths(graph: Graph) -> List[str]:
    """GET handlers that reach a write without a documented fallback."""
    problems: List[str] = []
    for key, decorators in sorted(graph.decorators.items()):
        verbs = {d.split(".")[-1] for d in decorators if d}
        if "get" not in verbs:
            continue
        if key in READ_PATHS_WITH_WRITE:
            continue
        if graph._writes(key):
            problems.append(f"{key}  [GET {graph.paths.get(key, '?')}]")
    return problems


def check_layering() -> List[str]:
    problems: List[str] = []
    for path in sorted(ROOT.rglob("*.py")):
        relative = path.relative_to(ROOT).as_posix()
        if relative.startswith(("scripts/", "__pycache__/")) or "__pycache__" in relative:
            continue
        if relative in NETWORK_OWNERS:
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as exc:  # pragma: no cover - a broken file is its own bug
            problems.append(f"{relative}: cannot parse ({exc})")
            continue
        for node in ast.walk(tree):
            names: Iterable[str] = ()
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                names = [node.module]
            for name in names:
                root = name.split(".")[0]
                if root in HTTP_MODULES:
                    problems.append(f"{relative}:{node.lineno} imports {name} outside core/db.py")
                    break
    return problems


def main() -> int:
    graph = Graph(_discover())
    audited_modules = len(graph.functions)
    audit_problems = check_audit_coverage(graph)
    layering_problems = check_layering()
    read_problems = check_read_paths(graph)

    admin_mutations = sum(
        1
        for key, decorators in graph.decorators.items()
        if any(d and d.split(".")[-1] in MUTATION_DECORATORS for d in decorators)
        and (
            key.split("::")[0] in {"routers.admin", "routers.admin_content", "routers.admin_site"}
            or graph.paths.get(key, "").startswith("/admin")
        )
    )
    read_routes = sum(
        1 for decorators in graph.decorators.values() if any(d and d.endswith(".get") for d in decorators)
    )
    print(
        f"functions indexed: {audited_modules}  admin mutations: {admin_mutations}"
        f"  GET routes: {read_routes}"
    )

    if audit_problems:
        print("\nADMIN MUTATION WITHOUT AN AUDIT ROW:")
        for row in audit_problems:
            print("  " + row)
    else:
        print(
            f"OK: every admin mutation reaches an audit row "
            f"({len(AUDITED_IN_SQL)} written by the ranking RPC in SQL,"
            f" {len(UNAUDITED_ADMIN_MUTATIONS)} documented exceptions)."
        )

    if layering_problems:
        print("\nNETWORK ACCESS OUTSIDE THE TRANSPORT LAYER:")
        for row in layering_problems:
            print("  " + row)
    else:
        print("OK: core/ owns every outbound connection (db.py, ai_client.py).")

    if read_problems:
        print("\nGET ROUTE THAT WRITES:")
        for row in read_problems:
            print("  " + row)
    else:
        print(
            "OK: no undocumented write on a GET route "
            f"({len(READ_PATHS_WITH_WRITE)} exceptions, each behind an explicit "
            "flag or wrapped in a read fallback)."
        )

    return 1 if (audit_problems or layering_problems or read_problems) else 0


if __name__ == "__main__":
    raise SystemExit(main())

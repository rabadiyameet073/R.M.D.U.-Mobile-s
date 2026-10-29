"""Comparison matrix builder.

Produces a conventional, frontend-friendly table (row = spec, column = device)
from live `device_specs` + `device_scores`, marks per-row winners, and computes
a weighted scoreboard using the same rules the recommender uses.
"""

from __future__ import annotations

import asyncio
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from core.db import db
from core.utils import as_float
from services.catalog_service import get_device_row, shape_device
from services.recommendation_engine import (
    PRIORITY_KEYS,
    SCORE_COLUMN,
    blended_weights,
    load_rules,
)

# (key, label, group, source, unit, higher_is_better, formatter)
ROW_DEFS: List[Tuple[str, str, str, str, Optional[str], Optional[bool], str]] = [
    ("price", "Price", "commercial", "device", "₹", False, "money"),
    ("launch_date", "Launched", "commercial", "device", None, None, "date"),
    ("overall_score", "Overall score", "scores", "scores", "/100", True, "score"),
    ("performance_score", "Performance", "scores", "scores", "/100", True, "score"),
    ("camera_score", "Camera", "scores", "scores", "/100", True, "score"),
    ("battery_score", "Battery", "scores", "scores", "/100", True, "score"),
    ("display_score", "Display", "scores", "scores", "/100", True, "score"),
    ("value_score", "Value", "scores", "scores", "/100", True, "score"),
    ("build_score", "Build", "scores", "scores", "/100", True, "score"),
    ("software_score", "Software", "scores", "scores", "/100", True, "score"),
    ("processor_name", "Processor", "processor", "specs", None, None, "text"),
    ("process_node", "Process", "processor", "specs", None, None, "text"),
    ("cpu_cores", "CPU cores", "processor", "specs", None, True, "int"),
    ("antutu_score", "AnTuTu", "processor", "specs", None, True, "int"),
    ("geekbench_single", "Geekbench single", "processor", "specs", None, True, "int"),
    ("geekbench_multi", "Geekbench multi", "processor", "specs", None, True, "int"),
    ("ram_gb", "RAM", "memory", "specs", "GB", True, "gb"),
    ("storage_gb", "Storage", "memory", "specs", "GB", True, "gb"),
    ("storage_type", "Storage type", "memory", "specs", None, None, "text"),
    ("display_size_inch", "Screen size", "display", "specs", "in", True, "inch"),
    ("display_resolution", "Resolution", "display", "specs", None, None, "text"),
    ("display_type", "Panel", "display", "specs", None, None, "text"),
    ("refresh_rate_hz", "Refresh rate", "display", "specs", "Hz", True, "hz"),
    ("peak_brightness_nit", "Peak brightness", "display", "specs", "nits", True, "nits"),
    ("protection", "Glass protection", "display", "specs", None, None, "text"),
    ("camera_primary_mp", "Main camera", "camera", "specs", "MP", True, "mp"),
    ("camera_ultra_mp", "Ultrawide", "camera", "specs", "MP", True, "mp"),
    ("camera_tele_mp", "Telephoto", "camera", "specs", "MP", True, "mp"),
    ("camera_front_mp", "Selfie", "camera", "specs", "MP", True, "mp"),
    ("camera_features", "Camera features", "camera", "specs", None, None, "list"),
    ("video_max_res", "Max video", "camera", "specs", None, None, "text"),
    ("battery_mah", "Battery", "battery", "specs", "mAh", True, "mah"),
    ("charging_watt", "Wired charging", "battery", "specs", "W", True, "watt"),
    ("wireless_watt", "Wireless charging", "battery", "specs", "W", True, "watt"),
    ("reverse_watt", "Reverse charging", "battery", "specs", "W", True, "watt"),
    ("five_g", "5G", "connectivity", "specs", None, True, "bool"),
    ("wifi_standard", "Wi-Fi", "connectivity", "specs", None, None, "text"),
    ("bluetooth_version", "Bluetooth", "connectivity", "specs", None, None, "text"),
    ("nfc", "NFC", "connectivity", "specs", None, True, "bool"),
    ("usb_type", "USB", "connectivity", "specs", None, None, "text"),
    ("os", "OS", "software", "specs", None, None, "text"),
    ("ui_layer", "UI layer", "software", "specs", None, None, "text"),
    ("guaranteed_updates", "Guaranteed updates", "software", "specs", "yrs", True, "years"),
    ("weight_grams", "Weight", "body", "specs", "g", False, "gram"),
    ("dimensions", "Dimensions", "body", "specs", None, None, "text"),
    ("build_material", "Materials", "body", "specs", None, None, "text"),
    ("ip_rating", "Water resistance", "body", "specs", None, None, "text"),
]

GROUP_LABELS = {
    "commercial": "Price & launch",
    "scores": "RMDU scores",
    "processor": "Processor",
    "memory": "Memory & storage",
    "display": "Display",
    "camera": "Camera",
    "battery": "Battery & charging",
    "connectivity": "Connectivity",
    "software": "Software",
    "body": "Design & build",
}


def _raw_value(definition, card: dict, scores: dict, specs: dict) -> Any:
    _, _, _, source, _, _, _ = definition
    key = definition[0]
    if source == "device":
        return card.get(key)
    if source == "scores":
        return scores.get(key)
    return specs.get(key)


def format_value(fmt: str, value: Any) -> str:
    if value is None or value == "" or value == []:
        return "—"
    if fmt == "money":
        return f"₹{float(value):,.0f}"
    if fmt == "score":
        return f"{float(value):.2f}/100"
    if fmt == "int":
        return f"{float(value):,.0f}"
    if fmt == "gb":
        return f"{float(value):g} GB"
    if fmt == "mp":
        return f"{float(value):g} MP"
    if fmt == "mah":
        return f"{float(value):,.0f} mAh"
    if fmt == "watt":
        return f"{float(value):g} W"
    if fmt == "hour":
        return f"{float(value):g} h"
    if fmt == "inch":
        return f'{float(value):g}"'
    if fmt == "hz":
        return f"{float(value):g} Hz"
    if fmt == "nits":
        return f"{float(value):,.0f} nits"
    if fmt == "gram":
        return f"{float(value):,.0f} g"
    if fmt == "years":
        return f"{float(value):g} yrs"
    if fmt == "bool":
        return "Yes" if value else "No"
    if fmt == "list":
        return ", ".join(value) if isinstance(value, list) else str(value)
    if fmt == "date":
        if isinstance(value, (date, datetime)):
            return value.isoformat()[:10]
        return str(value)[:10]
    return str(value)


def _numeric(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return as_float(value)


def build_rows(cards: List[dict]) -> List[dict]:
    rows: List[dict] = []
    for definition in ROW_DEFS:
        key, label, group, _, unit, higher_is_better, fmt = definition
        values: List[dict] = []
        numeric_pairs: List[Tuple[str, float]] = []

        for card in cards:
            raw = _raw_value(
                definition, card, card.get("scores") or {}, card.get("specs") or {}
            )
            present = raw is not None and raw != "" and raw != []
            numeric = _numeric(raw)
            if present and numeric is not None and higher_is_better is not None:
                numeric_pairs.append((card["id"], numeric))
            values.append(
                {
                    "device_id": card["id"],
                    "value": raw,
                    "display": format_value(fmt, raw),
                    "is_present": present,
                    "is_winner": False,
                }
            )

        winner_device_id: Optional[str] = None
        if len(numeric_pairs) >= 2 and len({value for _, value in numeric_pairs}) > 1:
            best = (
                max(numeric_pairs, key=lambda pair: pair[1])
                if higher_is_better
                else min(numeric_pairs, key=lambda pair: pair[1])
            )
            winner_device_id = best[0]
            for value in values:
                value["is_winner"] = value["device_id"] == winner_device_id

        rows.append(
            {
                "key": key,
                "label": label,
                "group": group,
                "unit": unit,
                "higher_is_better": higher_is_better,
                "winner_device_id": winner_device_id,
                "values": values,
            }
        )
    return rows


def build_scoreboard(cards: List[dict], weights: Dict[str, float]) -> List[dict]:
    board: List[dict] = []
    for card in cards:
        scores = card.get("scores") or {}
        weighted = round(
            sum(
                (as_float(scores.get(SCORE_COLUMN[key])) or 0.0) * weights.get(key, 0.0)
                for key in PRIORITY_KEYS
            ),
            2,
        )
        board.append(
            {
                "device_id": card["id"],
                "overall_score": as_float(scores.get("overall_score")),
                "weighted_score": weighted,
                "is_winner": False,
            }
        )
    if board:
        best = max(board, key=lambda item: item["weighted_score"])
        if len({item["weighted_score"] for item in board}) > 1:
            best["is_winner"] = True
            return board
    return board


def build_verdict(cards: List[dict], board: List[dict], priority: str) -> Tuple[Optional[str], str]:
    if not board:
        return None, "Not enough scored devices to produce a verdict."
    winner = next((item for item in board if item["is_winner"]), None)
    if not winner:
        return None, f"Too close to call for {priority}: the top devices tie on weighted score."
    winner_card = next(card for card in cards if card["id"] == winner["device_id"])
    runner_up = max(
        (item for item in board if item["device_id"] != winner["device_id"]),
        key=lambda item: item["weighted_score"],
        default=None,
    )
    margin = (
        round(winner["weighted_score"] - runner_up["weighted_score"], 2)
        if runner_up
        else None
    )
    verdict = (
        f"{winner_card['name']} edges ahead with a {winner['weighted_score']:.2f}/100 "
        f"weighted score for {priority}."
    )
    if margin is not None:
        verdict += f" Winning margin: {margin:.2f} points."
    return winner["device_id"], verdict


async def compare_devices(
    identifiers: List[str],
    *,
    priority: str = "all-rounder",
    user_id: Optional[str] = None,
    save_session: bool = True,
) -> dict:
    rules = await load_rules()
    weights, used_priorities = blended_weights(rules, priority, None)

    rows = await asyncio.gather(
        *(get_device_row(identifier, detail=False) for identifier in identifiers)
    )
    cards = [shape_device(row) for row in rows]

    table_rows = build_rows(cards)
    board = build_scoreboard(cards, weights)
    winner_device_id, verdict = build_verdict(cards, board, priority)

    session_id: Optional[str] = None
    if save_session:
        inserted = await db.insert(
            "comparison_sessions",
            {
                "user_id": user_id,
                "device_ids": [card["id"] for card in cards],
                "winner_device_id": winner_device_id,
            },
        )
        session_id = inserted[0]["id"] if inserted else None

    return {
        "session_id": session_id,
        "priority": used_priorities[0],
        "devices": cards,
        "rows": table_rows,
        "scoreboard": board,
        "winner_device_id": winner_device_id,
        "verdict": verdict,
        "generated_at": datetime.now(timezone.utc),
        "meta": {
            "weights": weights,
            "groups": GROUP_LABELS,
            "engine": "compare-v1",
        },
    }

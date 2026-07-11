import json
import os
from datetime import datetime, timezone
import uuid
import random
import string

try:
    import importlib.metadata

    PYYAML_VERSION = importlib.metadata.version("pyyaml")
except Exception:
    PYYAML_VERSION = None

EICAR = r"X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
DEFAULT_YAML_PAYLOAD = "!!python/object/apply:builtins.eval\nargs: ['\"exploited\"']"


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }


def _parse_body(raw: str) -> dict:
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {}


def _order_id() -> str:
    suffix = "".join(random.choices(string.digits, k=4))
    return f"ORD-{suffix}"


def handle_status() -> dict:
    return _response(
        200,
        {
            "service": "order-webhook",
            "status": "ok",
            "environment": os.getenv("ENVIRONMENT", "demo"),
            "azure_runtime": bool(os.getenv("WEBSITE_SITE_NAME")),
            "eicar_present": True,
            "eicar_length": len(EICAR),
            "pyyaml_version": PYYAML_VERSION,
            "vulnerable_packages": [
                {
                    "cve": "CVE-2020-14343",
                    "package": f"pyyaml {PYYAML_VERSION or 'unknown'}",
                    "service": "order-webhook",
                    "note": "Unsafe yaml.load() on fulfillmentManifest in POST /checkout and /demo/yaml",
                }
            ],
            "routes": [
                "POST /checkout (fulfillmentManifest YAML chain)",
                "GET /status",
                "GET /demo/eicar",
                "POST /demo/yaml",
            ],
            "api_gateway": {
                "public": True,
                "authenticated": False,
                "authorization_type": "NONE",
                "api_key_required": False,
                "cors_allow_origins": "*",
            },
        },
    )


def handle_checkout(body: dict) -> dict:
    from workshop_chain import poisoned_manifest, run_checkout_chain

    items = body.get("items") or []
    subtotal = body.get("subtotal", 0)
    order_id = _order_id()

    response_body = {
        "orderId": order_id,
        "status": "pending",
        "receivedAt": datetime.now(timezone.utc).isoformat(),
        "itemCount": sum(int(i.get("quantity", 1)) for i in items),
        "subtotal": subtotal,
        "message": "Order queued for fulfillment (demo webhook)",
        "fulfillment": {
            "handler": "order-webhook-function",
            "traceId": str(uuid.uuid4()),
        },
    }

    manifest = poisoned_manifest(body)
    if manifest:
        response_body["securityDemo"] = run_checkout_chain(manifest)
        response_body["fulfillment"]["manifestParsed"] = True

    return _response(200, response_body)


def handle_eicar() -> dict:
    return _response(
        200,
        {
            "demo": "eicar",
            "purpose": "malware_scanner_test",
            "warning": "Harmless EICAR test string — triggers AV/runtime malware detections",
            "payload": EICAR,
            "narrative": (
                "Function artifact contains EICAR. Scanners flag the deployment package; "
                "runtime tools may alert when this endpoint is invoked."
            ),
        },
    )


def handle_yaml(body: dict) -> dict:
    import yaml

    payload = body.get("payload") or DEFAULT_YAML_PAYLOAD

    try:
        result = yaml.load(payload, Loader=yaml.Loader)
        exploited = result == "exploited" or result is not None
    except Exception as exc:
        return _response(
            500,
            {
                "exploited": False,
                "cve": "CVE-2020-14343",
                "package": f"pyyaml {PYYAML_VERSION}",
                "error": str(exc),
                "narrative": "Unsafe yaml.load() on attacker-controlled input",
            },
        )

    return _response(
        200,
        {
            "exploited": exploited,
            "cve": "CVE-2020-14343",
            "package": f"pyyaml {PYYAML_VERSION}",
            "pattern": "unsafe_deserialization",
            "scope": "function-runtime",
            "result": str(result),
            "narrative": (
                "Serverless function deserializes untrusted YAML with yaml.load(). "
                "SCA finds PyYAML CVE; this proves runtime exploitability."
            ),
        },
    )


def dispatch(method: str, path: str, body: dict) -> dict:
    route = f"{method.upper()} {path}"
    routes = {
        "GET /status": handle_status,
        "POST /checkout": lambda: handle_checkout(body),
        "GET /demo/eicar": handle_eicar,
        "POST /demo/yaml": lambda: handle_yaml(body),
    }

    fn = routes.get(route)
    if fn is None:
        return _response(404, {"error": "not_found", "route": route})

    return fn()

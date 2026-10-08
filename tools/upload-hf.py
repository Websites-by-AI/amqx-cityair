#!/usr/bin/env python3
"""Mirror CityAir to Hugging Face (dataset + static Space + Gradio RAG Space).

The Hub now requires Xet-style uploads for binary files, so this uses
`huggingface_hub.upload_folder` instead of a plain `git push`.

    HF_TOKEN=hf_... python3 tools/upload-hf.py [API_BASE]
"""
import os
import sys
from pathlib import Path

from huggingface_hub import HfApi, create_repo

ROOT = Path(__file__).resolve().parent.parent
USER = "sosa123454321"
TOKEN = os.environ.get("HF_TOKEN") or sys.exit("HF_TOKEN is required")
API_BASE = sys.argv[1] if len(sys.argv) > 1 else ""

api = HfApi(token=TOKEN)


def sync(repo_id: str, repo_type: str, folder: Path, message: str, sdk: str | None = None) -> None:
    create_repo(
        repo_id,
        repo_type=repo_type,
        private=False,
        exist_ok=True,
        token=TOKEN,
        **({"space_sdk": sdk} if sdk else {}),
    )
    api.upload_folder(
        repo_id=repo_id,
        repo_type=repo_type,
        folder_path=str(folder),
        commit_message=message,
        token=TOKEN,
    )
    print(f"   ✓ https://huggingface.co/{'datasets/' if repo_type == 'dataset' else 'spaces/'}{repo_id}")


print("▶ 1/3 knowledge-base dataset")
sync(f"{USER}/amqx-cityair-kb", "dataset", ROOT / "hf" / "dataset", "CityAir knowledge base")

print("▶ 2/3 static Space mirror")
sync(f"{USER}/amqx-cityair", "space", ROOT / "hf" / "space-static", "CityAir static mirror", sdk="static")

if os.environ.get("SKIP_RAG_SPACE") == "1":
    print("▶ 3/3 Gradio RAG Space — skipped (SKIP_RAG_SPACE=1)")
else:
    print("▶ 3/3 Gradio RAG Space")
    try:
        sync(f"{USER}/amqx-cityair-rag", "space", ROOT / "hf" / "space-rag", "CityAir RAG Space", sdk="gradio")
    except Exception as exc:  # non-static Spaces need a free CPU quota or PRO
        print(f"   ⚠ skipped: {str(exc)[:220]}")
        print("   The Gradio app is ready in hf/space-rag/ and can be pushed after "
              "upgrading to PRO or freeing CPU quota.")

print(
    "\n✅ Hugging Face done.\n"
    f"   dataset : https://huggingface.co/datasets/{USER}/amqx-cityair-kb\n"
    f"   mirror  : https://huggingface.co/spaces/{USER}/amqx-cityair\n"
    f"   RAG app : https://huggingface.co/spaces/{USER}/amqx-cityair-rag\n"
    + (f"   mirror API base: {API_BASE}\n" if API_BASE else "   mirror API base: none (local retrieval mode)\n")
)

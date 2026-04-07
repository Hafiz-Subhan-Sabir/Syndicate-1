"""
Redis inverted index for membership articles (title, description, content, tags).
Falls back to database-only search when Redis is unavailable.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from typing import Any, Optional, Set

PREFIX = os.environ.get("MEMBERSHIP_REDIS_PREFIX", "syndicate:mem:v1:")
INDEX_VER_KEY = f"{PREFIX}index_ver"


def _client() -> Any:
    url = (os.environ.get("REDIS_URL") or "").strip()
    if not url:
        return None
    try:
        import redis  # type: ignore
    except ImportError:
        return None
    try:
        return redis.from_url(url, decode_responses=True, socket_connect_timeout=0.35)
    except Exception:
        return None


def get_redis():
    return _client()


def tokenize(text: str) -> Set[str]:
    return {t for t in re.findall(r"[a-z0-9]{2,}", (text or "").lower()) if len(t) >= 2}


def _article_blob(article) -> str:
    tag_part = " ".join(article.tags or []) if isinstance(article.tags, list) else ""
    parts = [article.title or "", article.description or "", article.content or "", tag_part]
    return " ".join(parts)


def index_article(article) -> None:
    r = get_redis()
    if not r:
        return
    aid = str(article.pk)
    toks_key = f"{PREFIX}art:{aid}:toks"
    old = r.smembers(toks_key)
    pipe = r.pipeline()
    for t in old:
        pipe.srem(f"{PREFIX}idx:{t}", aid)
    pipe.delete(toks_key)
    pipe.execute()

    toks = tokenize(_article_blob(article))
    if not toks:
        bump_search_cache_version(r)
        return
    pipe = r.pipeline()
    for t in toks:
        pipe.sadd(f"{PREFIX}idx:{t}", aid)
    for t in toks:
        pipe.sadd(toks_key, t)
    pipe.execute()
    bump_search_cache_version(r)


def deindex_article(article_id: int) -> None:
    r = get_redis()
    if not r:
        return
    aid = str(article_id)
    toks_key = f"{PREFIX}art:{aid}:toks"
    old = r.smembers(toks_key)
    pipe = r.pipeline()
    for t in old:
        pipe.srem(f"{PREFIX}idx:{t}", aid)
    pipe.delete(toks_key)
    pipe.execute()
    bump_search_cache_version(r)


def bump_search_cache_version(r=None) -> None:
    client = r or get_redis()
    if not client:
        return
    try:
        client.incr(INDEX_VER_KEY)
    except Exception:
        pass


def search_article_ids(query: str) -> Optional[Set[int]]:
    """
    Returns:
        None — Redis unavailable (use DB).
        set() — Redis ok but no searchable tokens in query (caller: DB only or no text filter).
        non-empty set — candidate article ids from inverted index (union of tokens).
    """
    r = get_redis()
    if not r:
        return None
    raw = (query or "").strip()
    if not raw:
        return set()
    toks = tokenize(raw)
    if not toks:
        return None
    keys = [f"{PREFIX}idx:{t}" for t in sorted(toks)]
    tmp = f"{PREFIX}_u:{hashlib.sha1('|'.join(keys).encode()).hexdigest()[:24]}"
    try:
        r.sunionstore(tmp, keys)
        members = r.smembers(tmp)
        r.delete(tmp)
        return {int(x) for x in members}
    except Exception:
        return None


def cache_get_merged_ids(cache_params: str) -> Optional[list]:
    r = get_redis()
    if not r:
        return None
    try:
        ver = r.get(INDEX_VER_KEY) or "0"
        h = hashlib.sha256(f"{ver}:{cache_params}".encode()).hexdigest()[:40]
        key = f"{PREFIX}srch:{h}"
        raw = r.get(key)
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def cache_set_merged_ids(cache_params: str, ids: list, ttl: int = 90) -> None:
    r = get_redis()
    if not r:
        return
    try:
        ver = r.get(INDEX_VER_KEY) or "0"
        h = hashlib.sha256(f"{ver}:{cache_params}".encode()).hexdigest()[:40]
        key = f"{PREFIX}srch:{h}"
        r.setex(key, ttl, json.dumps(ids))
    except Exception:
        pass

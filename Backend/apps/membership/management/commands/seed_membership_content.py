import os
from datetime import datetime, timezone as dt_timezone
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.membership.models import Article, Video


def _dt(y, m, d, hour=12):
    return datetime(y, m, d, hour, 0, 0, tzinfo=dt_timezone.utc)


def _extract_pdf_text(path: Path, max_chars: int = 80_000) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        parts: list[str] = []
        for page in reader.pages[:120]:
            t = page.extract_text()
            if t:
                parts.append(t)
        blob = "\n".join(parts)
        return blob[:max_chars]
    except Exception:
        return ""


def _resolve_pdf_file(names: tuple[str, ...]) -> Path | None:
    """First existing path: data/membership_pdfs/, MEMBERSHIP_SEED_PDF_DIR, then ~/Downloads."""
    dirs: list[Path] = [Path(settings.SYNDICATE_DATA_DIR) / "membership_pdfs"]
    extra = (os.environ.get("MEMBERSHIP_SEED_PDF_DIR") or "").strip()
    if extra:
        dirs.append(Path(extra))
    dirs.append(Path.home() / "Downloads")
    for d in dirs:
        for name in names:
            p = d / name
            if p.is_file():
                return p
    return None


# Canonical press URLs — upserted by source_url so re-running refreshes copy and search fields.
# pdf_files: try each filename in order (short names in data/membership_pdfs/ or your Downloads).
ARTICLES = [
    {
        "title": "How The Syndicate Uses Mastery and Empowerment to Redefine Business",
        "slug": slugify("How The Syndicate Uses Mastery and Empowerment to Redefine Business"),
        "description": (
            "Forbes Georgia (partner content): how The Syndicate reframes self-improvement and business "
            "education with practical strategies, the Money Mastery Course, and the 7 Levels of Power framework."
        ),
        "content": (
            "Paid placement Forbes Georgia February 2025. The Syndicate offers practical strategies for real-world "
            "success versus traditional business education. Exclusive network for mastery over money, power, and "
            "influence. Philosophy: escape cycles of debt and consumption; honor, loyalty, trustworthiness. "
            "Money Mastery Course: actionable strategies and character for greatness. E-learning market context. "
            "Leadership: Guss Qureshi. Mastery without corruption; ethical leadership; digital delivery."
        ),
        "source_url": "https://forbes.ge/en/how-the-syndicate-uses-mastery-and-empowerment-to-redefine-business/",
        "thumbnail": "",
        "published_at": _dt(2025, 2, 3, 15),
        "tags": [
            "forbes",
            "forbes-georgia",
            "business",
            "mastery",
            "empowerment",
            "syndicate",
            "money-mastery",
            "partner-content",
        ],
        "is_featured": True,
        "pdf_files": (
            "forbes-georgia-mastery-empowerment.pdf",
            "How The Syndicate Uses Mastery and Empowerment to Redefine Business • Forbes Georgia.pdf",
        ),
    },
    {
        "title": (
            "How The Syndicate empowers individuals to master power, money, and influence "
            "in the Money Mastery Course"
        ),
        "slug": slugify(
            "How The Syndicate empowers individuals to master power money and influence "
            "in the Money Mastery Course"
        ),
        "description": (
            "Luxury Lifestyle Magazine: Money Mastery Course — financial literacy, power dynamics, influence, "
            "video modules, and the 7 Levels of Power; founded by Guss Qureshi."
        ),
        "content": (
            "Luxury Lifestyle Magazine promotion February 2025. Elite organisation for mastery over money, power, "
            "and influence. Challenges traditional MBA-style theory; practical techniques and real-world application. "
            "Money Mastery Course curriculum: negotiation, decision-making, 7 Levels of Power framework. "
            "Mission: financial dependency, influence, moral leadership. Ethical use of money and power. "
            "George Mellis byline. Tags: Guss Qureshi, Money Mastery Course, The Syndicate."
        ),
        "source_url": (
            "https://www.luxurylifestylemag.co.uk/money/"
            "how-the-syndicate-empowers-individuals-to-master-power-money-and-influence-in-the-money-mastery-course/"
        ),
        "thumbnail": "",
        "published_at": _dt(2025, 2, 14, 12),
        "tags": [
            "luxury-lifestyle",
            "llm",
            "money",
            "influence",
            "power",
            "education",
            "money-mastery-course",
            "guss-qureshi",
            "syndicate",
        ],
        "is_featured": False,
        "pdf_files": (
            "luxury-lifestyle-money-mastery.pdf",
            "How The Syndicate empowers individuals to master power, money, and influence in the Money Mastery Course _ Luxury Lifestyle Magazine.pdf",
        ),
    },
    {
        "title": (
            "How The Syndicate Can Disrupt the Traditional Model of Influence and Education in the Digital Age"
        ),
        "slug": slugify(
            "How The Syndicate Can Disrupt the Traditional Model of Influence and Education in the Digital Age"
        ),
        "description": (
            "GQ South Africa (partnered content): digital-first education, 7 Levels of Power, Money Mastery, "
            "alliances, and Guss Qureshi’s vision for influence beyond traditional models."
        ),
        "content": (
            "GQ South Africa wealth section partnered content. Virtual classroom Mastering Money movement. "
            "Exclusive network: money, power, influence; practical strategies and ancient knowledge. "
            "7 Levels of Power; Money Mastery program; advanced vetting. Versus theory-heavy business schools. "
            "Ethical leadership and collective alliances; honor, loyalty, trustworthiness. Sean White byline. "
            "Disruption of influence and education in the digital age."
        ),
        "source_url": (
            "https://gq.co.za/wealth/2025-02-10-how-the-syndicate-can-disrupt-the-traditional-model-of-"
            "influence-and-education-in-the-digital-age/"
        ),
        "thumbnail": "",
        "published_at": _dt(2025, 2, 10, 12),
        "tags": [
            "gq",
            "gq-south-africa",
            "wealth",
            "influence",
            "education",
            "digital",
            "disruption",
            "money-mastery",
            "guss-qureshi",
            "syndicate",
        ],
        "is_featured": False,
        "pdf_files": (
            "gq-disrupt-influence-education-digital-age.pdf",
            "How The Syndicate Can Disrupt the Traditional Model of Influence and Education in the Digital Age.pdf",
        ),
    },
]

VIDEOS = [
    {
        "title": "Operator briefing — welcome to the hub",
        "description": "Orientation clip for the membership intelligence hub (replace URL with your production asset).",
        "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        "duration": "3:33",
    }
]


class Command(BaseCommand):
    help = (
        "Upsert membership articles (press URLs) + optional PDFs in data/membership_pdfs/ or ~/Downloads; "
        "appends PDF text to searchable content; optional demo video."
    )

    def handle(self, *args, **options):
        created_a = 0
        updated_a = 0
        pdf_attached = 0
        pdf_missing = 0

        for row in ARTICLES:
            _slug = row["slug"]
            pdf_path = _resolve_pdf_file(tuple(row.get("pdf_files", ())))
            extract = _extract_pdf_text(pdf_path) if pdf_path else ""
            base_content = row["content"]
            if extract.strip():
                final_content = f"{base_content}\n\n--- PDF extract (search index) ---\n{extract}"
            else:
                final_content = base_content

            defaults = {
                "title": row["title"],
                "slug": _slug,
                "description": row["description"],
                "content": final_content,
                "thumbnail": row.get("thumbnail", ""),
                "published_at": row["published_at"],
                "tags": row["tags"],
                "is_featured": row["is_featured"],
            }
            obj, created = Article.objects.update_or_create(
                source_url=row["source_url"],
                defaults=defaults,
            )
            if created:
                created_a += 1
            else:
                updated_a += 1
                if obj.slug != _slug:
                    if not Article.objects.filter(slug=_slug).exclude(pk=obj.pk).exists():
                        obj.slug = _slug
                        obj.save(update_fields=["slug"])

            if pdf_path:
                with pdf_path.open("rb") as fh:
                    obj.pdf_file.save(pdf_path.name, File(fh), save=True)
                pdf_attached += 1
                self.stdout.write(self.style.NOTICE(f"  PDF attached: {pdf_path.name}"))
            else:
                pdf_missing += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  No PDF on disk for article (place files in {Path(settings.SYNDICATE_DATA_DIR) / 'membership_pdfs'} "
                        f"or Downloads): {row['title'][:56]}…"
                    )
                )

        created_v = 0
        for row in VIDEOS:
            exists = Video.objects.filter(video_url=row["video_url"]).exists()
            if exists:
                continue
            Video.objects.create(**row)
            created_v += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Membership seed done. Articles created: {created_a}, updated: {updated_a}. "
                f"PDFs attached this run: {pdf_attached}; missing files: {pdf_missing}. "
                f"Videos created: {created_v}. Totals — articles: {Article.objects.count()}, "
                f"videos: {Video.objects.count()}."
            )
        )

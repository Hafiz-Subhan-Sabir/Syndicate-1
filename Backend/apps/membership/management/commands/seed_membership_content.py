from datetime import datetime, timezone as dt_timezone

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.membership.models import Article, Video


def _dt(y, m, d, hour=12):
    return datetime(y, m, d, hour, 0, 0, tzinfo=dt_timezone.utc)


# Canonical press URLs — upserted by source_url so re-running refreshes copy and search fields.
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
    help = "Upsert membership articles (press URLs) + optional demo video; refreshes search fields on re-run."

    def handle(self, *args, **options):
        created_a = 0
        updated_a = 0
        for row in ARTICLES:
            _slug = row["slug"]
            defaults = {
                "title": row["title"],
                "slug": _slug,
                "description": row["description"],
                "content": row.get("content", ""),
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
                # If an old row used a different slug, enforce canonical slug from seed.
                if obj.slug != _slug:
                    if not Article.objects.filter(slug=_slug).exclude(pk=obj.pk).exists():
                        obj.slug = _slug
                        obj.save(update_fields=["slug"])

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
                f"Videos created: {created_v}. Totals — articles: {Article.objects.count()}, "
                f"videos: {Video.objects.count()}."
            )
        )

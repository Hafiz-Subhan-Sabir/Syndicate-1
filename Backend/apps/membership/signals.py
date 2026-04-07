from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.membership.models import Article
from apps.membership.redis_index import deindex_article, index_article


@receiver(post_save, sender=Article)
def article_saved(sender, instance, **kwargs):
    index_article(instance)


@receiver(post_delete, sender=Article)
def article_deleted(sender, instance, **kwargs):
    deindex_article(instance.pk)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("membership", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="pdf_file",
            field=models.FileField(
                blank=True,
                help_text="Optional stored PDF for members (search uses title/description/content; seed can append PDF text extract).",
                null=True,
                upload_to="membership/pdfs/",
            ),
        ),
        migrations.AlterField(
            model_name="article",
            name="source_url",
            field=models.URLField(blank=True, max_length=2048),
        ),
    ]

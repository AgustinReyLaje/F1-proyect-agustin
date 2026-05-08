"""
Management command: fetch_car_images
=====================================

Populates ``ConstructorSeason.car_image_url`` by fetching the lead image from
the corresponding Wikipedia article for each car chassis.

Usage
-----
    # All seasons, skip already-filled rows
    python manage.py fetch_car_images

    # Single season
    python manage.py fetch_car_images --season 2024

    # Force overwrite existing URLs
    python manage.py fetch_car_images --season 2024 --overwrite

    # Preview without writing
    python manage.py fetch_car_images --dry-run

Each constructor/season pair is resolved as follows:
  1. Look up the Wikipedia article title in WIKI_TITLES below.
  2. If missing, fall back to "<constructor_name> <car_model>" as the title.
  3. Call the Wikipedia REST API; store the lead image URL.
"""

from django.core.management.base import BaseCommand

from core.models import ConstructorSeason
from core.services.wikipedia_service import fetch_car_image_url

# ---------------------------------------------------------------------------
# Mapping of constructor_id → { year: Wikipedia article title }
# ---------------------------------------------------------------------------
# Titles are the exact English Wikipedia article title for that car.
# Missing entries fall back to "<constructor_name> <car_model>".
# ---------------------------------------------------------------------------
WIKI_TITLES: dict[str, dict[int, str]] = {
    # ── Ferrari ──────────────────────────────────────────────────────────────
    "ferrari": {
        2026: "Ferrari SF-26",
        2025: "Ferrari SF-25",
        2024: "Ferrari SF-24",
        2023: "Ferrari SF-23",
        2022: "Ferrari F1-75",
        2021: "Ferrari SF21",
        2020: "Ferrari SF1000",
        2019: "Ferrari SF90",
        2018: "Ferrari SF71H",
        2017: "Ferrari SF70H",
        2016: "Ferrari SF16-H",
        2015: "Ferrari SF15-T",
        2014: "Ferrari F14 T",
        2013: "Ferrari F138",
        2012: "Ferrari F2012",
        2011: "Ferrari 150° Italia",
        2010: "Ferrari F10",
        2009: "Ferrari F60",
        2008: "Ferrari F2008",
        2007: "Ferrari F2007",
        2006: "Ferrari 248 F1",
        2005: "Ferrari F2005",
        2004: "Ferrari F2004",
        2003: "Ferrari F2003-GA",
        2002: "Ferrari F2002",
        2001: "Ferrari F2001",
        2000: "Ferrari F1-2000",
    },
    # ── Red Bull ─────────────────────────────────────────────────────────────
    "red_bull": {
        2026: "Red Bull Racing RB22",
        2025: "Red Bull Racing RB21",
        2024: "Red Bull Racing RB20",
        2023: "Red Bull Racing RB19",
        2022: "Red Bull Racing RB18",
        2021: "Red Bull Racing RB16B",
        2020: "Red Bull Racing RB16",
        2019: "Red Bull Racing RB15",
        2018: "Red Bull RB14",
        2017: "Red Bull Racing RB13",
        2016: "Red Bull RB12",
        2015: "Red Bull RB11",
        2014: "Red Bull RB10",
        2013: "Red Bull RB9",
        2012: "Red Bull RB8",
        2011: "Red Bull RB7",
        2010: "Red Bull RB6",
        2009: "Red Bull RB5",
        2008: "Red Bull RB4",
        2007: "Red Bull RB3",
        2006: "Red Bull RB2",
        2005: "Red Bull RB1",
    },
    # ── Mercedes ─────────────────────────────────────────────────────────────
    "mercedes": {
        2026: "Mercedes-AMG F1 W17 E Performance",
        2025: "Mercedes-AMG F1 W16 E Performance",
        2024: "Mercedes-AMG F1 W15 E Performance",
        2023: "Mercedes-AMG F1 W14 E Performance",
        2022: "Mercedes-AMG F1 W13 E Performance",
        2021: "Mercedes-AMG F1 W12 E Performance",
        2020: "Mercedes-AMG F1 W11 EQ Performance",
        2019: "Mercedes-AMG F1 W10 EQ Power+",
        2018: "Mercedes AMG F1 W09 EQ Power+",
        2017: "Mercedes AMG F1 W08 EQ Power+",
        2016: "Mercedes AMG F1 W07 Hybrid",
        2015: "Mercedes AMG F1 W06 Hybrid",
        2014: "Mercedes AMG F1 W05 Hybrid",
        2013: "Mercedes AMG F1 W04",
        2012: "Mercedes AMG F1 W03",
        2011: "Mercedes AMG F1 W02",
        2010: "Mercedes GP MGP W01",
    },
    # ── McLaren ──────────────────────────────────────────────────────────────
    "mclaren": {
        2026: "McLaren MCL40",
        2025: "McLaren MCL39",
        2024: "McLaren MCL38",
        2023: "McLaren MCL60",
        2022: "McLaren MCL36",
        2021: "McLaren MCL35M",
        2020: "McLaren MCL35",
        2019: "McLaren MCL34",
        2018: "McLaren MCL33",
        2017: "McLaren MCL32",
        2016: "McLaren MP4-31",
        2015: "McLaren MP4-30",
        2014: "McLaren MP4-29",
        2013: "McLaren MP4-28",
        2012: "McLaren MP4-27",
        2011: "McLaren MP4-26",
        2010: "McLaren MP4-25",
        2009: "McLaren MP4-24",
        2008: "McLaren MP4-23",
        2007: "McLaren MP4-22",
        2006: "McLaren MP4-21",
        2005: "McLaren MP4-20",
        2004: "McLaren MP4-19",
        2003: "McLaren MP4-17D",
        2002: "McLaren MP4-17",
        2001: "McLaren MP4-16",
        2000: "McLaren MP4/15",
    },
    # ── Williams ─────────────────────────────────────────────────────────────
    "williams": {
        2026: "Williams FW48",
        2025: "Williams FW47",
        2024: "Williams FW46",
        2023: "Williams FW45",
        2022: "Williams FW44",
        2021: "Williams FW43B",
        2020: "Williams FW43",
        2019: "Williams FW42",
        2018: "Williams FW41",
        2017: "Williams FW40",
        2016: "Williams FW38",
        2015: "Williams FW37",
        2014: "Williams FW36",
        2013: "Williams FW35",
        2012: "Williams FW34",
        2011: "Williams FW33",
        2010: "Williams FW32",
        2009: "Williams FW31",
        2008: "Williams FW30",
        2007: "Williams FW29",
        2006: "Williams FW28",
        2005: "Williams FW27",
        2004: "Williams FW26",
        2003: "Williams FW25",
        2002: "Williams FW24",
        2001: "Williams FW23",
        2000: "Williams FW22",
    },
    # ── Aston Martin ─────────────────────────────────────────────────────────
    "aston_martin": {
        2026: "Aston Martin AMR26",
        2025: "Aston Martin AMR25",
        2024: "Aston Martin AMR24",
        2023: "Aston Martin AMR23",
        2022: "Aston Martin AMR22",
        2021: "Aston Martin AMR21",
    },
    # ── Alpine ───────────────────────────────────────────────────────────────
    "alpine": {
        2026: "Alpine A526",
        2025: "Alpine A525",
        2024: "Alpine A524",
        2023: "Alpine A523",
        2022: "Alpine A522",
        2021: "Alpine A521",
    },
    # ── Haas ─────────────────────────────────────────────────────────────────
    "haas": {
        2026: "Haas VF-26",
        2025: "Haas VF-25",
        2024: "Haas VF-24",
        2023: "Haas VF-23",
        2022: "Haas VF-22",
        2021: "Haas VF-21",
        2020: "Haas VF-20",
        2019: "Haas VF-19",
        2018: "Haas VF-18",
        2017: "Haas VF-17",
        2016: "Haas VF-16",
    },
    # ── RB / Racing Bulls / AlphaTauri ───────────────────────────────────────
    "racing_bulls": {
        2026: "Racing Bulls VCARB 03",
    },
    "rb": {
        2026: "Racing Bulls VCARB 03",
        2025: "Racing Bulls VCARB 02",
        2024: "RB VCARB 01",
    },
    "alphatauri": {
        2023: "AlphaTauri AT04",
        2022: "AlphaTauri AT03",
        2021: "AlphaTauri AT02",
        2020: "AlphaTauri AT01",
    },
    "toro_rosso": {
        2019: "Toro Rosso STR14",
        2018: "Toro Rosso STR13",
        2017: "Toro Rosso STR12",
        2016: "Scuderia Toro Rosso STR11",
        2015: "Scuderia Toro Rosso STR10",
        2014: "Scuderia Toro Rosso STR9",
        2013: "Scuderia Toro Rosso STR8",
        2012: "Scuderia Toro Rosso STR7",
        2011: "Scuderia Toro Rosso STR6",
        2010: "Scuderia Toro Rosso STR5",
        2009: "Scuderia Toro Rosso STR4",
        2008: "Scuderia Toro Rosso STR3",
        2007: "Scuderia Toro Rosso STR2",
        2006: "Scuderia Toro Rosso STR1",
    },
    # ── Sauber / Alfa Romeo / Stake ──────────────────────────────────────────
    "sauber": {
        2025: "Sauber C45",
        2023: "Alfa Romeo C43",
        2022: "Alfa Romeo C42",
        2019: "Alfa Romeo C38",
        2018: "Alfa Romeo Sauber C37",
        2017: "Sauber C36",
        2016: "Sauber C35",
        2015: "Sauber C34",
        2014: "Sauber C33",
        2013: "Sauber C32",
        2012: "Sauber C31",
        2011: "Sauber C30",
        2010: "Sauber C29",
        2009: "BMW Sauber C28",
        2008: "BMW Sauber F1.08",
        2007: "BMW Sauber F1.07",
        2006: "BMW Sauber F1.06",
        2005: "Sauber C24",
        2004: "Sauber C23",
        2003: "Sauber C22",
        2002: "Sauber C21",
        2001: "Sauber C20",
        2000: "Sauber C19",
    },
    "stake": {
        2024: "Kick Sauber C44",
    },
    "alfa": {
        2023: "Alfa Romeo C43",
        2022: "Alfa Romeo C42",
        2021: "Alfa Romeo C41",
        2020: "Alfa Romeo C39",
        2019: "Alfa Romeo C38",
    },
    # ── Audi ─────────────────────────────────────────────────────────────────
    "audi": {
        2026: "Audi A26 (Formula One car)",
    },
    # ── Cadillac ─────────────────────────────────────────────────────────────
    "cadillac": {
        2026: "Cadillac F1",
    },
    # ── Renault ──────────────────────────────────────────────────────────────
    "renault": {
        2020: "Renault R.S.20",
        2019: "Renault R.S.19",
        2018: "Renault R.S.18",
        2017: "Renault R.S.17",
        2016: "Renault R.S.16",
        2009: "Renault R29",
        2008: "Renault R28",
        2007: "Renault R27",
        2006: "Renault R26",
        2005: "Renault R25",
        2004: "Renault R24",
        2003: "Renault R23",
        2002: "Renault R202",
        2001: "Renault R201",
        2000: "Renault R20 (racing car)",
    },
    # ── Racing Point / Force India ────────────────────────────────────────────
    "racing_point": {
        2020: "Racing Point RP20",
        2019: "Racing Point RP19",
    },
    "force_india": {
        2018: "Force India VJM11",
        2017: "Force India VJM10",
        2016: "Force India VJM09",
        2015: "Force India VJM08",
        2014: "Force India VJM07",
        2013: "Force India VJM06",
        2012: "Force India VJM05",
        2011: "Force India VJM04",
        2010: "Force India VJM03",
        2009: "Force India VJM02",
        2008: "Force India VJM01",
    },
    # ── Brawn GP ─────────────────────────────────────────────────────────────
    "brawn": {
        2009: "Brawn BGP 001",
    },
    # ── Toyota ───────────────────────────────────────────────────────────────
    "toyota": {
        2009: "Toyota TF109",
        2008: "Toyota TF108",
        2007: "Toyota TF107",
        2006: "Toyota TF106",
        2005: "Toyota TF105",
        2004: "Toyota TF104",
        2003: "Toyota TF103",
        2002: "Toyota TF102",
    },
    # ── BMW Sauber ───────────────────────────────────────────────────────────
    "bmw_sauber": {
        2009: "BMW Sauber C28",
        2008: "BMW Sauber F1.08",
        2007: "BMW Sauber F1.07",
        2006: "BMW Sauber F1.06",
    },
    # ── Honda ────────────────────────────────────────────────────────────────
    "honda": {
        2008: "Honda RA108",
        2007: "Honda RA107",
        2006: "Honda RA106",
    },
    # ── Jordan ───────────────────────────────────────────────────────────────
    "jordan": {
        2005: "Jordan EJ15",
        2004: "Jordan EJ14",
        2003: "Jordan EJ13",
        2002: "Jordan EJ12",
        2001: "Jordan EJ11",
        2000: "Jordan EJ10",
    },
    # ── BAR ──────────────────────────────────────────────────────────────────
    "bar": {
        2005: "BAR 007",
        2004: "BAR 006",
        2003: "BAR 005",
        2002: "BAR 004",
        2001: "BAR 003",
        2000: "BAR 002",
    },
    # ── Jaguar ───────────────────────────────────────────────────────────────
    "jaguar": {
        2004: "Jaguar R5",
        2003: "Jaguar R4",
        2002: "Jaguar R3",
        2001: "Jaguar R2",
        2000: "Jaguar R1",
    },
    # ── Minardi ──────────────────────────────────────────────────────────────
    "minardi": {
        2005: "Minardi PS05",
        2004: "Minardi PS04B",
        2003: "Minardi PS03",
        2002: "Minardi PS02",
        2001: "Minardi PS01",
        2000: "Minardi M02",
    },
    # ── Benetton ─────────────────────────────────────────────────────────────
    "benetton": {
        2001: "Benetton B201",
        2000: "Benetton B200",
    },
    # ── Arrows ───────────────────────────────────────────────────────────────
    "arrows": {
        2002: "Arrows A23",
        2001: "Arrows A22",
        2000: "Arrows A21",
    },
    # ── Prost ────────────────────────────────────────────────────────────────
    "prost": {
        2001: "Prost AP04",
        2000: "Prost AP03",
    },
    # ── Lotus F1 ─────────────────────────────────────────────────────────────
    "lotus_f1": {
        2015: "Lotus E23 Hybrid",
        2014: "Lotus E22",
        2013: "Lotus E21",
        2012: "Lotus E20",
    },
    # ── Caterham ─────────────────────────────────────────────────────────────
    "caterham": {
        2014: "Caterham CT05",
        2013: "Caterham CT03",
        2012: "Caterham CT01",
    },
    # ── HRT ──────────────────────────────────────────────────────────────────
    "hrt": {
        2012: "HRT F112",
        2011: "HRT F111",
        2010: "HRT F110",
    },
    # ── Marussia / Virgin ────────────────────────────────────────────────────
    "marussia": {
        2015: "Marussia MR03",
        2014: "Marussia MR03",
        2013: "Marussia MR02",
        2012: "Marussia MR01",
        2011: "Virgin MVR-02",
        2010: "Virgin VR-01",
    },
    "virgin": {
        2011: "Virgin MVR-02",
        2010: "Virgin VR-01",
    },
    # ── Manor ────────────────────────────────────────────────────────────────
    "manor": {
        2016: "Manor MRT05",
    },
    # ── Super Aguri ──────────────────────────────────────────────────────────
    "super_aguri": {
        2008: "Super Aguri SA08",
        2007: "Super Aguri SA07",
        2006: "Super Aguri SA06",
    },
    # ── Spyker ───────────────────────────────────────────────────────────────
    "spyker": {
        2007: "Spyker F8-VII",
    },
    # ── Midland ──────────────────────────────────────────────────────────────
    "midland": {
        2006: "MF1 Racing M16",
    },
}


class Command(BaseCommand):
    help = "Fetch season-specific car images from Wikipedia and store in ConstructorSeason.car_image_url"

    def add_arguments(self, parser):
        parser.add_argument(
            "--season",
            type=int,
            metavar="YEAR",
            help="Only process this season (e.g. 2024)",
        )
        parser.add_argument(
            "--constructor",
            metavar="ID",
            help="Only process this constructor_id (e.g. ferrari)",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Replace existing car_image_url values",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be fetched without writing to the database",
        )

    def handle(self, *args, **options):
        qs = ConstructorSeason.objects.select_related("constructor", "season").order_by(
            "season__year", "constructor__name"
        )
        if options["season"]:
            qs = qs.filter(season__year=options["season"])
        if options["constructor"]:
            qs = qs.filter(constructor__constructor_id=options["constructor"])

        updated = skipped = failed = no_title = 0

        for cs in qs:
            constructor_id = cs.constructor.constructor_id
            year = cs.season.year
            label = f"{cs.constructor.name} {year}"

            if cs.car_image_url and not options["overwrite"]:
                self.stdout.write(f"  skip  {label} (already has image)")
                skipped += 1
                continue

            # Resolve Wikipedia article title
            title = WIKI_TITLES.get(constructor_id, {}).get(year)
            if not title:
                car_model = cs.car_model or cs.constructor.car_model
                if car_model:
                    title = f"{cs.constructor.name} {car_model}"
                else:
                    self.stdout.write(
                        self.style.WARNING(f"  ?     {label}: no Wikipedia title configured, skipping")
                    )
                    no_title += 1
                    continue

            if options["dry_run"]:
                self.stdout.write(f"  dry   {label} → '{title}'")
                continue

            self.stdout.write(f"  fetch {label} → '{title}' … ", ending="")
            self.stdout.flush()

            image_url = fetch_car_image_url(title)
            if image_url:
                cs.car_image_url = image_url
                cs.save(update_fields=["car_image_url"])
                self.stdout.write(self.style.SUCCESS("✓"))
                updated += 1
            else:
                self.stdout.write(self.style.WARNING("✗ no image found"))
                failed += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done — updated: {updated}  skipped: {skipped}  "
                f"no title: {no_title}  no image: {failed}"
            )
        )

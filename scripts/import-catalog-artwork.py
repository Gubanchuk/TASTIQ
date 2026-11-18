"""Build artwork for missing screen cards from the local TMDB movie and TV snapshots."""

import csv
import io
import json
import re
import subprocess
import unicodedata
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
POSTER = re.compile(r"/[A-Za-z0-9]{16,40}\.(?:jpg|png|webp)")


def title_key(title, year):
    title = " ".join(unicodedata.normalize("NFKC", title or "").casefold().split())
    return (title, year) if title and year else None


def title_keys(titles, year):
    return {key for title in titles if (key := title_key(title, year))}


def catalog_cards():
    # Read the same canonical titles and formats as the running application.
    source = """
        import {loadCatalogs} from './src/core/catalog.js';
        const {film,series,cartoon,anime}=loadCatalogs({screenArtworkPath:null});
        const rows=[film,series,cartoon,anime].flatMap(catalog=>catalog.items.map(
          ({id,domain,kind,year,runtime,name,original,ru,poster,image})=>
            ({id,domain,kind,year,runtime,names:[name,original,ru],missing:!poster&&!image})
        ));
        process.stdout.write(JSON.stringify(rows));
    """
    return json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", source], cwd=ROOT,
    ))


def index_movies(cards):
    exact = defaultdict(set)
    different_date = defaultdict(set)
    by_title = defaultdict(set)
    targets = defaultdict(list)
    title_candidates = defaultdict(dict)
    for card in cards:
        if card["kind"] == "film":
            for key in title_keys(card["names"], card["year"]):
                title_candidates[key][card["id"]] = card
        if card["kind"] == "film" and card["missing"]:
            targets[card["id"]].append(card)
    linked_ids = defaultdict(set)
    links = DATA / "raw/movielens/ml-latest/links.csv"
    if links.is_file():
        with links.open(encoding="utf-8-sig", newline="") as file:
            for row in csv.DictReader(file):
                if row["imdbId"].isdecimal() and row["tmdbId"].isdecimal():
                    linked_ids[row["tmdbId"]].add("tt" + row["imdbId"].zfill(7))
    with zipfile.ZipFile(DATA / "raw/tmdb-movies-poster-source-latest.zip") as archive:
        with archive.open("TMDB_movie_dataset_v11.csv") as raw:
            with io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as file:
                for row in csv.DictReader(file):
                    imdb, tmdb, year = row["imdb_id"], row["id"], row["release_date"][:4]
                    if not tmdb.isdecimal() or not year.isdecimal():
                        continue
                    year = int(year)
                    other_ids = linked_ids.get(tmdb, set())
                    if not imdb and len(other_ids) == 1:
                        imdb = next(iter(other_ids))
                    for card in targets.get(imdb, []):
                        card_year = card["year"]
                        key = (imdb, card_year)
                        path = image_path(row)
                        if year == card_year:
                            exact[key].add((int(tmdb), path))
                        elif card_year:
                            names = title_keys([row["title"], row["original_title"]], year)
                            same_title = bool(names & title_keys(card["names"], year))
                            same_runtime = (
                                card["runtime"] and row["runtime"].isdecimal()
                                and abs(card["runtime"] - int(row["runtime"])) <= 10
                            )
                            # An exact IMDb ID can identify the same work under a later release date.
                            if same_title and (abs(year - card_year) == 1 or (row["imdb_id"] and same_runtime)):
                                different_date[key].add((int(tmdb), path))
                    if imdb or other_ids or not row["runtime"].isdecimal():
                        continue
                    for key in title_keys([row["title"], row["original_title"]], year):
                        candidates = title_candidates.get(key, {})
                        if len(candidates) != 1:
                            continue
                        card = next(iter(candidates.values()))
                        runtime = card["runtime"]
                        if card["missing"] and runtime and abs(runtime - int(row["runtime"])) <= 4:
                            by_title[(card["id"], year)].add((int(tmdb), image_path(row)))
    return {**by_title, **different_date, **exact}


def image_path(row):
    return next((row[field] for field in ("poster_path", "backdrop_path")
                 if POSTER.fullmatch(row[field])), None)


def index_series(cards):
    catalog_ids = defaultdict(set)
    for card in cards:
        if card["kind"] == "series":
            for key in title_keys(card["names"], card["year"]):
                catalog_ids[key].add(card["id"])
    matches = defaultdict(set)
    with zipfile.ZipFile(DATA / "raw/tmdb-tv-poster-source.zip") as archive:
        with archive.open("TMDB_tv_dataset_v3.csv") as raw:
            with io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as file:
                for row in csv.DictReader(file):
                    year = row["first_air_date"][:4]
                    tmdb = row["id"]
                    if not year.isdecimal() or not tmdb.isdecimal():
                        continue
                    keys = title_keys([row["name"], row["original_name"]], int(year))
                    path = image_path(row)
                    for key in keys & catalog_ids.keys():
                        matches[key].add((int(tmdb), path))
    return catalog_ids, matches


def main():
    cards = catalog_cards()
    movies = index_movies(cards)
    catalog_ids, series = index_series(cards)
    candidates = defaultdict(set)
    matched_cards = []
    counts = defaultdict(int)
    for card in cards:
        if not card["missing"]:
            continue
        imdb = card["id"]
        if card["kind"] == "film":
            choices = movies.get((imdb, card["year"]), set())
        elif card["kind"] == "series":
            keys = title_keys(card["names"], card["year"])
            choices = set().union(*(series.get(key, set()) for key in keys if catalog_ids[key] == {imdb}))
        else:
            continue
        if len(choices) != 1:
            continue
        tmdb, path = next(iter(choices))
        if path:
            candidates[imdb].add((card["kind"], tmdb, path))
            matched_cards.append(card)
    posters = {imdb: next(iter(options))[2] for imdb, options in candidates.items() if len(options) == 1}
    for card in matched_cards:
        if card["id"] in posters:
            counts[card["domain"]] += 1
    if not posters:
        raise ValueError("No exact catalog artwork matches")
    target = DATA / "catalog-artwork.json"
    content = ",\n".join(f'{json.dumps(key)}:{json.dumps(value)}' for key, value in sorted(posters.items()))
    target.write_text("{\n" + content + "\n}\n", encoding="utf-8", newline="\n")
    print(json.dumps({"rows": len(posters), "coveredCards": counts}, sort_keys=True))


if __name__ == "__main__":
    main()

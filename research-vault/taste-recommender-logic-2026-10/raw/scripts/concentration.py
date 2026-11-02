import sys, collections
def load(path, sep, skip_header):
    c = collections.Counter()
    with open(path, encoding="latin-1") as f:
        if skip_header: next(f)
        for line in f:
            parts = line.rstrip("\n").split(sep)
            c[parts[1]] += 1
    return c
def report(name, c):
    counts = sorted(c.values(), reverse=True)
    total = sum(counts); n = len(counts)
    print(f"{name}: items={n} ratings={total}")
    for p in (0.01, 0.05, 0.10, 0.20):
        k = max(1, int(round(n * p)))
        print(f"  top {int(p*100)}% ({k} items): {sum(counts[:k])/total:.1%} of ratings")
    for share in (0.5, 0.8):
        acc = 0
        for i, v in enumerate(counts, 1):
            acc += v
            if acc >= share * total:
                print(f"  {share:.0%} of ratings covered by top {i} items ({i/n:.1%})"); break
base = sys.argv[1]
report("ML-1M", load(base + "/ml-1m/ratings.dat", "::", False))
report("ml-latest-small", load(base + "/ml-latest-small/ratings.csv", ",", True))

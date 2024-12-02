import argparse
import json
import shutil

def migrate(data):
    old_version = int(data.get("version", 1))

    if old_version == 1:
        data["linktypes"] = {i: el for i, el in enumerate(data["linktypes"])}
        data["nodetypes"] = {i: el for i, el in enumerate(data["nodetypes"])}
        data["version"] = 2

    return old_version, data

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+")
    args = parser.parse_args()

    for fn in args.inputs:
        with open(fn) as f:
            data = json.load(f)

        old_version, data_new = migrate(data)

        shutil.move(fn, fn + f".v{old_version}")

        with open(fn, "w") as f:
            f.write(json.dumps(data_new))
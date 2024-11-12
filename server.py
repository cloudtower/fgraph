from email.policy import default
from flask import Flask, request, render_template, redirect
import json
import argparse
import os

parser = argparse.ArgumentParser()
parser.add_argument("--port", default=5050, type=int)
args = parser.parse_args()

server = Flask("friends_backend")

@server.route("/")
def index_list():
    return render_template("overview.html", instances=instances_public)


@server.route("/<id>")
def index(id):
    if not id in sessions:
        return redirect("new")

    return render_template("main.html")


@server.route("/new")
def new():
    return render_template("new.html")


@server.route("/api/addinstance", methods=["POST"])
def add_instance():
    name = request.form.get("name")
    private = request.form.get("private") == "on"

    if name in sessions:
        return "Error"

    data_default = {
        "links": [],
        "nodes": [],
        "linktypes": ["Friendship", "Relationship", "Roommate", "Fellow Student", "Co-Worker", "Acquaintance", "Family"],
        "nodetypes": ["Me", "Family", "Friends", "Work"]
    }

    sessions[name] = data_default
    if not private:
        instances_public.append(name)
        sessions[name]["fn"] = f"data_public_{name}.json"
    else:
        sessions[name]["fn"] = f"data_private_{name}.json"

    write_changes(name)
    return "Success"


@server.route("/api/<id>/metadata")
def get_data(id):
    if not id in sessions:
        return redirect("new")

    return json.dumps({
        "names": list(sorted([(i, el["name"]) for i, el in enumerate(sessions[id]["nodes"])], key=lambda x: x[1])),
        "linktypes": list(sorted(enumerate(sessions[id]["linktypes"]), key=lambda x: x[1])),
        "nodetypes": list(sorted(enumerate(sessions[id]["nodetypes"]), key=lambda x: x[1]))
    })


@server.route("/api/<id>/data")
def data(id):
    if not id in sessions:
        return redirect("new")

    return json.dumps({"links": sessions[id]["links"], "nodes": sessions[id]["nodes"]})


@server.route("/api/<id>/addlink", methods=["POST"])
def add_link(id):
    if not id in sessions:
        return redirect("new")

    source = int(request.form.get("source"))
    target = int(request.form.get("target"))
    link_type = int(request.form.get("type"))
    value = max(1.0, float(request.form.get("value")) / 10)
    comment = request.form.get("comment")
    comment = "" if not comment else comment
    linkid = request.form.get("id")

    link_new = {
        "source": source,
        "target": target,
        "type": link_type,
        "value": value,
        "comment": comment
    }

    if linkid is None:
        sessions[id]["links"].append(link_new)
    else:
        try:
            sessions[id]["links"][int(linkid)] = link_new
        except:
            return "Failure"

    write_changes(id)
    return "Success"


@server.route("/api/<id>/addnode", methods=["POST"])
def add_node(id):
    if not id in sessions:
        return redirect("new")

    name = request.form.get("name")
    group = request.form.get("group")
    comment = request.form.get("comment")
    comment = "" if not comment else comment
    nodeid = request.form.get("id")

    node_new = {
        "name": name,
        "group": group,
        "comment": comment
    }

    if nodeid is None:
        sessions[id]["nodes"].append(node_new)
    else:
        try:
            sessions[id]["nodes"][int(nodeid)] = node_new
        except:
            return "Failure"

    write_changes(id)
    return "Success"


@server.route("/api/<id>/addnodetype", methods=["POST"])
def add_nodetype(id):
    if not id in sessions:
        return redirect("new")

    nodetype = request.form.get("type")
    sessions[id]["nodetypes"].append(nodetype)
    write_changes(id)
    return "Success"


@server.route("/api/<id>/addlinktype", methods=["POST"])
def add_linktype(id):
    if not id in sessions:
        return redirect("new")

    linktype = request.form.get("type")
    sessions[id]["linktypes"].append(linktype)
    write_changes(id)
    return "Success"


@server.route("/api/<id>/deletelink", methods=["POST"])
def del_link(id):
    if not id in sessions:
        return redirect("new")

    linkid = int(request.form.get("id"))
    del sessions[id]["links"][linkid]
    write_changes(id)
    return "Success"


@server.route("/api/<id>/deletenode", methods=["POST"])
def del_node(id):
    if not id in sessions:
        return redirect("new")

    nodeid = int(request.form.get("id"))
    del sessions[id]["nodes"][nodeid]

    todel = []
    for link in sessions[id]["links"]:
        if link["source"] == nodeid or link["target"] == nodeid:
            todel.append(link)
            continue

        if link["source"] > nodeid:
            link["source"] -= 1
        if link["target"] > nodeid:
            link["target"] -= 1

    for link in todel:
        sessions[id]["links"].remove(link)

    write_changes(id)
    return "Success"


def write_changes(id):
    with open(sessions[id]["fn"], "w") as f:
        f.write(json.dumps({
            "links": sessions[id]["links"],
            "nodes": sessions[id]["nodes"],
            "linktypes": sessions[id]["linktypes"],
            "nodetypes": sessions[id]["nodetypes"]
        }))


for _, _, files in os.walk("."):
    instances_public = list(filter(
        lambda x: x.startswith("data_public_") and x.endswith(".json"),
        files))
    instances_private = list(filter(
        lambda x: x.startswith("data_private_") and x.endswith(".json"),
        files))
    break

instances_public = [el[12:-5] for el in instances_public]
instances_private = [el[13:-5] for el in instances_private]
sessions = dict()

for name in instances_public:
    sessions[name] = {"fn": f"data_public_{name}.json"}
for name in instances_private:
    sessions[name] = {"fn": f"data_private_{name}.json"}
for name in instances_private + instances_public:
    sessions[name].update(json.loads(open(sessions[name]["fn"]).read()))

if __name__ == "__main__":
    server.run(host="0.0.0.0", port=args.port)

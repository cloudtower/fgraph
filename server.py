from flask import Flask, request, render_template
import json
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--port", default=5050, type=int)
args = parser.parse_args()

server = Flask("friends_backend")


@server.route("/")
def index():
    return render_template("main.html")


@server.route("/api/getdata")
def get_data():
    return json.dumps({
        "names": list(sorted([(i, el["name"]) for i, el in enumerate(nodes)], key=lambda x: x[1])),
        "linktypes": list(sorted(enumerate(linktypes), key=lambda x: x[1])),
        "nodetypes": list(sorted(enumerate(nodetypes), key=lambda x: x[1]))
    })


@server.route("/data")
def data():
    return json.dumps({"links": links, "nodes": nodes})


@server.route("/api/addlink", methods=["POST"])
def add_link():
    source = int(request.form.get("source"))
    target = int(request.form.get("target"))
    link_type = int(request.form.get("type"))
    value = float(request.form.get("value")) / 10
    comment = request.form.get("comment")
    comment = "" if not comment else comment
    id = request.form.get("id")

    link_new = {
        "source": source,
        "target": target,
        "type": link_type,
        "value": value,
        "comment": comment
    }

    if id is None:
        links.append(link_new)
    else:
        try:
            links[int(id)] = link_new
        except:
            return "Failure"

    write_changes()
    return "Success"


@server.route("/api/addnode", methods=["POST"])
def add_node():
    name = request.form.get("name")
    group = request.form.get("group")
    comment = request.form.get("comment")
    comment = "" if not comment else comment
    id = request.form.get("id")

    node_new = {
        "name": name,
        "group": group,
        "comment": comment
    }

    if id is None:
        nodes.append(node_new)
    else:
        try:
            nodes[int(id)] = node_new
        except:
            return "Failure"

    write_changes()
    return "Success"


@server.route("/api/addnodetype", methods=["POST"])
def add_nodetype():
    nodetype = request.form.get("type")
    nodetypes.append(nodetype)
    write_changes()
    return "Success"


@server.route("/api/addlinktype", methods=["POST"])
def add_linktype():
    linktype = request.form.get("type")
    linktypes.append(linktype)
    write_changes()
    return "Success"


@server.route("/api/deletelink", methods=["POST"])
def del_link():
    linkid = int(request.form.get("id"))
    del links[linkid]
    write_changes()
    return "Success"


@server.route("/api/deletenode", methods=["POST"])
def del_node():
    nodeid = int(request.form.get("id"))
    del nodes[nodeid]

    todel = []
    for link in links:
        if link["source"] == nodeid or link["target"] == nodeid:
            todel.append(link)
            continue

        if link["source"] > nodeid:
            link["source"] -= 1
        if link["target"] > nodeid:
            link["target"] -= 1

    for link in todel:
        links.remove(link)

    write_changes()
    return "Success"


def write_changes():
    with open("data.json", "w") as f:
        f.write(json.dumps({
            "links": links,
            "nodes": nodes,
            "linktypes": linktypes,
            "nodetypes": nodetypes
        }))


with open("data.json") as f:
    data = json.loads(f.read())

links = data["links"]
nodes = data["nodes"]
linktypes = data["linktypes"]
nodetypes = data["nodetypes"]

if __name__ == "__main__":
    server.run(host="0.0.0.0", port=args.port)

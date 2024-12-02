mode = 0;
editMode = false;
session = window.location.href.split("/").splice(-1);

window.onload = function () {
    get_metadata();
    block_panning();

    linkeditType = document.getElementById("linkedit_linktypes");
    linkeditValue = document.getElementById("linkedit_value");
}

// Utility functions

function get_metadata() {
    fetch(`./api/${session}/metadata`)
    .then(response => response.json())
    .then(data => {
        arrayToOptions(data["linktypes"], document.getElementById("linkedit_linktypes"))
        arrayToOptions(data["linktypes"], document.getElementById("link_property_type"))
        arrayToOptions(data["linktypes"], document.getElementById("deletelink_linktypes"))
        arrayToOptions(data["nodetypes"], document.getElementById("nodetypes"))
        arrayToOptions(data["nodetypes"], document.getElementById("node_property_group"))
        arrayToOptions(data["nodetypes"], document.getElementById("deletenodes_nodetypes"))
        updateLegend(data["nodetypes"], data["linktypes"])
    });
}

function block_panning() {
    var sidebar = document.getElementById("sidebar");
    sidebar.addEventListener("onmouseover", function (event) {
        console.log("stopping")
    })
}

function arrayToOptions(data, parent) {
    parent.innerHTML = "";
    data.forEach(el => {
        var option = document.createElement("option");
        option.value = el[0];
        option.innerHTML = el[1];
        parent.appendChild(option);
    })
}

function updateLegend(nodetypes, linktypes) {
    var color_links = d3.scale.category10();
    var color_nodes = d3.scale.category20();
    var legend_nodes = document.getElementById("legend_nodes")
    var legend_links = document.getElementById("legend_links")
    legend_nodes.innerHTML = "";
    legend_links.innerHTML = "";

    for (i in nodetypes) {
        var data = nodetypes[i][1];
        var node_wrap = document.createElement("p");
        node_wrap.style = "display: flex; margin: 0"
        var circ = document.createElement("p");
        circ.innerHTML = "•";
        circ.style = "font-size: 30px; height: 15px; margin: 7px; color: " + color_nodes(i)
        var node_name = document.createElement("p");
        node_name.style = "font-size: 15px; margin: 15px 0px 15px 0px;"
        
        node_name.innerHTML = data;
        node_wrap.appendChild(circ)
        node_wrap.appendChild(node_name)
        legend_nodes.appendChild(node_wrap)
    }

    for (i in linktypes) {
        var data = linktypes[i][1];
        var node_wrap = document.createElement("p");
        node_wrap.style = "display: flex; margin: 0"
        var circ = document.createElement("p");
        circ.style = "border-radius: 8px; border: 3px solid; width: 15px; height: 0px; margin: 20px 15px 15px 15px; color: " + color_links(i)
        var node_name = document.createElement("p");
        node_name.style = "font-size: 15px; margin: 15px 0px 15px 0px;"
        
        node_name.innerHTML = data;
        node_wrap.appendChild(circ)
        node_wrap.appendChild(node_name)
        legend_links.appendChild(node_wrap)
    }
}

function filterOptions(options, value) {
    for (i in options) {
        if (options[i].value == value) {
            return options[i].text;
        }
    }
}

function send_form(event, form, callback, cbargument, fetchcbs, fetchcbargs) {
    send(form.action.replace("api", `./api/${session}`), new FormData(form), callback, cbargument, fetchcbs, fetchcbargs);
    event.preventDefault();
}

function send(url, data, callbacks, cbarguments, fetchcbs, fetchcbargs) {
    fetch(url, {method: 'post', body: data}).then(res => res.text()).then(text => {
        if (text != "Success") {
            alert(text);
            return;
        }

        for (var i in fetchcbs) {
            var callback = fetchcbs[i];
            var cbargument = fetchcbargs[i];
            
            if (cbargument === undefined) {
                callback()
            } else {
                callback(cbargument);
            }
        }
    });

    for (var i in callbacks) {
        var callback = callbacks[i];
        var cbargument = cbarguments[i];
        
        if (cbargument === undefined) {
            callback()
        } else {
            callback(cbargument);
        }
    }
}

function fetch_data() {
    fetch(`./api/${session}/data`)
        .then(res => res.json())
        .then(res => {
            jsonData = res;
            refresh(null, res);
        });
}

function clear_input(parents) {
    parents.forEach(parent => document.getElementById(parent).value = "");
}

function hide_edit() {
    document.getElementById("link_properties").style.display = "none";
    document.getElementById("node_properties").style.display = "none";
    document.getElementById("link_info").style.display = "none";
    document.getElementById("node_info").style.display = "none";
}

function switch_mode(mode) {
    var sw_editmode = document.getElementById("sw_editmode");
    var sw_panmode = document.getElementById("sw_panmode");
    var sw_staticmode = document.getElementById("sw_staticmode");
    var editmode_settings = document.getElementById("linkedit_settings");
    var add_settings = document.getElementById("add_card");
    var export_wrap = document.getElementById("download_wrap");
    var legend_wrap = document.getElementById("legend_wrap");

    switch (mode) {
        case 0:
            sw_editmode.classList.remove("active");
            sw_staticmode.classList.remove("active");
            sw_panmode.classList.add("active");
            break;
        case 1:
            sw_editmode.classList.add("active");
            sw_staticmode.classList.remove("active");
            sw_panmode.classList.remove("active");
            break;
        case 2:
            sw_editmode.classList.remove("active");
            sw_staticmode.classList.add("active");
            sw_panmode.classList.remove("active");
            break;
        default:
            break;
    }

    var node = svg.selectAll(".node");
    if (mode == 0 || mode == 2) {
        editMode = false;
        console.log("setting drag cb");
        node.call(force.drag);
        
        editmode_settings.style.display = "none";
        add_settings.style.display = "none";
    } else {
        editMode = true;
        node.on("mousedown.drag", () => {});

        sw_panmode.classList.remove("active")
        sw_editmode.classList.add("active");
        editmode_settings.style.display = "block";
        add_settings.style.display = "block";
    }

    if (mode == 2) {
        export_wrap.style.display = "block";
        legend_wrap.style.display = "block";
        force
            .gravity(0)
            .linkStrength(d => 0)
            .charge(0)
            .stop()
            .start();
    } else {
        export_wrap.style.display = "none";
        legend_wrap.style.display = "none";
        force
            .gravity(0.05)
            .linkStrength(d => {
                if (d.value < 1) {
                    return 0;
                } else {
                    return 1;
                }
            })
            .charge(-100)
            .start();
    }

    hide_edit();
}

// Data manipulation functions

function add_link(source, target, value, type) {
    value = Math.max(1.0, value);

    jsonData.links.push({
        "source": source,
        "target": target,
        "type": type,
        "value": value / 10,
        "dist": 1 / value * 3000,
    });

    data = {
        "source": source.index,
        "target": target.index,
        "type": type,
        "value": value,
    }

    var form_data = new FormData();
    for (var key in data) {
        form_data.append(key, data[key]);
    }

    send(`./api/${session}/addlink`, form_data);
    refresh(null, jsonData);
}

function add_node(event, form) {
    data = new FormData(form);
    jsonData.nodes.push({
        "name": data.get("name"),
        "group": data.get("group"),
        "comment": data.get("comment"),
    });

    send_form(event, form, [clear_input], [['addnode_name', 'addnode_comment']], [], []);
    refresh(null, jsonData);
}

function add_nodetype(event, form) {
    send_form(event, form, [clear_input], [['addnodetype_name']], [get_metadata], [undefined]);
}

function add_linktype(event, form) {
    send_form(event, form, [clear_input], [['addlinktype_name']], [get_metadata], [undefined])
}

function delete_nodetype(event, form) {
    send_form(event, form, [], [['removenodetype_name']], [get_metadata], [undefined])
}

function delete_linktype(event, form) {
    send_form(event, form, [], [['removelinktype_name']], [get_metadata], [undefined])
}

function edit_node(event, form) {
    data = new FormData(form);
    node_edit = jsonData.nodes[data.get("id")];
    node_edit["name"] = data.get("name");
    node_edit["group"] = data.get("group");
    node_edit["comment"] = data.get("comment");

    send_form(event, form, [hide_edit], [undefined], [], []);
    refresh(null, jsonData);
}

function edit_link(event, form) {
    data = new FormData(form);
    link_edit = jsonData.links[data.get("id")]
    link_edit["type"] = data.get("type");
    link_edit["value"] = Math.max(0.1, data.get("value") / 10);
    link_edit["dist"] = 1 / data.get("value") * 3000;
    link_edit["comment"] = data.get("comment");

    send_form(event, form, [hide_edit], [undefined], [], []);
    refresh(null, jsonData);
}

function delete_node(event, form) {
    send_form(event, form, [hide_edit], [undefined], [fetch_data], [undefined]);
}

function delete_link(event, form) {
    data = new FormData(form);
    jsonData.links.splice(data.get("id"), 1);

    send_form(event, form, [hide_edit], [undefined], [fetch_data], [undefined]);
    refresh(null, jsonData);
}

function export_svg() {
    var svgData = document.getElementById("svgImage");
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svgData);
    var legend = document.getElementById("legend_wrap");

    //add name spaces.
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    source = '<?xml version="1.0" standalone="no"?>\r\n' + source.substring(0, source.length - 6);
    source += '<foreignObject x="50" y="50" height="1000px" width="1000px"><div xmlns="http://www.w3.org/1999/xhtml">' + legend.innerHTML + "</div></foreignObject></svg>"
    var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
    var link = document.getElementById("download_link");
    link.href = url;
    link.download = "export.svg";
    link.click();
}

//<style>text {font-family:Roboto-Regular,Roboto;}</style>
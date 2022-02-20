var width = "1500",
    height = "1000";

var jsonData;
var svg = d3.select("#svgContainer").append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("style", "font: 10px sans-serif;")
    .attr("id", "svgImage");

const svgImage = document.getElementById("svgImage");
const svgContainer = document.getElementById("svgContainer");

var viewBox = {x: 0, y: 0, w: svgImage.clientWidth, h: svgImage.clientHeight};
svgImage.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
const svgSize = {w: svgImage.clientWidth, h: svgImage.clientHeight};
var drag_line;

var isPanning = false;
var isMoving = false;
var startPoint = {x: 0, y: 0};
var endPoint = {x: 0, y: 0};
var scale = 1;
var isNodeMoving = false;
var isNodeClicked = false;
var isDraggingLine = false;
var dragStart;

var linkCurValue = 0;
var linkCurType = 0;

var force = d3.layout.force()
    .gravity(0.05)
    .distance(d => 1 / d.value * 300)
    .linkStrength(d => {
        if (d.value < 1) {
            return 0;
        } else {
            return 1;
        }
    })
    .charge(-100)
    .size([width, height]);

var drag_line = svg.append('svg:path')
    .attr('class', 'dragline hidden')
    .attr('d', 'M0,0L0,0');

var labelsGroup = svg.append('svg:g')
    .attr("id", "labels");

fetch_data();

function refresh(error, json) {
    force
        .nodes(json.nodes)
        .links(json.links)
        .start();

    var scale = d3.scale.linear()
        .domain(d3.extent(json.links, function (d, i) {
            return d.value;
        }))
        .range([1, 3]);

    var color_nodes = d3.scale.category20();
    var color_links = d3.scale.category10();
    var link = svg.selectAll(".link")
        .data(json.links);

    link.exit().remove();
    link.enter()
        .append("line")
        .attr("class", "link");

    var linkoverlay = svg.selectAll(".linkoverlay")
        .data(json.links);

    linkoverlay.enter()
        .append("line")
        .attr("class", "linkoverlay");
        
    link.style("stroke-width", function (d, i) {
            return scale(d.value) + "px";
        })
        .style("stroke", function(d, i) {
            return color_links(d.type);
        });
        
    linkoverlay
        .style("stroke-width", function (d, i) {
            return "6px";
        })
        .on("click", function(d, i) {
            d3.event.stopPropagation();
            if (editMode) {
                document.getElementById("link_properties").style.display = "block";
                document.getElementById("node_properties").style.display = "none";
    
                document.getElementById("link_property_value").setAttribute("value", d.value * 10);
                document.getElementById("link_property_value").value = d.value * 10;
                document.getElementById("link_property_type").value = d.type;
                document.getElementById("link_property_comment").value = d.comment !== undefined ? d.comment : "";
                document.getElementById("link_property_id").setAttribute("value", i);
                document.getElementById("link_property_source").setAttribute("value", d.source.index);
                document.getElementById("link_property_target").setAttribute("value", d.target.index);
                document.getElementById("link_property_id_delete").setAttribute("value", i);
            } else {
                document.getElementById("link_info").style.display = "block";
                document.getElementById("node_info").style.display = "none";

                var type_select = document.getElementById("link_property_type");
                var type = filterOptions(type_select.options, d.type);
                document.getElementById("info_type").innerHTML = type;
                document.getElementById("info_value").innerHTML = d.value * 10;
                document.getElementById("info_comment_link").innerHTML = d.comment !== undefined ? d.comment : "";
            }
        })

    var labels = labelsGroup
        .selectAll('text')
        .data(json.links);

    labels.exit().remove();
    labels.enter()
        .append("text");
        
    labels
        .attr("id", function(d, i) { return "label" + i; })
        .attr("x", function(d) { return (d.source.x + (d.target.x - d.source.x) * 0.5) + 10; })
        .attr("y", function(d) { return (d.source.y + (d.target.y - d.source.y) * 0.5); })
        .text(function (d) { return d.comment === undefined ? "" : d.comment })

    var node = svg.selectAll(".node")
        .data(json.nodes);
        
    node.exit().remove();
    var node_enter = node.enter()
        .append("g")
        .attr("class", "node")

    if (editMode) {
        node.on("mousedown.drag", function () {});    
    } else {
        node.call(force.drag);
    }
        
    node.on("click", function(d, i) {
            if (!isNodeMoving) {
                d3.event.stopPropagation();
                if (editMode) {
                    document.getElementById("link_properties").style.display = "none";
                    document.getElementById("node_properties").style.display = "block";

                    document.getElementById("node_property_name").setAttribute("value", d.name);
                    document.getElementById("node_property_group").value = d.group;
                    document.getElementById("node_property_comment").value = d.comment !== undefined ? d.comment : "";
                    document.getElementById("node_property_id").setAttribute("value", i);
                    document.getElementById("node_property_id_delete").setAttribute("value", i);
                } else {
                    document.getElementById("link_info").style.display = "none";
                    document.getElementById("node_info").style.display = "block";

                    var group_select = document.getElementById("node_property_group");
                    var group = filterOptions(group_select.options, d.group);
                    document.getElementById("info_group").innerHTML = group;
                    document.getElementById("info_name").innerHTML = d.name;
                    document.getElementById("info_comment_node").innerHTML = d.comment !== undefined ? d.comment : "";
                }
            }

            isNodeMoving = false;
            isNodeClicked = false;
        })
        .on("mousedown", function (d) {
            if (editMode) {
                isDraggingLine = true;
                dragStart = d;
                linkCurValue = linkeditValue.value;
                linkCurType = linkeditType.options[linkeditType.selectedIndex].value;
                
                drag_line.attr('d', 'M' + dragStart.x + ',' + dragStart.y + 'L' + dragStart.x + ',' + dragStart.y);
                drag_line.classed('hidden', false);
                drag_line.style("stroke", color_links(linkCurType));
            } else {
                isNodeClicked = true;
                isNodeMoving = false;
            }

            d3.event.stopPropagation();
        })
        .on("mousemove", function (d) {
            if (isNodeClicked) {
                isNodeMoving = true;
            }
        })
        .on("mouseup", function (d) {
            if (isDraggingLine) {
                if (!(dragStart.index == d.index)) {
                    add_link(dragStart, d, linkCurValue, linkCurType);
                }

                isDraggingLine = false;
                drag_line.classed('hidden', true);
            }
        })
        
    node_enter.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em");

    node.select("text")
        .text(function (d) { return d.name });

    node_enter.append("circle");

    node.select("circle")
        .attr("id", function (d, i) { return d.name; })
        .attr("dx", function (d, i) { return d.x; })
        .attr("dy", function (d, i) { return d.y; })
        .attr("r", function (d, i) { return 4; })
        .style("fill", function (d, i) { return color_nodes(d.group); })

    force.on("tick", function () {
        link.attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

        linkoverlay.attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

        node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

        labels
            .attr("x", function(d) { return (d.source.x + (d.target.x - d.source.x) * 0.5); })
            .attr("y", function(d) { return (d.source.y + (d.target.y - d.source.y) * 0.5); })
            .attr('transform', function(d, i) {
                var rx = (d.source.x + (d.target.x - d.source.x) * 0.5);
                var ry = (d.source.y + (d.target.y - d.source.y) * 0.5);
                var dx = d.source.x - d.target.x;
                var dy = d.source.y - d.target.y;
                var hypo = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))
                var theta = Math.acos(dx / hypo) * (180 / Math.PI);
                if (dy < 0) {
                    theta *= -1;
                }
                if (dx < 0) {
                    theta += 180;
                }
                return 'rotate(' + theta + ' ' + rx + ' ' + ry + ')';
            });
    });
}

svgContainer.onwheel = function (e) {
    e.preventDefault();
    
    var w = viewBox.w;
    var h = viewBox.h;
    var mx = e.offsetX;
    var my = e.offsetY;    
    var dw = w * (-1) * Math.sign(e.deltaY) * 0.05;
    var dh = h * (-1) * Math.sign(e.deltaY) * 0.05;
    var dx = dw * mx / svgSize.w;
    var dy = dh * my / svgSize.h;
    
    viewBox = {x: viewBox.x + dx, y: viewBox.y + dy, w: viewBox.w - dw, h: viewBox.h - dh};
    scale = svgSize.w / viewBox.w;
    
    svgImage.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
}

svgContainer.onclick = function (e) {
    if (!isMoving) {
        hide_edit();
    }
    isMoving = false;
}

svgContainer.onmousedown = function (e) {
    isPanning = true;
    startPoint = {x: e.x, y: e.y};
}

svgContainer.onmousemove = function (e) {
    if (isPanning) {
        isMoving = true;

        endPoint = {x: e.x, y: e.y};
        var dx = (startPoint.x - endPoint.x) / scale;
        var dy = (startPoint.y - endPoint.y) / scale;
        var movedViewBox = {x: viewBox.x + dx, y: viewBox.y + dy, w: viewBox.w, h: viewBox.h};
        svgImage.setAttribute('viewBox', `${movedViewBox.x} ${movedViewBox.y} ${movedViewBox.w} ${movedViewBox.h}`);
    }
}

svg.on("mousemove", function (d) {
    if (editMode) {
        if (isDraggingLine) {
            var coordinates= d3.mouse(this);
            var x = coordinates[0];
            var y = coordinates[1];

            drag_line.attr('d', 'M' + dragStart.x + ',' + dragStart.y + 'L' + x + ',' + y);
        }
    }
})

svgContainer.onmouseup = function (e) {
    if (editMode && isDraggingLine) {
        isDraggingLine = false;
        drag_line.classed('hidden', true);
    } else if (isPanning) { 
        endPoint = {x: e.x, y: e.y};
        var dx = (startPoint.x - endPoint.x) / scale;
        var dy = (startPoint.y - endPoint.y) / scale;
        viewBox = {x: viewBox.x + dx, y: viewBox.y + dy, w: viewBox.w, h: viewBox.h};
        svgImage.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
        isPanning = false;
    }
}

svgContainer.onmouseleave = function (e) {
    isPanning = false;
}
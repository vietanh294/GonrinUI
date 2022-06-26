(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD is used - Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'));
    } else {
        // Neither AMD nor CommonJS used. Use global variables.
        if (typeof jQuery === 'undefined') {
            throw 'gonrin combobox requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
    'use strict';
    var DiagramBox = function (element, options) {
        const root_element = document.getElementById(element.attr('id'));
        const canvas_div = document.getElementById(options.canvas_id);
        const dg_blocklist = root_element.querySelector('#' + options.blocklist_id);

        var init_children = function () {
            if (!!dg_blocklist) {
                let blockChildList = dg_blocklist.children;
                for (let i = 0; i < blockChildList.length; i++) {
                    blockChildList[i].classList.add('blockelem', 'dg-el-prototype', 'noselect');
                }
            }
        };

        var init_diagram = function () {
            root_element.classList.add('diagram_container');
            canvas_div.classList.add('diagram_canvas');
            dg_blocklist.classList.add('diagram_blocklist');
            init_children();
        };
        init_diagram();

        var grobject = {},
            spacing_x = options.spacing_x,
            spacing_y = options.spacing_y,
            blockGrabbed = function (block) {
                options.grab(block);
            },
            blockReleased = function () {
                options.release();
            },
            blockSnap = function (drag, first, parent) {
                return options.snapping(drag, first, parent);
            },
            beforeDelete = function (drag, parent) {
                return options.rearrange(drag, parent);
            },
            dblclick_handler = function (block_el, block_type) {
                return options.dblclick_handler(block_el, block_type);
            };

        if (!Element.prototype.matches) {
            Element.prototype.matches = Element.prototype.msMatchesSelector ||
                Element.prototype.webkitMatchesSelector;
        }
        if (!Element.prototype.closest) {
            Element.prototype.closest = function (s) {
                var el = this;
                do {
                    if (Element.prototype.matches.call(el, s)) return el;
                    el = el.parentElement || el.parentNode;
                } while (el !== null && el.nodeType === 1);
                return null;
            };
        }

        var absx = 0;
        var absy = 0;
        if (window.getComputedStyle(canvas_div).position == "absolute" || window.getComputedStyle(canvas_div).position == "fixed") {
            absx = canvas_div.getBoundingClientRect().left;
            absy = canvas_div.getBoundingClientRect().top;
        }
        // var bodyRect = document.body.getBoundingClientRect(),
        // elemRect = element.getBoundingClientRect(),
        // offset   = elemRect.top - bodyRect.top;

        // alert('Element is ' + offset + ' vertical pixels from <body>');
        var blocks = [],
            blockstemp = [],
            dg_active = false,
            paddingx = spacing_x,
            paddingy = spacing_y,
            offsetleft = 0,
            load_rearrange = false,
            drag, dragx, dragy, original,
            mouse_x, mouse_y,
            dragblock = false,
            prevblock = 0,
            drawArrow = function (arrow, x, y, id) {
                if (x < 0) {
                    canvas_div.innerHTML += '<div class="arrowblock"><input type="hidden" class="arrowid" value="' + drag.querySelector(".blockid").value + '"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M' + (blocks.filter(a => a.id == id)[0].x - arrow.x + 5) + ' 0L' + (blocks.filter(a => a.id == id)[0].x - arrow.x + 5) + ' ' + (paddingy / 2) + 'L5 ' + (paddingy / 2) + 'L5 ' + y + '" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ' + (y - 5) + 'H10L5 ' + y + 'L0 ' + (y - 5) + 'Z" fill="#C5CCD0"/></svg></div>';
                    root_element.querySelector('.arrowid[value="' + drag.querySelector(".blockid").value + '"]').parentNode.style.left = (arrow.x - 5) - (absx + window.scrollX) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left + "px";
                } else {
                    canvas_div.innerHTML += '<div class="arrowblock"><input type="hidden" class="arrowid" value="' + drag.querySelector(".blockid").value + '"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ' + (paddingy / 2) + 'L' + (x) + ' ' + (paddingy / 2) + 'L' + x + ' ' + y + '" stroke="#C5CCD0" stroke-width="2px"/><path d="M' + (x - 5) + ' ' + (y - 5) + 'H' + (x + 5) + 'L' + x + ' ' + y + 'L' + (x - 5) + ' ' + (y - 5) + 'Z" fill="#C5CCD0"/></svg></div>';
                    root_element.querySelector('.arrowid[value="' + parseInt(drag.querySelector(".blockid").value) + '"]').parentNode.style.left = blocks.filter(a => a.id == id)[0].x - 20 - (absx + window.scrollX) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left + "px";
                }
                root_element.querySelector('.arrowid[value="' + parseInt(drag.querySelector(".blockid").value) + '"]').parentNode.style.top = blocks.filter(a => a.id == id)[0].y + (blocks.filter(a => a.id == id)[0].height / 2) + canvas_div.getBoundingClientRect().top - absy + "px";
            },
            updateArrow = function (arrow, x, y, children) {
                if (x < 0) {
                    root_element.querySelector('.arrowid[value="' + children.id + '"]').parentNode.style.left = (arrow.x - 5) - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + "px";
                    root_element.querySelector('.arrowid[value="' + children.id + '"]').parentNode.innerHTML = '<input type="hidden" class="arrowid" value="' + children.id + '"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M' + (blocks.filter(id => id.id == children.parent)[0].x - arrow.x + 5) + ' 0L' + (blocks.filter(id => id.id == children.parent)[0].x - arrow.x + 5) + ' ' + (paddingy / 2) + 'L5 ' + (paddingy / 2) + 'L5 ' + y + '" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ' + (y - 5) + 'H10L5 ' + y + 'L0 ' + (y - 5) + 'Z" fill="#C5CCD0"/></svg>';
                } else {
                    root_element.querySelector('.arrowid[value="' + children.id + '"]').parentNode.style.left = blocks.filter(id => id.id == children.parent)[0].x - 20 - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + "px";
                    root_element.querySelector('.arrowid[value="' + children.id + '"]').parentNode.innerHTML = '<input type="hidden" class="arrowid" value="' + children.id + '"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ' + (paddingy / 2) + 'L' + (x) + ' ' + (paddingy / 2) + 'L' + x + ' ' + y + '" stroke="#C5CCD0" stroke-width="2px"/><path d="M' + (x - 5) + ' ' + (y - 5) + 'H' + (x + 5) + 'L' + x + ' ' + y + 'L' + (x - 5) + ' ' + (y - 5) + 'Z" fill="#C5CCD0"/></svg>';
                }
            },
            rearrangeMe = function () {
                var result = blocks.map(a => a.parent);
                for (var z = 0; z < result.length; z++) {
                    if (result[z] == -1) {
                        z++;
                    }
                    var totalwidth = 0;
                    var totalremove = 0;
                    var maxheight = 0;
                    for (var w = 0; w < blocks.filter(id => id.parent == result[z]).length; w++) {
                        var children = blocks.filter(id => id.parent == result[z])[w];
                        if (blocks.filter(id => id.parent == children.id).length == 0) {
                            children.childwidth = 0;
                        }
                        if (children.childwidth > children.width) {
                            if (w == blocks.filter(id => id.parent == result[z]).length - 1) {
                                totalwidth += children.childwidth;
                            } else {
                                totalwidth += children.childwidth + paddingx;
                            }
                        } else {
                            if (w == blocks.filter(id => id.parent == result[z]).length - 1) {
                                totalwidth += children.width;
                            } else {
                                totalwidth += children.width + paddingx;
                            }
                        }
                    }
                    if (result[z] != -1) {
                        blocks.filter(a => a.id == result[z])[0].childwidth = totalwidth;
                    }
                    for (var w = 0; w < blocks.filter(id => id.parent == result[z]).length; w++) {
                        var children = blocks.filter(id => id.parent == result[z])[w];
                        const r_block = root_element.querySelector(".blockid[value='" + children.id + "']").parentNode;
                        const r_array = blocks.filter(id => id.id == result[z]);
                        r_block.style.top = r_array.y + paddingy + canvas_div.getBoundingClientRect().top - absy + "px";
                        r_array.y = r_array.y + paddingy;
                        if (children.childwidth > children.width) {
                            r_block.style.left = r_array[0].x - (totalwidth / 2) + totalremove + (children.childwidth / 2) - (children.width / 2) - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + "px";
                            children.x = r_array[0].x - (totalwidth / 2) + totalremove + (children.childwidth / 2);
                            totalremove += children.childwidth + paddingx;
                        } else {
                            r_block.style.left = r_array[0].x - (totalwidth / 2) + totalremove - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + "px";
                            children.x = r_array[0].x - (totalwidth / 2) + totalremove + (children.width / 2);
                            totalremove += children.width + paddingx;
                        }

                        var arrowblock = blocks.filter(a => a.id == children.id)[0];
                        var arrowx = arrowblock.x - blocks.filter(a => a.id == children.parent)[0].x + 20;
                        var arrowy = paddingy;
                        updateArrow(arrowblock, arrowx, arrowy, children);
                    }
                }
            },
            checkOffset = function () {
                offsetleft = blocks.map(a => a.x);
                var widths = blocks.map(a => a.width);
                var mathmin = offsetleft.map(function (item, index) {
                    return item - (widths[index] / 2);
                })
                offsetleft = Math.min.apply(Math, mathmin);
                if (offsetleft < (canvas_div.getBoundingClientRect().left + window.scrollX - absx)) {
                    var blocko = blocks.map(a => a.id);
                    for (var w = 0; w < blocks.length; w++) {
                        root_element.querySelector(".blockid[value='" + blocks.filter(a => a.id == blocko[w])[0].id + "']").parentNode.style.left = blocks.filter(a => a.id == blocko[w])[0].x - (blocks.filter(a => a.id == blocko[w])[0].width / 2) - offsetleft + canvas_div.getBoundingClientRect().left - absx + 20 + "px";
                        if (blocks.filter(a => a.id == blocko[w])[0].parent != -1) {
                            var arrowblock = blocks.filter(a => a.id == blocko[w])[0];
                            var arrowx = arrowblock.x - blocks.filter(a => a.id == blocks.filter(a => a.id == blocko[w])[0].parent)[0].x;
                            if (arrowx < 0) {
                                root_element.querySelector('.arrowid[value="' + blocko[w] + '"]').parentNode.style.left = (arrowblock.x - offsetleft + 20 - 5) + canvas_div.getBoundingClientRect().left - absx + "px";
                            } else {
                                root_element.querySelector('.arrowid[value="' + blocko[w] + '"]').parentNode.style.left = blocks.filter(id => id.id == blocks.filter(a => a.id == blocko[w])[0].parent)[0].x - 20 - offsetleft + canvas_div.getBoundingClientRect().left - absx + 20 + "px";
                            }
                        }
                    }
                    for (var w = 0; w < blocks.length; w++) {
                        blocks[w].x = (root_element.querySelector(".blockid[value='" + blocks[w].id + "']").parentNode.getBoundingClientRect().left + window.scrollX) + (canvas_div.scrollLeft) + (parseInt(window.getComputedStyle(root_element.querySelector(".blockid[value='" + blocks[w].id + "']").parentNode).width) / 2) - 20 - canvas_div.getBoundingClientRect().left;
                    }
                }
            },
            checkAttach = function (id) {
                const xpos = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                const ypos = (drag.getBoundingClientRect().top + window.scrollY) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
                if (xpos >= blocks.filter(a => a.id == id)[0].x - (blocks.filter(a => a.id == id)[0].width / 2) - paddingx && xpos <= blocks.filter(a => a.id == id)[0].x + (blocks.filter(a => a.id == id)[0].width / 2) + paddingx && ypos >= blocks.filter(a => a.id == id)[0].y - (blocks.filter(a => a.id == id)[0].height / 2) && ypos <= blocks.filter(a => a.id == id)[0].y + blocks.filter(a => a.id == id)[0].height) {
                    return true;
                } else {
                    return false;
                }
            },
            remove_parent_selecting = function () {
                let list_block_class = root_element.querySelectorAll(".dg_block");
                for (let i = 0; i < list_block_class.length; ++i) {
                    list_block_class[i].classList.remove('parent-selecting');
                }
            },
            removeSelection = function () {
                canvas_div.appendChild(root_element.querySelector(".indicator"));
                drag.parentNode.removeChild(drag);
            },
            firstBlock = function (type) {
                if (type == "drop") {
                    blockSnap(drag, true, undefined);
                    dg_active = false;
                    drag.style.top = (drag.getBoundingClientRect().top + window.scrollY) - (absy + window.scrollY) + canvas_div.scrollTop + "px";
                    drag.style.left = (drag.getBoundingClientRect().left + window.scrollX) - (absx + window.scrollX) + canvas_div.scrollLeft + "px";
                    canvas_div.appendChild(drag);
                    blocks.push({
                        parent: -1,
                        childwidth: 0,
                        id: parseInt(drag.querySelector(".blockid").value),
                        x: (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left,
                        y: (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top,
                        width: parseInt(window.getComputedStyle(drag).width),
                        height: parseInt(window.getComputedStyle(drag).height)
                    });
                } else if (type == "rearrange") {
                    drag.classList.remove("dragging");
                    load_rearrange = false;
                    for (var w = 0; w < blockstemp.length; w++) {
                        if (blockstemp[w].id != parseInt(drag.querySelector(".blockid").value)) {
                            const blockParent = root_element.querySelector(".blockid[value='" + blockstemp[w].id + "']").parentNode;
                            const arrowParent = root_element.querySelector(".arrowid[value='" + blockstemp[w].id + "']").parentNode;
                            blockParent.style.left = (blockParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX) + canvas_div.scrollLeft - 1 - absx + "px";
                            blockParent.style.top = (blockParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY) + canvas_div.scrollTop - absy - 1 + "px";
                            arrowParent.style.left = (arrowParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX) + canvas_div.scrollLeft - absx - 1 + "px";
                            arrowParent.style.top = (arrowParent.getBoundingClientRect().top + window.scrollY) + canvas_div.scrollTop - 1 - absy + "px";
                            canvas_div.appendChild(blockParent);
                            canvas_div.appendChild(arrowParent);
                            blockstemp[w].x = (blockParent.getBoundingClientRect().left + window.scrollX) + (parseInt(blockParent.offsetWidth) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left - 1;
                            blockstemp[w].y = (blockParent.getBoundingClientRect().top + window.scrollY) + (parseInt(blockParent.offsetHeight) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top - 1;
                        }
                    }
                    blockstemp.filter(a => a.id == 0)[0].x = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                    blockstemp.filter(a => a.id == 0)[0].y = (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
                    blocks = blocks.concat(blockstemp);
                    blockstemp = [];
                }
            },
            dg_snap = function (drag, i, blocko) {
                if (!load_rearrange) {
                    canvas_div.appendChild(drag);

                }
                var totalwidth = 0;
                var totalremove = 0;
                var maxheight = 0;
                for (var w = 0; w < blocks.filter(id => id.parent == blocko[i]).length; w++) {
                    var children = blocks.filter(id => id.parent == blocko[i])[w];
                    if (children.childwidth > children.width) {
                        totalwidth += children.childwidth + paddingx;
                    } else {
                        totalwidth += children.width + paddingx;
                    }
                }
                totalwidth += parseInt(window.getComputedStyle(drag).width);
                for (var w = 0; w < blocks.filter(id => id.parent == blocko[i]).length; w++) {
                    var children = blocks.filter(id => id.parent == blocko[i])[w];
                    if (children.childwidth > children.width) {
                        root_element.querySelector(".blockid[value='" + children.id + "']").parentNode.style.left = blocks.filter(a => a.id == blocko[i])[0].x - (totalwidth / 2) + totalremove + (children.childwidth / 2) - (children.width / 2) + "px";
                        children.x = blocks.filter(id => id.parent == blocko[i])[0].x - (totalwidth / 2) + totalremove + (children.childwidth / 2);
                        totalremove += children.childwidth + paddingx;
                    } else {
                        root_element.querySelector(".blockid[value='" + children.id + "']").parentNode.style.left = blocks.filter(a => a.id == blocko[i])[0].x - (totalwidth / 2) + totalremove + "px";
                        children.x = blocks.filter(id => id.parent == blocko[i])[0].x - (totalwidth / 2) + totalremove + (children.width / 2);
                        totalremove += children.width + paddingx;
                    }
                }
                drag.style.left = blocks.filter(id => id.id == blocko[i])[0].x - (totalwidth / 2) + totalremove - (window.scrollX + absx) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left + "px";
                drag.style.top = blocks.filter(id => id.id == blocko[i])[0].y + (blocks.filter(id => id.id == blocko[i])[0].height / 2) + paddingy - (window.scrollY + absy) + canvas_div.getBoundingClientRect().top + "px";
                if (load_rearrange) {
                    blockstemp.filter(a => a.id == parseInt(drag.querySelector(".blockid").value))[0].x = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                    blockstemp.filter(a => a.id == parseInt(drag.querySelector(".blockid").value))[0].y = (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
                    blockstemp.filter(a => a.id == drag.querySelector(".blockid").value)[0].parent = blocko[i];
                    for (var w = 0; w < blockstemp.length; w++) {
                        if (blockstemp[w].id != parseInt(drag.querySelector(".blockid").value)) {
                            const blockParent = root_element.querySelector(".blockid[value='" + blockstemp[w].id + "']").parentNode;
                            const arrowParent = root_element.querySelector(".arrowid[value='" + blockstemp[w].id + "']").parentNode;
                            blockParent.style.left = (blockParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX + canvas_div.getBoundingClientRect().left) + canvas_div.scrollLeft + "px";
                            blockParent.style.top = (blockParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY + canvas_div.getBoundingClientRect().top) + canvas_div.scrollTop + "px";
                            arrowParent.style.left = (arrowParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX + canvas_div.getBoundingClientRect().left) + canvas_div.scrollLeft + 20 + "px";
                            arrowParent.style.top = (arrowParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY + canvas_div.getBoundingClientRect().top) + canvas_div.scrollTop + "px";
                            canvas_div.appendChild(blockParent);
                            canvas_div.appendChild(arrowParent);

                            blockstemp[w].x = (blockParent.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(blockParent).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                            blockstemp[w].y = (blockParent.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(blockParent).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
                        }
                    }
                    blocks = blocks.concat(blockstemp);
                    blockstemp = [];
                } else {
                    blocks.push({
                        childwidth: 0,
                        parent: blocko[i],
                        id: parseInt(drag.querySelector(".blockid").value),
                        x: (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left,
                        y: (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top,
                        width: parseInt(window.getComputedStyle(drag).width),
                        height: parseInt(window.getComputedStyle(drag).height)
                    });
                }

                var arrowblock = blocks.filter(a => a.id == parseInt(drag.querySelector(".blockid").value))[0];
                var arrowx = arrowblock.x - blocks.filter(a => a.id == blocko[i])[0].x + 20;
                var arrowy = paddingy;
                drawArrow(arrowblock, arrowx, arrowy, blocko[i]);

                if (blocks.filter(a => a.id == blocko[i])[0].parent != -1) {
                    var flag = false;
                    var idval = blocko[i];
                    while (!flag) {
                        if (blocks.filter(a => a.id == idval)[0].parent == -1) {
                            flag = true;
                        } else {
                            var zwidth = 0;
                            for (var w = 0; w < blocks.filter(id => id.parent == idval).length; w++) {
                                var children = blocks.filter(id => id.parent == idval)[w];
                                if (children.childwidth > children.width) {
                                    if (w == blocks.filter(id => id.parent == idval).length - 1) {
                                        zwidth += children.childwidth;
                                    } else {
                                        zwidth += children.childwidth + paddingx;
                                    }
                                } else {
                                    if (w == blocks.filter(id => id.parent == idval).length - 1) {
                                        zwidth += children.width;
                                    } else {
                                        zwidth += children.width + paddingx;
                                    }
                                }
                            }
                            blocks.filter(a => a.id == idval)[0].childwidth = zwidth;
                            idval = blocks.filter(a => a.id == idval)[0].parent;
                        }
                    }
                    blocks.filter(id => id.id == idval)[0].childwidth = totalwidth;
                }
                if (load_rearrange) {
                    load_rearrange = false;
                    drag.classList.remove("dragging");
                }
                rearrangeMe();
                checkOffset();
            },
            dg_dblclick = function (event) {
                let prototype_elem = event.target.closest(".dg_block");
                if (!!prototype_elem) {
                    dblclick_handler(prototype_elem, 'dg_block');
                } else {
                    let arrow_block_elem = event.target.closest(".arrowblock");
                    if (!!arrow_block_elem) {
                        dblclick_handler(arrow_block_elem, 'dg_arrowblock');
                    }
                }
            },
            diagram_touchblock = function (event) {
                dragblock = false;
                if (hasParentClass(event.target, "dg_block")) {
                    var theblock = event.target.closest(".dg_block");
                    if (event.targetTouches) {
                        mouse_x = event.targetTouches[0].clientX;
                        mouse_y = event.targetTouches[0].clientY;
                    } else {
                        mouse_x = event.clientX;
                        mouse_y = event.clientY;
                    }
                    if (event.type !== "mouseup" && hasParentClass(event.target, "dg_block")) {
                        if (event.which != 3) {
                            if (!dg_active && !load_rearrange) {
                                dragblock = true;
                                drag = theblock;
                                dragx = mouse_x - (drag.getBoundingClientRect().left + window.scrollX);
                                dragy = mouse_y - (drag.getBoundingClientRect().top + window.scrollY);
                            }
                        }
                    }
                }
            },
            hasParentClass = function (element, classname) {
                // if (!element) {
                //     return false;
                // }
                if (element.className && typeof element.className === 'string') {
                    if (element.className.split(' ').indexOf(classname) >= 0) return true;
                }
                return element.parentNode && hasParentClass(element.parentNode, classname);
            },
            diagram_import = function (output) {
                canvas_div.innerHTML = output.html;
                for (var a = 0; a < output.blockarr.length; a++) {
                    blocks.push({
                        childwidth: parseFloat(output.blockarr[a].childwidth),
                        parent: parseFloat(output.blockarr[a].parent),
                        id: parseFloat(output.blockarr[a].id),
                        x: parseFloat(output.blockarr[a].x),
                        y: parseFloat(output.blockarr[a].y),
                        width: parseFloat(output.blockarr[a].width),
                        height: parseFloat(output.blockarr[a].height)
                    })
                }
                if (blocks.length > 1) {
                    rearrangeMe();
                    checkOffset();
                }
            },
            diagram_output = function () {
                var html_ser = canvas_div.innerHTML;
                var json_data = {
                    html: html_ser,
                    blockarr: blocks,
                    blocks: []
                };
                if (blocks.length > 0) {
                    for (var i = 0; i < blocks.length; i++) {
                        json_data.blocks.push({
                            id: blocks[i].id,
                            parent: blocks[i].parent,
                            data: [],
                            attr: []
                        });
                        var blockParent = root_element.querySelector(".blockid[value='" + blocks[i].id + "']").parentNode;
                        blockParent.querySelectorAll("input").forEach(function (block) {
                            var json_name = block.getAttribute("name");
                            var json_value = block.value;
                            json_data.blocks[i].data.push({
                                name: json_name,
                                value: json_value
                            });
                        });
                        Array.prototype.slice.call(blockParent.attributes).forEach(function (attribute) {
                            var jsonobj = {};
                            jsonobj[attribute.name] = attribute.value;
                            json_data.blocks[i].attr.push(jsonobj);
                        });
                    }
                    return json_data;
                }
            },
            diagram_toArray = function () {
                // var html_ser = canvas_div.innerHTML;
                var json_data = [];
                if (blocks.length > 0) {

                    return json_data;
                }
            },
            diagram_deleteBlocks = function () {
                blocks = [];
                canvas_div.innerHTML = "<div class='indicator invisible'></div>";
            },
            diagram_beginDrag = function (event) {
                if (window.getComputedStyle(canvas_div).position == "absolute" || window.getComputedStyle(canvas_div).position == "fixed") {
                    absx = canvas_div.getBoundingClientRect().left;
                    absy = canvas_div.getBoundingClientRect().top;
                }
                if (event.targetTouches) {
                    mouse_x = event.changedTouches[0].clientX;
                    mouse_y = event.changedTouches[0].clientY;
                } else {
                    mouse_x = event.clientX;
                    mouse_y = event.clientY;
                }
                if (event.which != 3 && event.target.closest(".dg-el-prototype")) {
                    original = event.target.closest(".dg-el-prototype");
                    var newNode = event.target.closest(".dg-el-prototype").cloneNode(true);
                    event.target.closest(".dg-el-prototype").classList.add("dragnow");
                    newNode.classList.add("dg_block");
                    newNode.classList.remove("dg-el-prototype");
                    if (blocks.length === 0) {
                        newNode.innerHTML += "<input type='hidden' name='blockid' class='blockid' value='" + blocks.length + "'>";
                        root_element.appendChild(newNode);
                        drag = root_element.querySelector(".blockid[value='" + blocks.length + "']").parentNode;
                    } else {
                        newNode.innerHTML += "<input type='hidden' name='blockid' class='blockid' value='" + (Math.max.apply(Math, blocks.map(a => a.id)) + 1) + "'>";
                        root_element.appendChild(newNode);
                        drag = root_element.querySelector(".blockid[value='" + (parseInt(Math.max.apply(Math, blocks.map(a => a.id))) + 1) + "']").parentNode;
                    }
                    blockGrabbed(event.target.closest(".dg-el-prototype"));
                    drag.classList.add("dragging");
                    dg_active = true;
                    dragx = mouse_x - (event.target.closest(".dg-el-prototype").getBoundingClientRect().left);
                    dragy = mouse_y - (event.target.closest(".dg-el-prototype").getBoundingClientRect().top);
                    drag.style.left = mouse_x - dragx + "px";
                    drag.style.top = mouse_y - dragy + "px";
                }
            },
            diagram_endDrag = function (event) {
                remove_parent_selecting();
                if (event.which != 3 && (dg_active || load_rearrange)) {
                    dragblock = false;
                    blockReleased();
                    if (!root_element.querySelector(".indicator").classList.contains("invisible")) {
                        root_element.querySelector(".indicator").classList.add("invisible");
                    }
                    if (dg_active) {
                        original.classList.remove("dragnow");
                        drag.classList.remove("dragging");
                    }
                    if (parseInt(drag.querySelector(".blockid").value) === 0 && load_rearrange) {
                        firstBlock("rearrange")
                    } else if (dg_active && blocks.length == 0 && (drag.getBoundingClientRect().top + window.scrollY) > (canvas_div.getBoundingClientRect().top + window.scrollY) && (drag.getBoundingClientRect().left + window.scrollX) > (canvas_div.getBoundingClientRect().left + window.scrollX)) {
                        firstBlock("drop");
                    } else if (dg_active && blocks.length == 0) {
                        removeSelection();
                    } else if (dg_active) {
                        var blocko = blocks.map(a => a.id);
                        for (var i = 0; i < blocks.length; i++) {
                            if (checkAttach(blocko[i])) {
                                dg_active = false;
                                if (blockSnap(drag, false, root_element.querySelector(".blockid[value='" + blocko[i] + "']").parentNode)) {
                                    dg_snap(drag, i, blocko);
                                } else {
                                    dg_active = false;
                                    removeSelection();
                                }
                                break;
                            } else if (i == blocks.length - 1) {
                                dg_active = false;
                                removeSelection();
                            }
                        }
                    } else if (load_rearrange) {
                        var blocko = blocks.map(a => a.id);
                        for (var i = 0; i < blocks.length; i++) {
                            if (checkAttach(blocko[i])) {
                                dg_active = false;
                                drag.classList.remove("dragging");
                                dg_snap(drag, i, blocko);
                                break;
                            } else if (i == blocks.length - 1) {
                                if (beforeDelete(drag, blocks.filter(id => id.id == blocko[i])[0])) {
                                    dg_active = false;
                                    drag.classList.remove("dragging");
                                    dg_snap(drag, blocko.indexOf(prevblock), blocko);
                                    break;
                                } else {
                                    load_rearrange = false;
                                    blockstemp = [];
                                    dg_active = false;
                                    removeSelection();
                                    break;
                                }
                            }
                        }
                    }
                }
            },
            diagram_moveBlock = function (event) {
                if (event.targetTouches) {
                    mouse_x = event.targetTouches[0].clientX;
                    mouse_y = event.targetTouches[0].clientY;
                } else {
                    mouse_x = event.clientX;
                    mouse_y = event.clientY;
                }

                if (dragblock) {
                    load_rearrange = true;
                    drag.classList.add("dragging");
                    var blockid = parseInt(drag.querySelector(".blockid").value);
                    prevblock = blocks.filter(a => a.id == blockid)[0].parent;
                    blockstemp.push(blocks.filter(a => a.id == blockid)[0]);
                    blocks = blocks.filter(function (e) {
                        return e.id != blockid
                    });
                    if (blockid != 0) {
                        root_element.querySelector(".arrowid[value='" + blockid + "']").parentNode.remove();
                    }
                    var layer = blocks.filter(a => a.parent == blockid);
                    var flag = false;
                    var foundids = [];
                    var allids = [];
                    while (!flag) {
                        for (var i = 0; i < layer.length; i++) {
                            if (layer[i] != blockid) {
                                blockstemp.push(blocks.filter(a => a.id == layer[i].id)[0]);
                                const blockParent = root_element.querySelector(".blockid[value='" + layer[i].id + "']").parentNode;
                                const arrowParent = root_element.querySelector(".arrowid[value='" + layer[i].id + "']").parentNode;
                                blockParent.style.left = (blockParent.getBoundingClientRect().left + window.scrollX) - (drag.getBoundingClientRect().left + window.scrollX) + "px";
                                blockParent.style.top = (blockParent.getBoundingClientRect().top + window.scrollY) - (drag.getBoundingClientRect().top + window.scrollY) + "px";
                                arrowParent.style.left = (arrowParent.getBoundingClientRect().left + window.scrollX) - (drag.getBoundingClientRect().left + window.scrollX) + "px";
                                arrowParent.style.top = (arrowParent.getBoundingClientRect().top + window.scrollY) - (drag.getBoundingClientRect().top + window.scrollY) + "px";
                                drag.appendChild(blockParent);
                                drag.appendChild(arrowParent);
                                foundids.push(layer[i].id);
                                allids.push(layer[i].id);
                            }
                        }
                        if (foundids.length == 0) {
                            flag = true;
                        } else {
                            layer = blocks.filter(a => foundids.includes(a.parent));
                            foundids = [];
                        }
                    }
                    for (var i = 0; i < blocks.filter(a => a.parent == blockid).length; i++) {
                        var blocknumber = blocks.filter(a => a.parent == blockid)[i];
                        blocks = blocks.filter(function (e) {
                            return e.id != blocknumber
                        });
                    }
                    for (var i = 0; i < allids.length; i++) {
                        var blocknumber = allids[i];
                        blocks = blocks.filter(function (e) {
                            return e.id != blocknumber
                        });
                    }
                    if (blocks.length > 1) {
                        rearrangeMe();
                    }
                    dragblock = false;
                }
                if (dg_active) {
                    drag.style.left = mouse_x - dragx + "px";
                    drag.style.top = mouse_y - dragy + "px";
                } else if (load_rearrange) {
                    drag.style.left = mouse_x - dragx - (window.scrollX + absx) + canvas_div.scrollLeft + "px";
                    drag.style.top = mouse_y - dragy - (window.scrollY + absy) + canvas_div.scrollTop + "px";
                    blockstemp.filter(a => a.id == parseInt(drag.querySelector(".blockid").value)).x = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft;
                    blockstemp.filter(a => a.id == parseInt(drag.querySelector(".blockid").value)).y = (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop;
                }
                if (dg_active || load_rearrange) {
                    if (mouse_x > canvas_div.getBoundingClientRect().width + canvas_div.getBoundingClientRect().left - 10 && mouse_x < canvas_div.getBoundingClientRect().width + canvas_div.getBoundingClientRect().left + 10) {
                        canvas_div.scrollLeft += 10;
                    } else if (mouse_x < canvas_div.getBoundingClientRect().left + 10 && mouse_x > canvas_div.getBoundingClientRect().left - 10) {
                        canvas_div.scrollLeft -= 10;
                    } else if (mouse_y > canvas_div.getBoundingClientRect().height + canvas_div.getBoundingClientRect().top - 10 && mouse_y < canvas_div.getBoundingClientRect().height + canvas_div.getBoundingClientRect().top + 10) {
                        canvas_div.scrollTop += 10;
                    } else if (mouse_y < canvas_div.getBoundingClientRect().top + 10 && mouse_y > canvas_div.getBoundingClientRect().top - 10) {
                        canvas_div.scrollLeft -= 10;
                    }
                    var xpos = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                    var ypos = (drag.getBoundingClientRect().top + window.scrollY) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
                    var blocko = blocks.map(a => a.id);
                    remove_parent_selecting();
                    for (var i = 0; i < blocks.length; i++) {
                        if (checkAttach(blocko[i])) {
                            root_element.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.classList.add("parent-selecting");
                            root_element.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.appendChild(root_element.querySelector(".indicator"));
                            root_element.querySelector(".indicator").style.left = (root_element.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.offsetWidth / 2) - 5 + "px";
                            root_element.querySelector(".indicator").style.top = root_element.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.offsetHeight + "px";
                            root_element.querySelector(".indicator").classList.remove("invisible");
                            break;
                        } else if (i == blocks.length - 1) {
                            if (!root_element.querySelector(".indicator").classList.contains("invisible")) {
                                root_element.querySelector(".indicator").classList.add("invisible");
                            }
                        }
                    }
                }
            },
            // diagram_update_element = function (old_item, new_item) {
            //     old_item.parentNode.replaceChild(old_item, new_item);
            // },
            diagram_load = function () {
                console.log('diagram_load============================');

                var el = document.createElement("DIV");
                el.classList.add('indicator');
                el.classList.add('invisible');
                canvas_div.appendChild(el);


                canvas_div.addEventListener("dblclick", dg_dblclick);

                root_element.addEventListener("mousedown", diagram_beginDrag);
                root_element.addEventListener("mousedown", diagram_touchblock, false);
                root_element.addEventListener("touchstart", diagram_beginDrag);
                root_element.addEventListener("touchstart", diagram_touchblock, false);


                root_element.addEventListener("mouseup", diagram_touchblock, false);
                root_element.addEventListener("mousemove", diagram_moveBlock, false);
                root_element.addEventListener("touchmove", diagram_moveBlock, false);

                root_element.addEventListener("mouseup", diagram_endDrag, false);
                root_element.addEventListener("touchend", diagram_endDrag, false);
            };



        diagram_load();

        grobject.diagram_import = diagram_import;
        grobject.diagram_output = diagram_output;
        grobject.diagram_deleteBlocks = diagram_deleteBlocks;
        grobject.diagram_load = diagram_load;
        grobject.init_children = init_children;
        grobject.diagram_toArray = diagram_toArray;



        return grobject;
    };

    /*****************************************/

    $.fn.diagrambox = function (options) {
        return this.each(function () {
            var $this = $(this);
            options.refresh = options.refresh || false;
            if ($this.data('gonrin') && options.refresh) {
                $this.data('gonrin', null);
            }
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.diagrambox.defaults, options);
                $this.data('gonrin', DiagramBox($this, options));
            }
        });
    };

    $.fn.diagrambox.defaults = {
        blocklist_id: 'diagram_blocklist',
        canvas_id: 'diagram_canvas',
        grab: function (block) { return true; },
        release: function () { return true; },
        snapping: function (drag, first, parent) {
            return true;
        },
        rearrange: function (drag, parent) {
            return false;
        },
        dblclick_handler: function (block_el, block_type) {
            return true;
        },
        spacing_x: 20,
        spacing_y: 60,
        type: null,
        /*autobind: Controls whether to bind the widget to the data source on initialization.*/
        autobind: true
    };
}));
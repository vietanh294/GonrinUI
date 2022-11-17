class Gantt {
    constructor(staticID, options) {
        this.staticID = staticID;
        this.sidebarHeader = options.sidebarHeader || 'Unused parameter right now';
        this.noDataFoundMessage = options.noDataFoundMessage || 'No data found.';
        this.startTimeAlias = options.startTimeAlias || 'startTime';
        this.endTimeAlias = options.endTimeAlias || 'endTime';
        this.idAlias = options.idAlias || 'id';
        this.rowAlias = options.rowAlias || 'rowTitle';
        this.templateColumnWidth = options.templateColumnWidth || '150px';
        this.min_width_cont = 600;
        this.itemWidth = options.itemWidth || 50;

        this.linkAlias = options.linkAlias;
        this.tooltipAlias = options.tooltipAlias || 'tooltip';
        this.groupBy = options.groupBy ? options.groupBy.split(',').map(group => group.trim()) : [];
        this.groupByAlias = this.groupBy ? (options.groupByAlias ? options.groupByAlias.split(',').map(group => group.trim()) : this.groupBy) : [];

        this.chartType = options.chartType || "month";
        this.translateLang = options.translateLang || {
            "hour": "Giờ", "day": "Ngày", "week": "Tuần", "month": "Tháng", "quarter": "Quý", "year": "Năm"
        };


        this.data = {};
        this.rawData = [];
        this.divisionCount = 0;
        this.maxTime;
        this.minTime;
        this.refreshFunction = options.refreshFunction;

        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('gonrin-gantt-wrapper');
        document.getElementById(this.staticID).appendChild(this.wrapper);
        this.refreshData();
    }

    refreshData(options = {}) {
        this.chartType = options.chartType || "month";

        this.rawData = this.refreshFunction();
        this.empty();
        if (this.rawData.length < 1) {
            this.noDataFound();
            return;
        }
        this.processData();
        this.render();
    }

    processData() {
        //Have to reset the divisionCount here. Otherwise it keeps incrementing on the divisionCount of the previous data set.
        this.divisionCount = 0;

        //Sorts the data by the start time ascending before anything else is done
        //This ensures that the data is rendered in the proper location when we generate the chart.
        // let sortedData = this.rawData.sort((a, b) => new Date(a[this.startTimeAlias]) - new Date(b[this.startTimeAlias])),
        //     groupedData = {};
        let sortedData = this.rawData, groupedData = {};
        for (let dataRow of sortedData) {
            this.groupArray(groupedData, dataRow);
        }

        this.data = groupedData;

        //Get the max and min datetimes in the dataset
        //Used to determine the first and last times that are shown in the chart
        let maxTime = this.rawData.reduce((max, curr) => !!curr[this.endTimeAlias] ? max > new Date(curr[this.endTimeAlias]) ? max : new Date(curr[this.endTimeAlias]) : max, new Date(0));
        let minTime = this.rawData.reduce((min, curr) => !!curr[this.startTimeAlias] ? min > new Date(curr[this.startTimeAlias]) ? new Date(curr[this.startTimeAlias]) : min : min, new Date(maxTime.getTime()));
        if (this.chartType === "hour") {
            this.maxTime = roundHourUp(maxTime);
            this.minTime = roundHourDown(minTime);
        } else if (this.chartType === "month") {
            this.maxTime = roundMonthUp(maxTime);
            this.minTime = roundMonthDown(minTime);
        } else if (this.chartType === "quarter") {
            this.maxTime = roundQuarterUp(maxTime);
            this.minTime = roundQuarterDown(minTime);
        } else if (this.chartType === "year") {
            this.maxTime = roundYearUp(maxTime);
            this.minTime = roundYearDown(minTime);
        }

        if (this.minTime === this.maxTime) return;

        //Determines the number of columns(times) that will be shown in the chart.
        //Mostly used for iteration later in the render process
        if (this.chartType === "hour") {
            for (let i = new Date(this.minTime.getTime()); i <= this.maxTime; i.setTime(i.getTime() + (60 * 60 * 1000))) {
                this.divisionCount++;
            }
        } else if (this.chartType === "month") {
            this.divisionCount = (this.maxTime.getFullYear() - this.minTime.getFullYear()) * 12
                + this.maxTime.getMonth() - this.minTime.getMonth() + 1;
        } else if (this.chartType === "quarter") {
            this.divisionCount = Math.ceil(((this.maxTime.getFullYear() - this.minTime.getFullYear()) * 12
                + this.maxTime.getMonth() - this.minTime.getMonth()) / 3) + 1;
        } else if (this.chartType === "year") {
            this.divisionCount = (this.maxTime.getFullYear() - this.minTime.getFullYear()) + 2;
        }
        this.min_width_cont = this.divisionCount * this.itemWidth + parseInt(this.templateColumnWidth);
    }
    //Takes advantage of the fact that javascript is kind of pass-by-reference for object data types
    //So every change to result here is actually a change to our groupedData variable
    groupArray(result, entry, iter = 0) {
        let nextResult;
        if (iter === this.groupBy.length + 1) {
            result.push(entry);
            return;
        }

        let groupingProperty = result[entry[this.groupBy[iter]]];
        let chartEntry = result[entry[this.idAlias]];

        //If we can't find a property within result for the groupBy parameter at this level we create a new one.
        if (!result[entry[this.groupBy[iter]]] && iter < this.groupBy.length) {
            result[entry[this.groupBy[iter]]] = { groupName: entry[this.groupByAlias[iter]] };
            nextResult = result[entry[this.groupBy[iter]]];
        }
        else if (!result[entry[this.idAlias]] && iter === this.groupBy.length) {
            result[entry[this.idAlias]] = [];
            nextResult = result[entry[this.idAlias]];
        }
        else if (result[entry[this.groupBy[iter]]]) {
            nextResult = result[entry[this.groupBy[iter]]];
        }
        else if (result[entry[this.idAlias]]) {
            nextResult = result[entry[this.idAlias]];
        }
        iter++;
        this.groupArray(nextResult, entry, iter);
    }

    //Creates the header for the Gantt chart
    buildHeader() {
        if (this.chartType === "hour") {
            let headerDivs = `<div class="gonrin-gantt-header-spacer"></div>`;
            if (this.divisionCount > 1) {
                for (let i = 0; i < this.divisionCount; i++) {
                    let date = new Date(this.minTime.getTime() + ((60 * 60 * 1000) * i)),
                        hour = date.getHours() > 12 ? date.getHours() - 12 : date.getHours(),
                        amPm = date.getHours() > 12 ? 'PM' : 'AM',
                        minutes = date.getMinutes().toString().length === 1 ? '0' + date.getMinutes() : date.getMinutes();
                    headerDivs += `<div class="gonrin-gantt-header">${hour}:${minutes} ${amPm}</div>`;
                }
            }
            return `<div class="gonrin-gantt-headers" style="grid-template-columns: ${this.templateColumnWidth} 
             repeat(${this.divisionCount}, 1fr)">${headerDivs}</div>`;
        } else if (this.chartType === "month") {
            let headerDivs = `<div class="gonrin-gantt-header-spacer"></div>`;
            if (this.divisionCount > 1) {
                // let the_max_time_month = this.maxTime.getMonth();
                let the_min_time_month = this.minTime.getMonth() + 1;
                let the_year = this.minTime.getFullYear();
                let change_year = false;
                for (let i = 0; i < this.divisionCount; i++) {
                    let month_text = the_min_time_month + i;
                    // let month_text = the_max_time_month - (this.divisionCount % 12) + 1 + i;
                    month_text = (month_text + 12) % 12;
                    if (change_year) {
                        change_year = false;
                        the_year = the_year + 1;
                    }
                    if (month_text === 0 || month_text === "0") {
                        month_text = 12;
                        change_year = true;
                    }
                    if (this.maxTime.getFullYear() !== this.minTime.getFullYear()) {
                        let year = the_year % 100;
                        month_text = month_text + "/" + year;
                    }
                    headerDivs += `<div class="gonrin-gantt-header">${this.translateLang.month} ${month_text}</div>`;
                }
            } else {
                let month = this.minTime.getMonth();
                headerDivs += `<div class="gonrin-gantt-header">${this.translateLang.month} ${month}</div>`;
            }
            return `<div class="gonrin-gantt-headers" style="grid-template-columns: ${this.templateColumnWidth} 
             repeat(${this.divisionCount}, 1fr); min-width: ${this.min_width_cont}px;">${headerDivs}</div>`;
        } else if (this.chartType === "quarter") {
            let headerDivs = `<div class="gonrin-gantt-header-spacer"></div>`;
            if (this.divisionCount > 1) {
                let the_min_time_month = this.minTime.getMonth() + 1;
                let the_min_time_quarter = Math.ceil(the_min_time_month / 3);
                let the_year = this.minTime.getFullYear();
                let change_year = false;
                for (let i = 0; i < this.divisionCount; i++) {
                    let quarter_text = the_min_time_quarter + i;
                    quarter_text = (quarter_text + 4) % 4;
                    if (change_year) {
                        change_year = false;
                        the_year = the_year + 1;
                    }
                    if (quarter_text === 0 || quarter_text === "0") {
                        quarter_text = 4;
                        change_year = true;
                    }
                    if (this.maxTime.getFullYear() !== this.minTime.getFullYear()) {
                        let year = the_year % 100;
                        quarter_text = quarter_text + "/" + year;
                    }
                    headerDivs += `<div class="gonrin-gantt-header">${this.translateLang.quarter} ${quarter_text}</div>`;
                }
            } else {
                let quarter_text = Math.ceil(this.minTime.getMonth() / 3);
                headerDivs += `<div class="gonrin-gantt-header">${this.translateLang.quarter} ${quarter_text}</div>`;
            }
            return `<div class="gonrin-gantt-headers" style="grid-template-columns: ${this.templateColumnWidth} 
             repeat(${this.divisionCount}, 1fr); min-width: ${this.min_width_cont}px;">${headerDivs}</div>`;
        } else if (this.chartType === "year") {
            let headerDivs = `<div class="gonrin-gantt-header-spacer"></div>`;
            if (this.divisionCount > 1) {
                let the_year = this.minTime.getFullYear();
                for (let i = 0; i < this.divisionCount; i++) {
                    let year_text = the_year + i;
                    headerDivs += `<div class="gonrin-gantt-header">${this.translateLang.year} ${year_text}</div>`;
                }
            } else {
                let year_text = this.maxTime.getFullYear() - this.divisionCount + 1;
                headerDivs += `<div class="gonrin-gantt-header">${this.translateLang.year} ${year_text}</div>`;
            }
            return `<div class="gonrin-gantt-headers" style="grid-template-columns: ${this.templateColumnWidth} 
             repeat(${this.divisionCount}, 1fr); min-width: ${this.min_width_cont}px;">${headerDivs}</div>`;
        }
    }

    buildLines() {
        let lines = '<div class="gonrin-gantt-sidebar-template"></div>';
        for (let i = 0; i < this.divisionCount; i++) {
            lines += `<div class="gonrin-gantt-line"></div>`;
        }
        let currTime = new Date();
        let today_line_width = 50;
        today_line_width = (currTime - this.minTime) / (this.maxTime - this.minTime) * 100;

        lines += `<div class="gonrin-gantt-today-container" style="left: ${this.templateColumnWidth}; 
            width: calc(100% - ${this.templateColumnWidth});">
            <div class="gonrin-gantt-today-line" style="width: ${today_line_width}%;"></div></div>`;

        return `<div class="gonrin-gantt-lines-container" style="grid-template-columns: ${this.templateColumnWidth} 
         repeat(${this.divisionCount}, 1fr); min-width: ${this.min_width_cont}px;">${lines}</div>`;
    }

    buildRow(rowArr, dataIndex) {
        let totalTime = this.maxTime - this.minTime,
            compositeRows = `<div style="grid-column: 2/${this.divisionCount + 1};grid-row:1;display:flex;align-items:center"><div class="gonrin-gantt-sub-row-wrapper">`;
        for (let i = 0; i < rowArr.length; i++) {
            // let rowData = rowArr[i];
            //Check to see if the current entry has a start and end time. If not we break
            if (!rowArr[i][this.startTimeAlias] || !rowArr[i][this.endTimeAlias])
                break;
            let currElStart = new Date(rowArr[i][this.startTimeAlias]),
                currElEnd = new Date(rowArr[i][this.endTimeAlias]),
                currElRunPercent = ((currElEnd - currElStart) / totalTime) * 100;
            if (i === 0 || (rowArr[i - 1] && new Date(rowArr[i - 1][this.endTimeAlias]) !== currElStart)) {
                let baseTime = (i === 0 ? this.minTime : new Date(rowArr[i - 1][this.endTimeAlias])),
                    difference = ((currElStart - baseTime) / totalTime) * 100;
                compositeRows += `<div style="width:${difference}%;"></div>`;
            }
            //If we don't have a linkAlias we assume the entries are not meant to link anywhere, so we just render them as divs instead.
            let data_obj = '';
            if (!!rowArr[i]?.dataBundle && typeof rowArr[i]?.dataBundle === "object") {
                for (const key in rowArr[i].dataBundle) {
                    if (Object.hasOwnProperty.call(rowArr[i].dataBundle, key)) {
                        data_obj = data_obj + "data-" + key + `="` + rowArr[i].dataBundle[key] + `" `;
                    }
                }
            }

            if (this.linkAlias) {
                compositeRows += `<a class="gonrin-gantt-row-entry ${rowArr[i]?.cssClass ?? ""}" href="${rowArr[i][this.linkAlias]}" data-index="${dataIndex.join('-')}-${i}" 
                    style="width:${currElRunPercent}%; height:${rowArr[i]?.height ?? ""};
                    background-color: ${rowArr[i]?.bgcolor ?? ""} !important;"  ${data_obj}></a>`;
            } else {
                compositeRows += `<div class="gonrin-gantt-row-entry ${rowArr[i]?.cssClass ?? ""}" data-index="${dataIndex.join('-')}-${i}" 
                    style="width:${currElRunPercent}%;height:${rowArr[i]?.height ?? ""};
                    background-color: ${rowArr[i]?.bgcolor ?? ""} !important;"  ${data_obj}></div>`;
            }
        }
        return compositeRows + '</div></div>';
    }

    buildContent() {
        let body = [`<div class="gonrin-gantt-row-container" style="min-width: ${this.min_width_cont}px;">`],
            header = this.buildHeader(),
            self = this;

        buildContent(this.data, body);
        body.push('</div>');

        return `<div class="gonrin-gantt-content">${header}${body.join('')}</div>`;

        function buildContent(data, result, depth = 0, dataIndex = []) {

            for (let prop in data) {
                if (data[prop]) {
                    if (prop !== 'groupName')
                        dataIndex.push(prop);

                    if (typeof data[prop] === "object" && !Array.isArray(data[prop])) {
                        result.push(`<div class="gonrin-gantt-grouping-header" style="padding-left: ${5 + (depth * 20)}px">${data[prop].groupName}</div><div>`);
                        depth += 1;
                        buildContent(data[prop], result, depth, dataIndex);
                        depth -= 1;
                    }
                    else if (Array.isArray(data[prop])) {
                        result.push(`<div class="gonrin-gantt-row" style="grid-template-columns: ${self.templateColumnWidth} 
                            repeat(${self.divisionCount}, 1fr)"><div class="gonrin-gantt-sidebar-header">
                            <div class="gonrin-gantt-sidebar-header-content">${data[prop][0][self.rowAlias]}</div>
                            </div>${self.buildRow(data[prop], dataIndex)}</div>`);
                    }
                    dataIndex.pop();
                }
            }
            result.push('</div>');
        }

    }

    buildChart() {
        let content = this.buildContent();
        let lines = this.buildLines();
        return `${lines}${content}`;
    }

    bindHover() {
        let bindElements = document.querySelectorAll(`#${this.staticID} .gonrin-gantt-row-entry`);

        bindElements.forEach(bindElement => {
            let toolTipElement,
                timeout;
            bindElement.addEventListener('mouseover', e => {
                let target = e.target,
                    indexArray = target.getAttribute('data-index').split('-'),
                    position = getElOffset(target),
                    targetHeight = getBoundingRect(target).height,
                    self = this;
                indexArray.push(this.tooltipAlias);
                position.top += (targetHeight + 5);
                target.classList.add('hovering');
                //Set a delay on the tooltip appearing so that it doesn't immediately appear if the user happens to swipe their mouse across the screen.
                //At the end of the delay we check to see if the mouse is still hovering, at which point we will show the tooltip
                timeout = setTimeout(() => {
                    if (!target.classList.contains('hovering'))
                        return;
                    toolTipElement = document.createElement(`div`);
                    toolTipElement.classList.add('gonrin-gantt-row-entry-tooltip');
                    toolTipElement.innerHTML = getToolTipData();
                    toolTipElement.style.top = `${position.top}px`;
                    toolTipElement.style.left = `${position.left}px`;
                    document.body.appendChild(toolTipElement);
                    fadeIn(toolTipElement, 300);
                }, 300);

                function getToolTipData() {
                    let dataArray = self.data;
                    for (let i = 0; i < indexArray.length; i++) {
                        if (i === indexArray.length - 1)
                            return dataArray[indexArray[i]]
                        else
                            dataArray = dataArray[indexArray[i]];
                    }
                }
            })

            bindElement.addEventListener('mouseout', e => {
                let target = e.target;

                clearTimeout(timeout);
                target.classList.remove('hovering');
                if (toolTipElement)
                    fadeOut(toolTipElement, 300, () => toolTipElement.remove());
            })
        });
    }

    bindCollapse() {
        let bindElements = document.querySelectorAll(`#${this.staticID} .gonrin-gantt-grouping-header`);

        bindElements.forEach(bindElement => {
            bindElement.addEventListener('click', e => {
                let group = e.target.nextSibling,
                    duration = 300;
                if (!group.classList.contains('gonrin-gantt-group--collapsed')) {
                    slideUp(group, duration);
                    group.classList.add('gonrin-gantt-group--collapsed');
                }
                else {
                    slideDown(group, duration);
                    group.classList.remove('gonrin-gantt-group--collapsed');
                }
            })
        })
    }

    render() {
        this.wrapper.innerHTML = this.buildChart();

        this.bindCollapse();

        if (this.tooltipAlias)
            this.bindHover();
    }

    noDataFound() {
        this.wrapper.innerHTML = this.noDataFoundMessage;
    }

    empty() {
        this.wrapper.innerHTML = '';
    }

}

function roundHourUp(date) {
    let m = 60 * 60 * 1000;
    return new Date(Math.ceil(date.getTime() / m) * m);
}
function roundHourDown(date) {
    let m = 60 * 60 * 1000;
    return new Date(Math.floor(date.getTime() / m) * m);
}

function roundMonthUp(date) {
    let y = date.getFullYear(), m = date.getMonth();
    return new Date(y, m + 1, 1);
}
function roundMonthDown(date) {
    let y = date.getFullYear(), m = date.getMonth();
    return new Date(y, m, 1);
}

function roundQuarterUp(date) {
    let y = date.getFullYear(), m = date.getMonth();
    let mq = (Math.ceil(m / 3) * 3)
    return new Date(y, mq, 1);
}
function roundQuarterDown(date) {
    let y = date.getFullYear(), m = date.getMonth();
    let mq = (Math.floor(m / 3) * 3)
    return new Date(y, mq, 1);
}

function roundYearUp(date) {
    let y = date.getFullYear();
    return new Date(y, 1, 1);
}
function roundYearDown(date) {
    let y = date.getFullYear();
    return new Date(y, 1, 1);
}


function fadeIn(element, ms, callback = null) {
    let duration = ms,
        interval = 50,
        gap = interval / duration,
        opacity = 0;

    element.style.display = 'block';
    element.style.opacity = opacity;

    let fading = window.setInterval(fade, interval);

    function fade() {
        opacity = opacity + gap;
        element.style.opacity = opacity;

        if (opacity <= 0)
            element.style.display = 'none';
        if (opacity >= 1) {
            window.clearInterval(fading);
            if (callback)
                callback();
        }
    }
}
function fadeOut(element, ms, callback = null) {
    let duration = ms,
        interval = 50,
        gap = interval / duration,
        opacity = 1;

    let fading = window.setInterval(fade, interval);

    function fade() {
        opacity = opacity - gap;
        element.style.opacity = opacity;

        if (opacity <= 0)
            element.style.display = 'none';
        if (opacity <= 0) {
            window.clearInterval(fading);
            if (callback)
                callback();
        }
    }
}

function getElOffset(element) {
    let boundingRect = getBoundingRect(element);
    return { top: boundingRect.top + window.scrollY, left: boundingRect.left + window.scrollX };
}
function getBoundingRect(element) {
    return element.getBoundingClientRect();
}

function slideUp(element, ms) {

    setProperty(element, 'height', `${element.offsetHeight}px`);
    setProperty(element, 'transition-property', 'height, margin, padding');
    setProperty(element, 'transition-duration', `${ms}ms`);
    setProperty(element, 'box-sizing', 'border-box');

    zeroMultiProperty(element, ['margin-bottom', 'margin-top', 'padding-top', 'padding-bottom']);
    setProperty(element, 'overflow', 'hidden');

    //Need a timeout otherwise the slide up animation is not performed
    setTimeout(() => setProperty(element, 'height'), 0);

    setTimeout(() => {
        setProperty(element, 'display', 'none');
        removeMultiProperty(element, ['height', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom', 'overflow', 'transition-duration', 'transition-property'])
    }, ms);
}
function slideDown(element, ms) {

    element.style.display = 'block';

    let height = element.offsetHeight;

    setProperty(element, 'height');
    setProperty(element, 'transition-property', 'height, margin, padding');
    setProperty(element, 'transition-duration', `${ms}ms`);
    setProperty(element, 'box-sizing', 'border-box');
    setProperty(element, 'overflow', 'hidden');

    //Need a timeout otherwise the slide up animation is not performed
    setTimeout(() => setProperty(element, 'height', `${height}px`), 0);

    setTimeout(() => {
        removeMultiProperty(element, ['height', 'overflow', 'transition-duration', 'transition-property']);
    }, ms);
}

//Sets the inline property of the given element to the value provided.
//If not provided, the value is set to 0
function setProperty(element, property, value = 0) {
    element.style.setProperty(property, value);
}

//Iteratively calls setProperty
function zeroMultiProperty(element, properties) {
    for (property of properties) {
        setProperty(element, property);
    }
}

//Iteratively calls removeProperty
function removeMultiProperty(element, properties) {
    for (property of properties)
        removeProperty(element, property);
}
//Removes the given property from the given element's inline styling
function removeProperty(element, property) {
    element.style.removeProperty(property);
};
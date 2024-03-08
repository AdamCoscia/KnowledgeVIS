export default class SetView {
  constructor(utils, elem) {
    this.utils = utils;
    this.setViewLegend = d3.select("#set-view-legend");
    this.tooltip = d3.select("#views-tooltip");
    this.controls = {
      filterShared: false,
      filterUnique: false,
      disableZoom: false,
      sortBy: "name",
      scaleBy: "log",
    };
    this.data = {
      groups: [],
      setViewData: [],
      subjectsFilter: [],
      subjectsIDKey: {},
      predictionsIDKey: {},
      predictionsNameKey: {},
      predictionsClusters: {},
      predictionsExtent: [],
    };
    this.plot = {
      el: elem,
      defs: null,
      zoom: null,
      interactionLayer: null,
      setView: null,
      subjects: [],
      predictions: [],
      clusters: [],
      rows: [],
      columns: [],
      minYScaleBandwidth: 16,
      margin: {
        t: 8,
        r: 8,
        b: 8,
        l: 8,
      },
    };
  }

  init() {
    const self = this;

    const svg = self.plot.el;
    const margin = self.plot.margin;

    // add groups in layer order (i.e., draw element groups in this order)
    const interactionLayer = svg.append("g").attr("class", "interaction-layer");
    const setView = interactionLayer.append("g").attr("class", "set-view");

    // add zoom and pan to the svg
    const filtered = (event) => {
      return !self.controls.disableZoom && self.data.subjectsFilter.length;
    };
    const delta = (event) => {
      return Math.sign(event.deltaY) * 0.05; // scroll 5% of element height - bottom boundary
    };
    const zoomed = ({ transform }) => {
      const fh = parseFloat(svg.style("height"));
      const nrows = self.plot.rows.length;
      const bw = self.plot.minYScaleBandwidth; // px
      let minSubjectGTranslateY = 0;
      let maxSubjectGTranslateY = 0;
      if (self.plot.subjects.length) {
        minSubjectGTranslateY = Infinity;
        maxSubjectGTranslateY = -Infinity;
        self.plot.subjects.forEach((obj) => {
          const gTransform = d3.select(`g#${obj.id}`).attr("transform");
          const gTranslateY = self.utils.getTransformation(gTransform).translateY;
          minSubjectGTranslateY = Math.min(minSubjectGTranslateY, gTranslateY);
          maxSubjectGTranslateY = Math.max(maxSubjectGTranslateY, gTranslateY);
        });
      }
      const tb = -minSubjectGTranslateY;
      const bb = Math.max(fh, bw * nrows + margin.b) + maxSubjectGTranslateY;
      const yScale = d3
        .scaleLinear()
        .domain([1, 2])
        .range([tb, fh - bb]);
      d3.select(".set-scrollable-group").attr("transform", `translate(0, ${yScale(transform.k)})`);
    };

    const zoom = d3.zoom().scaleExtent([1, 2]).filter(filtered).wheelDelta(delta).on("zoom", zoomed);
    svg.call(zoom).on("click.zoom", null).on("dblclick.zoom", null);

    // save groups to access later
    self.plot.defs = svg.select("defs");
    self.plot.zoom = zoom;
    self.plot.interactionLayer = interactionLayer;
    self.plot.setView = setView;
  }

  /**
   * See: https://observablehq.com/@d3/color-legend
   * @param {*} sizeScale
   * @returns
   */
  drawSetViewLegend(sizeScale, width) {
    const title = "Probability";
    const tickSize = 6;
    const height = 44 + tickSize;
    const marginTop = 18;
    const marginRight = 32;
    const marginBottom = 6 + tickSize;
    const marginLeft = 32;
    const tickFormat = ".3f";

    this.setViewLegend.attr("height", height + marginTop + marginBottom);

    // create x-axis
    const n = Math.min(sizeScale.domain().length, sizeScale.range().length);
    const x = sizeScale.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

    // create tick values
    const lb = sizeScale.domain()[0];
    const ub = sizeScale.domain()[1];
    const nValues = 6;
    let tickValues = [];
    let a, b, step;
    switch (this.controls.scaleBy) {
      case "log":
        a = Math.log10(lb);
        b = Math.log10(ub);
        step = (1 / nValues) * (b - a);
        for (let i = a; i <= b; i += step) {
          tickValues.push(Math.pow(10, i));
        }
        break;
      case "lin":
        a = lb;
        b = ub;
        step = (1 / nValues) * (b - a);
        for (let i = a; i <= b; i += step) {
          tickValues.push(i);
        }
    }

    // draw legend
    this.setViewLegend
      .append("g")
      .selectAll("text")
      .data(tickValues)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => sizeScale(d))
      .attr("x", (d) => x(d))
      .attr("y", marginTop + 16)
      .text("ABC");

    // draw ticks
    this.setViewLegend
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format(tickFormat)).tickSize(tickSize).tickValues(tickValues))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .append("text")
          .attr("x", marginLeft)
          .attr("y", marginTop + marginBottom - height - 6)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .attr("font-weight", "bold")
          .attr("class", "title")
          .text(title)
      );
  }

  resetZoom() {
    this.plot.el.call(this.plot.zoom.transform, d3.zoomIdentity);
  }

  clear() {
    this.plot.setView.selectAll("*").remove();
    this.setViewLegend.selectAll("*").remove();
  }

  render() {
    const SF = this.data.subjectsFilter; //      (List)   [sid1, sid2, ...]
    const SIK = this.data.subjectsIDKey; //      (Object) {sid1: s1, sid2: s2, ...}

    const DNK = this.data.predictionsNameKey; // (Object) {p1: pid1, p2: pid2 ...}
    const DC = this.data.predictionsClusters; // (Object) {p1: c1, p2: c1, ...}
    const DE = this.data.predictionsExtent; //   (List)   min/max values for predictions [min, max]

    const S = this.data.groups.map((sentenceGroup) => sentenceGroup.subjects).flat();
    const D = this.utils.deepCopy(this.data.setViewData);

    if (!SF.length) return; // don't plot if all subjects filtered out

    const self = this;
    self.controls.disableZoom = false;

    // sort and filter subjects and predictions
    self.plot.subjects = filterSubjects(S, SF);
    self.plot.predictions = filterPredictions(D.children, SF);
    sortPredictions(self.plot.predictions, self.controls.sortBy);

    // Labels of clusters, rows, and columns
    const subjectGroupLengths = self.plot.predictions.map((s) => s.children.length);
    self.plot.clusters = [...new Set(Object.values(DC))];
    self.plot.rows = [...Array(Math.max(...subjectGroupLengths) + 1).keys()]; // add an extra row to avoid clipping with top boundary
    self.plot.columns = self.plot.subjects.map((s) => s.id);

    // get plot elements
    const svg = self.plot.el;
    const setView = self.plot.setView; // set-view
    const margin = self.plot.margin;

    // get height and width
    const fw = parseFloat(svg.style("width"));
    const fh = parseFloat(svg.style("height"));

    // bounds (top, right, bottom, left)
    const tb = margin.t;
    const rb = fw - margin.r;
    const bb = fh - margin.b;
    const lb = margin.l;

    // compute scales
    const xScale = d3.scaleBand().domain(self.plot.columns).range([lb, rb]);
    const textColorScale = d3.scaleOrdinal(self.utils.schemeTableau20).domain(self.plot.clusters);
    const textFontScale =
      self.controls.scaleBy == "log"
        ? d3.scaleLog().domain(DE).range([8, 24])
        : self.controls.scaleBy == "lin"
        ? d3.scaleLinear().domain(DE).range([8, 24])
        : d3.scaleLog().domain(DE).range([8, 24]);

    // first draw set view legend, so SVG size scales properly
    self.drawSetViewLegend(textFontScale, fw);

    // create x-axis subject groups
    let nSubjectsSoFar = 0;
    let xAxisGroupsTranslateY = 0;
    const xAxisGroups = (g) => {
      const ySpacing = 12; // space between lines, in px
      let maxLines = 0; // max number of lines drawn across all subject groups
      g.attr("class", "x-axis-groups")
        .attr("fill", "none")
        .attr("font-size", "10")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(0, ${tb})`)
        .selectAll("g")
        .data(self.data.groups)
        .join("g")
        .attr("class", "x-axis-group")
        .attr("opacity", 1)
        .attr("transform", (d) => {
          const nSubjectsVisible = d.subjects.filter((subject) => SF.includes(subject.id)).length;
          const x = lb + nSubjectsSoFar * xScale.bandwidth() + (1 / 2) * nSubjectsVisible * xScale.bandwidth();
          nSubjectsSoFar += nSubjectsVisible;
          return `translate(${x},0)`;
        })
        .append("text")
        .attr("fill", "currentColor")
        .attr("y", 3)
        .attr("dy", "0.71em")
        .html(function (d) {
          const nSubjectsVisible = d.subjects.filter((subject) => SF.includes(subject.id)).length;
          if (nSubjectsVisible >= 1 && d.subjects.length > 1) {
            const maxWidth = nSubjectsVisible * xScale.bandwidth(); // px
            const [html, nlines] = splitTextIntoLinesByMaxWidth(this, d.template, ySpacing, maxWidth);
            maxLines = Math.max(maxLines, nlines);
            return html;
          } else {
            return "";
          }
        });
      // only translate group if any subject group is drawn
      xAxisGroupsTranslateY = maxLines > 0 ? tb + (maxLines - 1) * ySpacing : 0;
      g.attr("transform", `translate(0, ${xAxisGroupsTranslateY})`);
    };

    // create x-axis
    const xAxis = (g) => {
      g.attr("class", "x-axis")
        .call(d3.axisBottom(xScale).tickSize(0))
        .call((g) => {
          g.select(".domain").remove();
          const maxWidth = xScale.bandwidth(); // px
          const ySpacing = 12; // space between lines, in px
          let maxLines = 1; // max number of lines drawn across all subjects
          g.selectAll(".tick text").html(function (d) {
            const subject = SIK[d]; // get subject text
            const [html, nlines] = splitTextIntoLinesByMaxWidth(this, subject, ySpacing, maxWidth);
            maxLines = Math.max(maxLines, nlines);
            return html;
          });
          const xAxisTranslateY = tb + (maxLines - 1) * ySpacing;
          const padTop = xAxisGroupsTranslateY > 0 ? xAxisGroupsTranslateY + tb : 0;
          g.attr("transform", `translate(0, ${padTop + xAxisTranslateY})`);
        });
    };

    // clear previous plot
    setView.selectAll("*").remove();

    // create scrollable group, to go below x-axis
    const scrollableGroup = setView.append("g").attr("class", "set-scrollable-group");

    // draw x-axis
    const xAxisBackground = setView.append("rect").attr("x", 0).attr("y", 0).attr("width", fw).attr("fill", "white");
    const xAxisGroupsEl = setView.append("g").call(xAxisGroups);
    const xAxisGroupsHeight = xAxisGroupsEl.node().getBBox().height;
    const xAxisEl = setView.append("g").call(xAxis);
    const xAxisHeight = xAxisEl.node().getBBox().height;
    const xAxisBackgroundHeight = tb * 2 + xAxisHeight + xAxisGroupsHeight;
    xAxisBackground.attr("height", xAxisBackgroundHeight);

    // create connector line group
    const connectorLines = scrollableGroup.append("g").attr("class", "connector-lines");

    // draw subject columns
    const subjectGroups = scrollableGroup
      .append("g")
      .attr("class", "set-subject-groups")
      .selectAll("g")
      .data(self.plot.predictions) // subjects: [{s1: [p1, p2, ...]}, {s2: [p1, p2, ...]}, ...]
      .join("g")
      .attr("class", "set-subject-group")
      .attr("id", (d) => `${d.id}`)
      .attr("transform", (d) => `translate(${xScale(d.id)},0)`);

    // create y scale
    const bw = self.plot.minYScaleBandwidth;
    const yScale = d3
      .scaleBand()
      .domain(self.plot.rows)
      .range([xAxisBackgroundHeight, Math.max(bb, bw * self.plot.rows.length)]);

    // draw rows
    subjectGroups
      .selectAll("text")
      .data((d) => d.children) // predictions: [p1, p2, ...]
      .join("text")
      .attr("class", "set-prediction-text")
      .attr("id", (d) => DNK[d.name]) // get unique prediction id
      .attr("data-index", (_, i) => i) // make index available from DOM
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .attr("fill", (d) => (self.plot.clusters.length > 1 ? textColorScale(DC[d.name]) : "black")) // color by cluster
      .attr("x", xScale.bandwidth() / 2) // center within bandwidth
      .attr("y", (_, i) => yScale(i + 1)) // position text along y-axis, leave first row empty
      .attr("font-size", (d) => `${textFontScale(d.value)}px`) // scale text based on prediction value
      .text((d) => d.name)
      .on("mouseenter", mouseenter)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)
      .on("click", click);

    // ========================== HOVER ==================================== //

    function mouseenter(event, d) {
      // set styles on all elements with same id and cluster
      d3.selectAll(`#${DNK[d.name]}`).attr("hovered", true);
      d3.selectAll(`#cluster-${DC[d.name]}`).style("font-weight", 900); // don't override attributes
      // populate tooltip
      let sentence = "";
      for (let i = 0; i < self.data.groups.length; i++) {
        const sentenceGroup = self.data.groups[i];
        const groupSubjectIDs = sentenceGroup.subjects.map((subject) => subject.id);
        if (groupSubjectIDs.includes(d.parent)) {
          sentence = sentenceGroup.template.replace("[subject]", SIK[d.parent]);
          break;
        }
      }
      const html = `
        <span><b>"${sentence}"</b></span>
        <br />
        <span>&#8250; ${d.name} (${DC[d.name]}): ${d.value.toFixed(3)}</span>`;
      self.tooltip.html(html);
      self.tooltip.style("display", "block").style("opacity", 1);
      // draw connector line
      const lines = connectorLines.selectAll(`line#${DNK[d.name]}.set-connector-line`);
      if (lines.empty()) drawConnectorLines(DNK[d.name], false); // draw connector line
    }
    function mousemove(event, d) {
      positionTooltip(event.x, event.y);
    }
    function mouseleave(event, d) {
      // unset styles on all elements with same id and cluster
      d3.selectAll(`#${DNK[d.name]}`).attr("hovered", "");
      d3.selectAll(`#cluster-${DC[d.name]}`).style("font-weight", ""); // don't override attributes
      // clear tooltip
      self.tooltip.html("");
      self.tooltip.style("display", "none").style("opacity", 0);
      // clear connector line
      const lines = connectorLines.selectAll(`line#${DNK[d.name]}.set-connector-line`);
      if (!lines.empty()) {
        lines.each(function () {
          const line = d3.select(this);
          if (line.attr("selected") === "false") line.remove(); // remove connector line
        });
      }
    }

    // ========================== CLICK ==================================== //

    function click(event, t) {
      const ct = d3.select(this);
      const tid = DNK[t.name];
      const selected = ct.attr("selected") === "true";
      // clear previous click settings
      subjectGroups.style("opacity", 1);
      d3.selectAll("text.set-prediction-text").style("opacity", 1).style("display", "block");
      d3.selectAll("line.set-prediction-line").remove();
      if (!selected) {
        if (self.controls.sortBy === "rank") {
          self.controls.disableZoom = true; // disable scrolling
          connectorLines.selectAll("line").remove(); // remove all lines
          d3.selectAll("text.set-prediction-text").attr("selected", false).style("opacity", 0).style("display", "none"); // hide all text
          yScale.range([xAxisBackgroundHeight, bb]); // adjust yScale to fit within view
          drawSelectedNeighborhood(tid); // draw neighborhood of words around selected word
          drawConnectorLines(tid, true); // re-draw connector lines
        } else {
          translateSubjectGroups(tid, t.parent, parseFloat(ct.attr("y"))); // align selected words
          redrawConnectorLines(); // re-draw connector lines
        }
        d3.selectAll(`line#${tid}.set-connector-line`).attr("selected", true);
        d3.selectAll(`text#${tid}.set-prediction-text`).attr("selected", true);
      } else {
        if (self.controls.sortBy === "rank") {
          connectorLines.selectAll("line").remove(); // clear connector lines
          yScale.range([xAxisBackgroundHeight, Math.max(bb, bw * self.plot.rows.length)]); // reset yScale to fit number of rows
          subjectGroups
            .selectAll("text")
            .attr("y", (_, i) => yScale(i + 1))
            .attr("font-size", (d) => `${textFontScale(d.value)}px`); // re-draw basic view
          drawConnectorLines(tid, false); // re-draw connector lines
          self.controls.disableZoom = false; // enable scrolling
        } else {
          subjectGroups.attr("transform", (d) => `translate(${xScale(d.id)},0)`); // reset selected words
          redrawConnectorLines(); // re-draw connector lines
        }
        d3.selectAll(`line#${tid}.set-connector-line`).attr("selected", false);
        d3.selectAll(`text#${tid}.set-prediction-text`).attr("selected", false);
      }
      self.resetZoom();
    }

    // =============================== DRAW ================================ //

    /**
     * TODO
     * @param {*} targetID
     */
    function drawSelectedNeighborhood(targetID) {
      const nNeighborhoodWords = 5; // most number of words to draw around center word
      const dyNeighborhoodWords = 16; // pixels to draw neighborhood words apart
      const finalIndex = self.plot.rows.length - 1; // remove extra row added to avoid clipping
      const topY = yScale(1);
      const centerY = yScale(Math.ceil((1 / 2) * (finalIndex - 1)) + 1);
      const bottomY = yScale(finalIndex);
      const centerX = (1 / 2) * xScale.bandwidth();
      subjectGroups.each(function () {
        const subjectG = d3.select(this);
        const text = subjectG.selectAll(`text#${targetID}.set-prediction-text`);
        if (!text.empty()) {
          // re-draw selected text in center of the view
          const textIndex = parseInt(text.attr("data-index"));
          text
            .style("opacity", 1)
            .style("display", "block")
            .attr("y", centerY) // position clicked words in center
            .attr("font-size", "16px");
          // draw up to `nNeighborhoodWords` above/below the selected word
          const texts = subjectG.selectAll("text.set-prediction-text");
          const startIndex = Math.max(0, textIndex - nNeighborhoodWords);
          const endIndex = Math.min(textIndex + nNeighborhoodWords, finalIndex - 1);
          for (let i = startIndex; i <= endIndex; i++) {
            texts
              .filter(function () {
                return d3.select(this).attr("data-index") == i && i !== textIndex;
              })
              .style("opacity", 1)
              .style("display", "block")
              .attr("y", centerY + (i - textIndex) * dyNeighborhoodWords) // position word above/below clicked word
              .attr("font-size", "10px");
          }
          // draw lines above/below selected word
          if (textIndex > nNeighborhoodWords) {
            const maxTopLineLength = centerY - topY - (nNeighborhoodWords + 1) * dyNeighborhoodWords;
            const ratio = (textIndex - nNeighborhoodWords) / (finalIndex - nNeighborhoodWords - 1);
            const topLineLength = ratio * maxTopLineLength;
            subjectG
              .insert("line", ":first-child")
              .attr("class", "set-prediction-line")
              .attr("x1", centerX)
              .attr("y1", topY + maxTopLineLength - topLineLength)
              .attr("x2", centerX)
              .attr("y2", topY + maxTopLineLength);
          }
          if (textIndex < finalIndex - nNeighborhoodWords - 1) {
            const maxBottomLineLength = bottomY - centerY - (nNeighborhoodWords + 1) * dyNeighborhoodWords;
            const ratio = (finalIndex - nNeighborhoodWords - textIndex - 1) / (finalIndex - nNeighborhoodWords - 1);
            const bottomLineLength = ratio * maxBottomLineLength;
            subjectG
              .insert("line", ":first-child")
              .attr("class", "set-prediction-line")
              .attr("x1", centerX)
              .attr("y1", bottomY - maxBottomLineLength)
              .attr("x2", centerX)
              .attr("y2", bottomY - maxBottomLineLength + bottomLineLength);
          }
        }
      });
    }

    /**
     * TODO
     * @param {*} targetID
     * @param {*} targetParentID
     * @param {*} targetDeltaY
     */
    function translateSubjectGroups(targetID, targetParentID, targetDeltaY) {
      // calculate click target's y position
      const targetParentG = d3.select(`g#${targetParentID}`); // target's parent group
      const targetParentTransform = targetParentG.attr("transform"); // target's parent group's transform string
      const targetParentTranslateY = self.utils.getTransformation(targetParentTransform).translateY; // y translation of target's parent group
      const targetY = targetParentTranslateY + targetDeltaY; // target's y position on the screen

      // get min/max of subject group translations
      let minSubjectGTranslateY = Infinity;
      let maxSubjectGTranslateY = -Infinity;

      // translate each subject group if target's y position and text's y delta position are not aligned
      subjectGroups.each(function (d) {
        const subjectG = d3.select(this);
        const text = subjectG.selectAll(`text#${targetID}.set-prediction-text`);
        if (!text.empty()) {
          // update subject group's y translation
          const textDeltaY = parseFloat(text.attr("y")); // text's y delta position within parent group
          const subjectGTranslateY = targetY - textDeltaY;
          subjectG.attr("transform", `translate(${xScale(d.id)}, ${subjectGTranslateY})`);
          // update min/max
          minSubjectGTranslateY = Math.min(minSubjectGTranslateY, subjectGTranslateY);
          maxSubjectGTranslateY = Math.max(maxSubjectGTranslateY, subjectGTranslateY);
        } else {
          // reduce subject group opacity
          subjectG.style("opacity", 0.15);
        }
      });

      // adjust baseline to min/max of subject groups
      if (minSubjectGTranslateY > 0) {
        subjectGroups.each(function (d) {
          const subjectG = d3.select(this);
          const text = subjectG.selectAll(`text#${targetID}.set-prediction-text`);
          if (!text.empty()) {
            const subjectGTranslateY = self.utils.getTransformation(subjectG.attr("transform")).translateY;
            subjectG.attr("transform", `translate(${xScale(d.id)}, ${subjectGTranslateY - minSubjectGTranslateY})`);
          }
        });
      }
      if (maxSubjectGTranslateY < 0) {
        subjectGroups.each(function (d) {
          const subjectG = d3.select(this);
          const text = subjectG.selectAll(`text#${targetID}.set-prediction-text`);
          if (!text.empty()) {
            const subjectGTranslateY = self.utils.getTransformation(subjectG.attr("transform")).translateY;
            subjectG.attr("transform", `translate(${xScale(d.id)}, ${subjectGTranslateY - maxSubjectGTranslateY})`);
          }
        });
      }
    }

    /**
     * Draw line between words that have the same id.
     * @param {String} id
     * @param {Boolean} selected
     */
    function drawConnectorLines(id, selected) {
      const points = [];
      subjectGroups.each(function (d) {
        const subjectG = d3.select(this);
        const text = subjectG.selectAll(`text#${id}.set-prediction-text`);
        if (!text.empty()) {
          const textOpacity = text.style("opacity");
          if (!textOpacity || parseFloat(textOpacity) > 0) {
            const x = xScale(d.id) + xScale.bandwidth() / 2;
            const gy = self.utils.getTransformation(subjectG.attr("transform")).translateY; // y translation of entire parent group
            const dy = parseFloat(text.attr("y")); // y position within parent group
            points.push({ x, y: gy + dy, opacity: subjectG.style("opacity") });
          }
        }
      });
      for (let i = 0; i < points.length - 1; i++) {
        const line = connectorLines
          .append("line")
          .attr("id", `${id}`)
          .attr("class", "set-connector-line")
          .attr("selected", false)
          .attr("fill", "none")
          .attr("stroke", "black")
          .attr("opacity", Math.min(points[i].opacity, points[i + 1].opacity))
          .attr("x1", points[i].x)
          .attr("y1", points[i].y)
          .attr("x2", points[i + 1].x)
          .attr("y2", points[i + 1].y);
        if (selected) line.attr("selected", true);
      }
    }

    // =============================== HELPER ============================== //

    /**
     * TODO
     */
    function redrawConnectorLines() {
      const lineIDs = new Set();
      const lines = [];
      connectorLines.selectAll("line").each(function () {
        const line = d3.select(this);
        const lid = line.attr("id");
        if (!lineIDs.has(lid)) {
          lineIDs.add(lid);
          lines.push([lid, line.attr("selected")]);
        }
        line.remove();
      });
      lines.forEach(([lid, selected]) => drawConnectorLines(lid, selected)); // re-draw connector lines
    }

    /**
     * TODO
     * @param {*} eventX
     * @param {*} eventY
     */
    function positionTooltip(eventX, eventY) {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const width = self.tooltip.node().getBoundingClientRect().width + 2;
      const height = self.tooltip.node().getBoundingClientRect().height + 2;
      const left = eventX + width + 8 >= vw ? vw - width : eventX + 8;
      const top = eventY - height - 8 <= 0 ? 0 : eventY - height - 8;
      self.tooltip.style("left", `${left}px`).style("top", `${top}px`);
    }

    /**
     * TODO
     * @param {Array} subjects list of objects; e.g., `[{sid1, s1}, {sid2, s2}, ...]`.
     * @param {Array} keep list of subject ids to keep; e.g., `[s1, s2, ...]`.
     * @returns shallow copy of filtered array.
     */
    function filterSubjects(subjects, keep) {
      const filtered = (s) => keep.includes(s.id);
      return subjects.filter(filtered);
    }

    /**
     * TODO
     * @param {Array} predictions list of subject objects mapped to prediction lists; e.g., `[{s1: [{p1, ...}, ...]}, ...]`.
     * @param {Array} keep list of subject ids to keep; e.g., `[s1, s2, ...]`.
     * @returns shallow copy of filtered array.
     */
    function filterPredictions(predictions, keep) {
      let newPredictions = predictions.filter((s) => keep.includes(s.id)); // remove predictions for filtered out parents
      if (self.controls.filterShared || self.controls.filterUnique) {
        // if filterShared, keep only predictions that have all subjects as parents
        // if filterUnique, keep only predictions with a single unique parent
        const allPredictions = newPredictions.map((s) => s.children).flat(1);
        const counts = {};
        for (const d of allPredictions) {
          counts[d.name] = counts[d.name] ? counts[d.name] + 1 : 1;
        }
        const targetCount = self.controls.filterShared ? self.plot.subjects.length : 1;
        const names = Object.keys(counts).filter((d) => counts[d] == targetCount);
        const filtered = (d) => names.includes(d.name);
        newPredictions.forEach((subject) => {
          subject.children = subject.children.filter(filtered);
        });
      }
      return newPredictions;
    }

    /**
     * TODO
     * @param {Array} predictions list of subject objects mapped to prediction lists; e.g., `[{s1: [{p1, ...}, ...]}, ...]`.
     * @param {String} method one of "method", "rank", "group-name", or "group-rank".
     */
    function sortPredictions(predictions, method) {
      const clusters = self.plot.clusters;
      predictions.forEach((subject) => {
        switch (method) {
          case "name":
            subject.children.sort((a, b) => d3.ascending(a.name, b.name));
            break;
          case "rank":
            subject.children.sort((a, b) => d3.descending(a.value, b.value));
            break;
          case "group-name":
            subject.children.sort((a, b) => d3.ascending(a.name, b.name));
            subject.children.sort((a, b) => clusters.indexOf(DC[a.name]) - clusters.indexOf(DC[b.name]));
            break;
          case "group-rank":
            subject.children.sort((a, b) => d3.descending(a.value, b.value));
            subject.children.sort((a, b) => clusters.indexOf(DC[a.name]) - clusters.indexOf(DC[b.name]));
            break;
        }
      });
    }

    /**
     * TODO
     *
     * See: https://stackoverflow.com/a/38162224
     *
     * @param {*} element
     * @param {*} text
     * @param {*} ySpacing
     * @param {*} maxWidth
     * @returns
     */
    function splitTextIntoLinesByMaxWidth(element, text, ySpacing, maxWidth) {
      // create test element to get rendered width of text
      element.innerHTML = '<tspan id="PROCESSING">busy</tspan >';
      const testElem = document.getElementById("PROCESSING");

      // split text into set of lines shorter than the max width allowed
      let line = "";
      const lines = [];
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        testElem.innerHTML = testLine;
        const testWidth = testElem.getBoundingClientRect().width;
        if (testWidth > maxWidth && i > 0) {
          lines.push(line.trim());
          line = words[i] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      testElem.remove();

      // create final html
      let html = "";
      const nlines = lines.length;
      if (nlines > 1) {
        lines.forEach((l, i) => {
          if (i == 0) {
            const y = (nlines - 1) * ySpacing;
            html += `<tspan x="0" y="${-y}" dy="10">${l}</tspan>`;
          } else {
            html += `<tspan x="0" dy="${ySpacing}">${l}</tspan>`;
          }
        });
      } else {
        html += `<tspan x="0">${lines[0]}</tspan>`;
      }

      return [html, nlines];
    }
  }
}

export default class ScatterPlot {
  constructor(utils, elem) {
    this.utils = utils;
    this.scatterPlotLegend = d3.select("#scatter-plot-legend");
    this.tooltip = d3.select("#views-tooltip");
    this.controls = {
      filterShared: false,
      filterUnique: false,
      isBeingDraggedSubjectPoint: false,
      scaleBy: "log",
    };
    this.data = {
      groups: [],
      scatterPlotData: [],
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
      interactionLayer: null,
      scatterPlot: null,
      clusters: [],
      subjects: [],
      commonPredictions: [],
      uniquePredictions: {},
      centroid: { x: null, y: null }, // center of subjects (POIs) coordinates
      margin: {
        t: 36,
        r: 36,
        b: 36,
        l: 36,
      },
    };
  }

  init() {
    const svg = this.plot.el;

    // add groups in layer order (i.e., draw element groups in this order)
    const interactionLayer = svg.append("g").attr("class", "interaction-layer");
    const scatterPlot = interactionLayer.append("g").attr("class", "scatter-plot");

    // save groups to access later
    this.plot.defs = svg.select("defs");
    this.plot.interactionLayer = interactionLayer;
    this.plot.scatterPlot = scatterPlot;
  }

  /**
   * See: https://observablehq.com/@d3/color-legend
   * @param {*} sizeScale
   * @returns
   */
  drawScatterPlotLegend(sizeScale, width) {
    const title = "Probability";
    const tickSize = 6;
    const height = 38 + tickSize;
    const marginTop = 18;
    const marginRight = 32;
    const marginBottom = 6 + tickSize;
    const marginLeft = 32;
    const tickFormat = ".3f";

    this.scatterPlotLegend.attr("height", height + marginTop + marginBottom);

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
    this.scatterPlotLegend
      .append("g")
      .selectAll("text")
      .data(tickValues)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => sizeScale(d))
      .attr("x", (d) => x(d))
      .attr("y", marginTop + 10)
      .text("ABC");

    // draw ticks
    this.scatterPlotLegend
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

  clear() {
    this.plot.scatterPlot.selectAll("*").remove(); // clear plot
    this.scatterPlotLegend.selectAll("*").remove();
  }

  render() {
    const SF = this.data.subjectsFilter; //      (List)   [sid1, sid2, ...]
    const SIK = this.data.subjectsIDKey; //      (Object) {sid1: s1, sid2: s2, ...}

    const DNK = this.data.predictionsNameKey; // (Object) {p1: pid1, p2: pid2 ...}
    const DC = this.data.predictionsClusters; // (Object) {p1: c1, p2: c1, ...}
    const DE = this.data.predictionsExtent; //   (List)   min/max values for predictions [min, max]

    const S = this.data.groups.map((sentenceGroup) => sentenceGroup.subjects).flat();
    const D = this.utils.deepCopy(this.data.scatterPlotData);

    if (SF.length < 2) return; // don't plot if less than two subjects are selected

    const self = this;

    // get clusters, subjects, and predictions
    this.plot.clusters = [...new Set(Object.values(DC))];
    this.plot.subjects = S.filter((s) => SF.includes(s.id));
    this.plot.commonPredictions = []; // list of predictions common to 2 or more subjects
    this.plot.uniquePredictions = this.plot.subjects.reduce((prev, curr) => ((prev[curr.id] = []), prev), {}); // map of predictions unique to 1 subject from parent id to prediction

    // get plot elements
    const svg = this.plot.el;
    const scatterPlot = this.plot.scatterPlot;
    const margin = this.plot.margin;

    // get height and width
    const fw = parseFloat(svg.style("width"));
    const fh = parseFloat(svg.style("height"));

    // compute scales
    const clusterColorScale = d3.scaleOrdinal(this.utils.schemeTableau20).domain(this.plot.clusters);
    let predictionPointSizeScale, predictionTextScale, connectorLineStrokeWidthScale, connectorLineOpacityScale;
    switch (self.controls.scaleBy) {
      case "log":
        predictionPointSizeScale = d3.scaleLog().domain(DE).range([2, 8]);
        predictionTextScale = d3.scaleLog().domain(DE).range([8, 16]);
        connectorLineStrokeWidthScale = d3.scaleLog().domain(DE).range([1, 4]);
        connectorLineOpacityScale = d3.scaleLog().domain(DE).range([0.1, 0.9]);
        break;
      case "lin":
        predictionPointSizeScale = d3.scaleLinear().domain(DE).range([2, 8]);
        predictionTextScale = d3.scaleLinear().domain(DE).range([8, 16]);
        connectorLineStrokeWidthScale = d3.scaleLinear().domain(DE).range([1, 4]);
        connectorLineOpacityScale = d3.scaleLinear().domain(DE).range([0.1, 0.9]);
        break;
    }

    // first draw set view legend, so SVG size scales properly
    self.drawScatterPlotLegend(predictionTextScale, fw);

    // compute square domains to fit non-square ranges
    let xDomain = [0, 1]; // base units, [0, 1]
    let yDomain = [0, 1]; // base units, [0, 1]
    let xRange = [margin.l, fw - margin.r]; // target units, in px
    let yRange = [fh - margin.b, margin.t]; // target units, in px
    let xScale, yScale;
    if (fw < fh) {
      xScale = d3.scaleLinear().domain(xDomain).range(xRange);
      const diff = fh - fw; // in px
      const adjustY = xScale.invert(diff / 2) - xScale.invert(0); // convert to base units
      yDomain = [yDomain[0] - adjustY, yDomain[1] + adjustY];
      yScale = d3.scaleLinear().domain(yDomain).range(yRange);
    } else if (fw > fh) {
      yScale = d3.scaleLinear().domain(yDomain).range(yRange);
      const diff = fw - fh; // in px
      const adjustX = yScale.invert(fh - diff / 2) - yScale.invert(fh); // convert to base units
      xDomain = [xDomain[0] - adjustX, xDomain[1] + adjustX];
      xScale = d3.scaleLinear().domain(xDomain).range(xRange);
    } else {
      // already square plot
      xScale = d3.scaleLinear().domain(xDomain).range(xRange);
      yScale = d3.scaleLinear().domain(yDomain).range(yRange);
    }

    // assign color and position to each subject (POI)
    // calculate coordinates of subjects (POIs) as vertices of a regular polygon
    // See: https://stackoverflow.com/a/7198179
    const Pn = this.plot.subjects.length;
    const r = 0.5; // radius of polygon
    const c = { x: 0.5, y: 0.5 }; // center of polygon
    const poiColorScale = Pn >= 3 && Pn <= 9 ? d3.scaleOrdinal(d3.schemeGreys[Pn]) : () => "#ccc"; // categorical color scheme
    this.plot.centroid.x = 0; // initialize to 0
    this.plot.centroid.y = 0; // initialize to 0
    for (let i = 0; i < Pn; i++) {
      const Pi = this.plot.subjects[i];
      Pi.color = poiColorScale(i);
      Pi.x = c.x + r * Math.sin(2 * Math.PI * (i / Pn));
      Pi.y = c.y + r * Math.cos(2 * Math.PI * (i / Pn));
      Pi.deg = 360 * (i / Pn); // measured clockwise from vertical (c.x, c.y + r)
      this.plot.centroid.x += Pi.x;
      this.plot.centroid.y += Pi.y;
    }
    this.plot.centroid.x /= Pn;
    this.plot.centroid.y /= Pn;

    // compute common and unique prediction positions
    computePredictionsXY();

    // clear previous plot
    scatterPlot.selectAll("*").remove();

    let subjectHull;
    let subjectPolygons;

    if (self.plot.subjects.length == 3) {
      // draw background subject polygons
      subjectPolygons = scatterPlot
        .append("g")
        .attr("class", "scatter-poi-polygons")
        .attr("stroke", "#2b2b2b")
        .attr("stroke-width", 1.5)
        .attr("paint-order", "stroke")
        .selectAll("polygon")
        .data(this.plot.subjects)
        .join("polygon")
        .attr("class", "scatter-poi-polygon")
        .attr("id", (d) => d.id)
        .attr("fill", (d) => d.color)
        .attr("points", (d, i) => getPOIPolygonString(d, i));
    } else if (self.plot.subjects.length > 3) {
      // draw convex hull around subjects
      const points = self.plot.subjects.map((s) => [xScale(s.x), yScale(s.y)]);
      const hull = d3.polygonHull(points);
      subjectHull = scatterPlot
        .append("path")
        .attr("stroke", "#2b2b2b")
        .attr("stroke-width", 1.5)
        .attr("paint-order", "stroke")
        .attr("fill", "none")
        .attr("d", `M${hull.join("L")}Z`);
    }

    // draw subject text
    const subjectText = scatterPlot
      .append("g")
      .attr("class", "scatter-poi-texts")
      .attr("font-size", 10)
      .attr("font-weight", 900)
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .selectAll("text")
      .data(this.plot.subjects)
      .join("text")
      .attr("class", "scatter-poi-text")
      .attr("id", (d) => d.id)
      .style("transform-box", "fill-box")
      .style("transform-origin", "center")
      .style("transform", (d) => `rotate(${d.deg}deg) ${d.deg >= 90 && d.deg <= 270 ? "scale(-1,-1)" : ""}`)
      .attr("x", (d) => xScale(getPOITextPosition(d, "x")))
      .attr("y", (d) => yScale(getPOITextPosition(d, "y")))
      .text((d) => `${d.name} (${this.plot.uniquePredictions[d.id].length})`)
      .on("mouseenter", mouseenterSubjectText)
      .on("mousemove", mousemoveSubjectText)
      .on("mouseleave", mouseleaveSubjectText);

    // draw subject points
    const drag = d3
      .drag()
      .on("start", dragStartSubjectPoint)
      .on("drag", dragSubjectPoint)
      .on("end", dragEndSubjectPoint);
    const subjectPoints = scatterPlot
      .append("g")
      .attr("class", "scatter-poi-points")
      .attr("fill", "#2b2b2b")
      .attr("stroke", "#e6e6e6")
      .attr("stroke-width", 1.5)
      .attr("paint-order", "stroke")
      .selectAll("circle")
      .data(this.plot.subjects)
      .join("circle")
      .attr("class", "scatter-poi-point")
      .attr("id", (d) => d.id)
      .attr("transform", (d) => `translate(${xScale(d.x)},${yScale(d.y)})`)
      .attr("r", 6)
      .call(drag);

    // create connector line group
    const connectorLines = scatterPlot.append("g").attr("class", "connector-line");

    // draw common prediction points
    const predictionPoints = scatterPlot
      .append("g")
      .attr("class", "scatter-common-prediction-points")
      .attr("fill", "#2b2b2b")
      .attr("stroke", "#e6e6e6")
      .attr("stroke-width", 1.5)
      .attr("paint-order", "stroke")
      .selectAll("rect")
      .data(this.plot.commonPredictions)
      .join("rect")
      .attr("class", "scatter-common-prediction-point")
      .attr("id", (d) => DNK[d.name]) // get unique prediction id
      .attr("transform", (d) => `translate(${xScale(d.x) - d.width / 2},${yScale(d.y) - d.height / 2})`) // in px
      .attr("fill", (d) => (this.plot.clusters.length > 1 ? clusterColorScale(DC[d.name]) : "black"))
      .attr("width", (d) => `${d.width}px`)
      .attr("height", (d) => `${d.height}px`)
      .on("mouseenter", mouseenterPrediction)
      .on("mousemove", mousemovePrediction)
      .on("mouseleave", mouseleavePrediction);

    // draw common prediction text
    const predictionText = scatterPlot
      .append("g")
      .attr("class", "scatter-common-prediction-texts")
      .attr("font-weight", 700)
      .attr("font-family", "sans-serif")
      .attr("fill", "black")
      .attr("stroke", "white")
      .attr("stroke-width", "3px")
      .attr("paint-order", "stroke")
      .selectAll("text")
      .data(this.plot.commonPredictions)
      .join("text")
      .attr("class", "scatter-common-prediction-text")
      .attr("id", (d) => DNK[d.name]) // get unique prediction id
      .attr("font-size", (d) => `${predictionTextScale(d.maxValue)}px`)
      .attr("occluded", false)
      .attr("transform", (d) => `translate(${xScale(d.x)},${yScale(d.y)})`)
      .attr("dx", "3px")
      .attr("dy", "-3px")
      .text((d) => d.name)
      .on("mouseenter", mouseenterPrediction)
      .on("mousemove", mousemovePrediction)
      .on("mouseleave", mouseleavePrediction);

    // remove overlapping text labels
    setTextOccluded(scatterPlot, ".scatter-common-prediction-text");

    // ========================== HOVER ==================================== //

    // subjects

    function mouseenterSubjectText(event, d) {
      if (!self.controls.isBeingDraggedSubjectPoint) {
        let sentence = "";
        for (let i = 0; i < self.data.groups.length; i++) {
          const sentenceGroup = self.data.groups[i];
          const groupSubjectIDs = sentenceGroup.subjects.map((subject) => subject.id);
          if (groupSubjectIDs.includes(d.id)) {
            sentence = sentenceGroup.template.replace("[subject]", d.name);
            break;
          }
        }
        const values = self.plot.uniquePredictions[d.id];
        const strings = [`<span><b>"${sentence}"</b></span>`, `<span>${values.length} unique predictions:</span>`];
        strings.push(...values.map((x) => `<span>&#8250; ${x.name} (${DC[x.name]}): ${x[d.id].toFixed(3)}</span>`));
        self.tooltip.html(strings.join("<br />"));
        self.tooltip.style("display", "block").style("opacity", 1).style("font-size", "10px");
      }
    }
    function mousemoveSubjectText(event, d) {
      if (!self.controls.isBeingDraggedSubjectPoint) {
        positionTooltip(event.x, event.y);
      }
    }
    function mouseleaveSubjectText(event, d) {
      if (!self.controls.isBeingDraggedSubjectPoint) {
        self.tooltip.html("");
        self.tooltip.style("display", "none").style("opacity", 0).style("font-size", "0.9rem");
      }
    }

    // predictions

    function mouseenterPrediction(event, d) {
      if (!self.controls.isBeingDraggedSubjectPoint) {
        d3.selectAll(`#${this.getAttribute("id")}`).attr("hovered", true);
        d3.selectAll(`#cluster-${DC[d.name]}`).style("font-weight", 900); // don't override attributes
        let strings = [];
        for (let i = 0; i < self.plot.subjects.length; i++) {
          const Pi = self.plot.subjects[i];
          const dij = d[Pi.id];
          if (dij > 0) {
            let sentence = "";
            for (let i = 0; i < self.data.groups.length; i++) {
              const sentenceGroup = self.data.groups[i];
              const groupSubjectIDs = sentenceGroup.subjects.map((subject) => subject.id);
              if (groupSubjectIDs.includes(Pi.id)) {
                sentence = sentenceGroup.template.replace("[subject]", Pi.name);
                break;
              }
            }
            const html = `
              <span><b>"${sentence}"</b></span>
              <br />
              <span>&#8250; ${d.name} (${DC[d.name]}): ${dij.toFixed(3)}</span>`;
            strings.push(html);
          }
        }
        self.tooltip.html(strings.join("<br />"));
        self.tooltip.style("display", "block").style("opacity", 1);
        drawConnectorLines(d); // draw connector line
      }
    }
    function mousemovePrediction(event, d) {
      if (!self.controls.isBeingDraggedSubjectPoint) {
        positionTooltip(event.x, event.y);
      }
    }
    function mouseleavePrediction(event, d) {
      if (!self.controls.isBeingDraggedSubjectPoint) {
        d3.selectAll(`#${this.getAttribute("id")}`).attr("hovered", "");
        d3.selectAll(`#cluster-${DC[d.name]}`).style("font-weight", ""); // don't override attributes
        self.tooltip.html("");
        self.tooltip.style("display", "none").style("opacity", 0);
        connectorLines.selectAll("*").remove(); // remove connector line
      }
    }

    // =============================== DRAG ================================ //

    // subjects

    let draggedSubjectStartX;
    let draggedSubjectStartY;

    function dragStartSubjectPoint(event, d) {
      self.controls.isBeingDraggedSubjectPoint = true;
      draggedSubjectStartX = d.x;
      draggedSubjectStartY = d.y;
      d3.select(this).attr("dragged", true);
    }
    function dragSubjectPoint(event, d) {
      // compute new x, y and assign to target
      // event.x == 0 is in the middle, event.y == 0 is at the top
      const width = xScale(1) - xScale(0);
      const height = yScale(0) - yScale(1);
      d.x = event.x / width + draggedSubjectStartX;
      d.y = -event.y / height + draggedSubjectStartY;
      // recompute centroid
      self.plot.centroid.x = 0;
      self.plot.centroid.y = 0;
      self.plot.subjects.forEach((s) => {
        self.plot.centroid.x += s.x;
        self.plot.centroid.y += s.y;
      });
      self.plot.centroid.x /= self.plot.subjects.length;
      self.plot.centroid.y /= self.plot.subjects.length;
      // recompute degrees from vertical
      // See: https://math.stackexchange.com/a/1596518
      self.plot.subjects.forEach((s) => {
        const ax = self.plot.centroid.x;
        const ay = self.plot.centroid.y;
        const bx = s.x;
        const by = s.y;
        s.deg = Math.atan2(bx - ax, by - ay) * (180 / Math.PI);
        if (s.deg < 0) s.deg += 360;
      });
      // recompute prediction positions
      self.plot.commonPredictions = [];
      self.plot.uniquePredictions = self.plot.subjects.reduce((prev, curr) => ((prev[curr.id] = []), prev), {});
      computePredictionsXY();
      // update data bindings
      if (self.plot.subjects.length == 3) subjectPolygons.data(self.plot.subjects);
      subjectText.data(self.plot.subjects);
      subjectPoints.data(self.plot.subjects);
      predictionPoints.data(self.plot.commonPredictions);
      predictionText.data(self.plot.commonPredictions);
      // update the vis
      update();
    }
    function dragEndSubjectPoint() {
      self.controls.isBeingDraggedSubjectPoint = false;
      d3.select(this).attr("dragged", false);
      predictionText.attr("occluded", false);
      setTextOccluded(scatterPlot, ".scatter-common-prediction-text");
    }

    // =============================== DRAW ================================ //

    /**
     * TODO
     */
    function update() {
      if (self.plot.subjects.length == 3) {
        subjectPolygons.attr("points", (d, i) => getPOIPolygonString(d, i));
      } else if (self.plot.subjects.length > 3) {
        const points = self.plot.subjects.map((s) => [xScale(s.x), yScale(s.y)]);
        const hull = d3.polygonHull(points);
        subjectHull.attr("d", `M${hull.join("L")}Z`);
      }
      subjectText.style("transform", (d) => `rotate(${d.deg}deg) ${d.deg >= 90 && d.deg <= 270 ? "scale(-1,-1)" : ""}`);
      subjectText.attr("x", (d) => xScale(getPOITextPosition(d, "x")));
      subjectText.attr("y", (d) => yScale(getPOITextPosition(d, "y")));
      subjectPoints.attr("transform", (d) => `translate(${xScale(d.x)},${yScale(d.y)})`);
      predictionPoints.attr("transform", (d) => `translate(${xScale(d.x) - 3},${yScale(d.y) - 3})`);
      predictionText.attr("transform", (d) => `translate(${xScale(d.x)},${yScale(d.y)})`);
    }

    /**
     * Draw lines from word to subjects.
     * @param {*} d
     */
    function drawConnectorLines(d) {
      const x1 = d.x;
      const y1 = d.y;
      for (let i = 0; i < self.plot.subjects.length; i++) {
        const Pi = self.plot.subjects[i];
        const dij = d[Pi.id];
        if (dij > 0) {
          const x2 = Pi.x;
          const y2 = Pi.y;
          connectorLines
            .append("line")
            .attr("stroke", "red")
            .attr("stroke-width", connectorLineStrokeWidthScale(dij))
            .attr("opacity", connectorLineOpacityScale(dij))
            .attr("x1", xScale(x1))
            .attr("y1", yScale(y1))
            .attr("x2", xScale(x2))
            .attr("y2", yScale(y2));
        }
      }
    }

    /**
     * occlusion
     * - See: https://observablehq.com/@fil/occlusion
     *
     * @param {*} svg
     * @param {*} against
     */
    function setTextOccluded(svg, against = "text") {
      const texts = [];

      svg.selectAll(against).each((d, i, e) => {
        const bbox = e[i].getBoundingClientRect();
        texts.push({
          name: e[i].nodeName,
          node: e[i],
          text: d,
          bbox,
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
        });
      });

      const filled = [];
      for (const d of texts) {
        const isOccluded = d.name === "text" && filled.some((e) => isIntersected(d, e));
        if (isOccluded) {
          d3.select(d.node).attr("occluded", true);
        } else {
          filled.push(d);
        }
      }
    }

    // ============================= HELPER ================================ //

    /**
     * calculate the final position pi and score di for each predicted word (document).
     *
     * Adapted from Olsen et al. 1993 "Visualization of a document collection: The VIBE system."
     */
    function computePredictionsXY() {
      const Dn = D.length;
      const Pn = self.plot.subjects.length;

      for (let i = 0; i < Dn; i++) {
        let S = []; // word score di and POI position pi pairs => [(da, pa), (db, pb), ..., (dn, pn)]
        const di = D[i]; // predicted word D[i]

        // populate S for all word score / POI pairs where word score is above a threshold
        let maxValue = 0;
        for (let j = 0; j < Pn; j++) {
          const Pj = self.plot.subjects[j]; // POI j
          const dij = di[Pj.id]; // D[i][j] is the predicted word score for POI j
          if (dij > 0) {
            maxValue = Math.max(dij, maxValue);
            const pj = { x: Pj.x, y: Pj.y }; // position of POI j in (x, y)
            S.push([dij, pj, Pj.id]);
          }
        }
        const width = predictionPointSizeScale(maxValue);
        const height = predictionPointSizeScale(maxValue);
        di["maxValue"] = maxValue;
        di["width"] = width;
        di["height"] = height;

        // neither unique nor shared are selected and word has multiple POI scores
        const a = !(self.controls.filterUnique || self.controls.filterShared) && S.length > 1;
        // unique is not selected, shared is selected, and word has score with multiple POI
        const b = !self.controls.filterUnique && self.controls.filterShared && S.length == Pn;

        if (a || b) {
          // get final position of predicted word D[i] by calculating score di and
          // position pi between pairs in S and putting new pair (di, pi) back in S
          let Sn = S.length;
          while (Sn > 1) {
            const a = S.shift(); // remove element S[0] from S
            const b = S.shift(); // remove element S[1] from S

            const da = a[0]; // score for POI a
            const db = b[0]; // score for POI b
            const di = da + db; // new score value for intermediate POI i

            const pa = a[1]; // position of POI a in (x, y)
            const pb = b[1]; // position of POI b in (x, y)\

            // const L = Math.sqrt(Math.pow(pb.x - pa.x, 2) + Math.pow(pb.y - pa.y, 2)); // distance between pa and pb
            // const li = (L * db) / di; // distance from pa to pi
            // const pi = { x: (1 - li / L) * pa.x + (li / L) * pb.x, y: (1 - li / L) * pa.y + (li / L) * pb.y }; // position of pi in (x, y)

            const t = db / di; // ratio of distance from pa to pi
            const pi = { x: (1 - t) * pa.x + t * pb.x, y: (1 - t) * pa.y + t * pb.y }; // position of pi in (x, y)

            Sn = S.push([di, pi]); // add (di, pi) to S and get new length
          }
          // save final point with predicted word data and final position
          const p = S.shift();
          self.plot.commonPredictions.push({ ...di, x: p[1].x, y: p[1].y });
        } else if (S.length == 1) {
          // final position of predicted word D[i] is the same as subject POI
          const p = S.shift();
          self.plot.uniquePredictions[p[2]].push(di);
        }
      }
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
     *
     * convert truncated modulo to floored modulo
     * - See: https://stackoverflow.com/a/17323608
     * @param {*} d
     * @param {*} i
     * @returns
     */
    function getPOIPolygonString(d, i) {
      const Pn = self.plot.subjects.length;
      // start at POI point
      const x1 = xScale(d.x);
      const y1 = yScale(d.y);
      // move to midpoint b/w current and next POI point
      const x2 = xScale((d.x + self.plot.subjects[(i + 1) % Pn].x) / 2);
      const y2 = yScale((d.y + self.plot.subjects[(i + 1) % Pn].y) / 2);
      // move to centroid
      const x3 = xScale(self.plot.centroid.x);
      const y3 = yScale(self.plot.centroid.y);
      // move to midpoint b/w current and prev POI point
      const x4 = xScale((d.x + self.plot.subjects[(i - 1 + Pn) % Pn].x) / 2);
      const y4 = yScale((d.y + self.plot.subjects[(i - 1 + Pn) % Pn].y) / 2);
      // automatically close the polygon
      return `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
    }

    /**
     * compute point along line a certain distance away from another point
     * - See: https://math.stackexchange.com/a/1630886
     * @param {*} d
     * @param {*} axis
     * @returns
     */
    function getPOITextPosition(d, axis) {
      const dist = 15; // in px; distance to move text away from centroid
      const x0 = d.x;
      const y0 = d.y;
      const x1 = self.plot.centroid.x;
      const y1 = self.plot.centroid.y;
      const width = xScale(1) - xScale(0);
      const height = yScale(0) - yScale(1);
      const a = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
      const at = dist / (axis == "x" ? width : height);
      const t = -at / a;
      return (1 - t) * d[axis] + t * self.plot.centroid[axis];
    }

    /**
     * TODO
     * @param {*} a
     * @param {*} b
     * @returns
     */
    function isIntersected(a, b) {
      return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
    }
  }
}

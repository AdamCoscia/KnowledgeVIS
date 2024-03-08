export default {
  /**
   * - See: https://public.tableau.com/views/TableauColors/ColorPaletteswithRGBValues?%3Aembed=y&%3AshowVizHome=no&%3Adisplay_count=y&%3Adisplay_static_image=y
   */
  schemeTableau20: [
    // dark 10
    "rgb(31 119 180)",
    "rgb(255 127 14)",
    "rgb(44 160 44)",
    "rgb(214 39 40)",
    "rgb(148 103 189)",
    "rgb(140 86 75)",
    "rgb(227 119 194)",
    "rgb(127 127 127)",
    "rgb(188 189 34)",
    "rgb(23 190 207)",
    // light 10
    "rgb(174 199 232)",
    "rgb(255 187 120)",
    "rgb(152 223 138)",
    "rgb(255 152 150)",
    "rgb(197 176 213)",
    "rgb(196 156 148)",
    "rgb(247 182 210)",
    "rgb(199 199 199)",
    "rgb(219 219 141)",
    "rgb(158 218 229)",
  ],

  /**
   * Create element from string.
   * - See: https://stackoverflow.com/a/35385518
   *
   * @param {String} templateString representing a single element
   * @returns {Element}
   */
  createElementFromTemplate: function createElementFromTemplate(templateString) {
    const template = document.createElement("template");
    const html = templateString.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
  },

  /**
   * Full height of an element, including border, padding, margin.
   * - See: https://stackoverflow.com/a/23749355
   *
   * @param {Element} Element
   * @returns
   */
  getAbsoluteHeight: function getAbsoluteHeight(element) {
    const styles = window.getComputedStyle(element);
    const margin = parseFloat(styles["marginTop"]) + parseFloat(styles["marginBottom"]);
    return Math.ceil(element.offsetHeight + margin);
  },

  /**
   * Full width of an element, including border, padding, margin.
   * - See: https://stackoverflow.com/a/23749355
   *
   * @param {Element} Element
   * @returns
   */
  getAbsoluteWidth: function getAbsoluteWidth(element) {
    const styles = window.getComputedStyle(element);
    const margin = parseFloat(styles["marginLeft"]) + parseFloat(styles["marginRight"]);
    return Math.ceil(element.offsetWidth + margin);
  },

  /**
   * Creates object of transformation values from transform string.
   * - See: https://stackoverflow.com/a/38230545
   *
   * @param {*} transform
   * @returns
   */
  getTransformation: function getTransformation(transform) {
    // Create a dummy g for calculation purposes only. This will never
    // be appended to the DOM and will be discarded once this function
    // returns.
    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // Set the transform attribute to the provided string value.
    g.setAttributeNS(null, "transform", transform);

    // consolidate the SVGTransformList containing all transformations
    // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
    // its SVGMatrix.
    var matrix = g.transform.baseVal.consolidate().matrix;

    // Below calculations are taken and adapted from the private function
    // transform/decompose.js of D3's module d3-interpolate.
    var { a, b, c, d, e, f } = matrix; // ES6, if this doesn't work, use below assignment
    // var a=matrix.a, b=matrix.b, c=matrix.c, d=matrix.d, e=matrix.e, f=matrix.f; // ES5
    var scaleX, scaleY, skewX;
    if ((scaleX = Math.sqrt(a * a + b * b))) (a /= scaleX), (b /= scaleX);
    if ((skewX = a * c + b * d)) (c -= a * skewX), (d -= b * skewX);
    if ((scaleY = Math.sqrt(c * c + d * d))) (c /= scaleY), (d /= scaleY), (skewX /= scaleY);
    if (a * d < b * c) (a = -a), (b = -b), (skewX = -skewX), (scaleX = -scaleX);
    return {
      translateX: e,
      translateY: f,
      rotate: (Math.atan2(b, a) * 180) / Math.PI,
      skewX: (Math.atan(skewX) * 180) / Math.PI,
      scaleX: scaleX,
      scaleY: scaleY,
    };
  },

  /**
   * Deep copies object.
   * - See: https://developer.mozilla.org/en-US/docs/Glossary/Deep_copy
   * @param {*} obj
   * @returns
   */
  deepCopy: function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Removes DOM element if it exists.
   * - See: https://stackoverflow.com/a/65638130
   * @param {*} parent
   * @param {*} selector
   */
  removeElementIfExists: function removeElementIfExists(parent, selector = null) {
    if (selector) {
      const x = parent.querySelector(selector);
      if (x) x.remove();
    } else {
      if (parent) parent.remove();
    }
  },

  /**
   * Handles fetch errors.
   * @param {*} error
   */
  handleFetchError: function handleFetchError(error) {
    if (error.response) {
      // Request made and server responded
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log("Error", error.message);
      console.log(error);
    }
  },

  /**
   * Simple throttle function.
   * See: https://stackoverflow.com/a/27078401
   * @param {*} callback
   * @param {*} limit
   * @returns
   */
  throttle: function throttle(callback, limit) {
    var waiting = false;
    return function () {
      if (!waiting) {
        callback.apply(this, arguments);
        waiting = true;
        setTimeout(function () {
          waiting = false;
        }, limit);
      }
    };
  },

  /**
   * Simple debounce function.
   * See: https://stackoverflow.com/a/24004942
   * @param {*} func
   * @param {*} wait
   * @param {*} immediate
   * @returns
   */
  debounce: function debounce(func, wait, immediate) {
    var timeout;
    return function () {
      var context = this;
      var args = arguments;
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      }, wait);
      if (callNow) func.apply(context, args);
    };
  },
};

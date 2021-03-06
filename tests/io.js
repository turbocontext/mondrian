// Generated by CoffeeScript 1.6.3
/*

  io
  
  The goal of this is an IO that can take anything that could
  conceivably be SVG and convert it to Monsvg.
*/


(function() {
  var SVG,
    __hasProp = {}.hasOwnProperty;

  ui.io = {
    parse: function(input, makeNew) {
      var $svg, bounds, parsed, svg, viewbox;
      if (makeNew == null) {
        makeNew = true;
      }
      $svg = this.findSVGRoot(input);
      svg = $svg[0];
      bounds = this.getBounds($svg);
      if (bounds.width == null) {
        bounds.width = 1000;
      }
      if (bounds.height == null) {
        bounds.height = 1000;
      }
      if (makeNew) {
        ui["new"](bounds.width, bounds.height);
      }
      parsed = this.recParse($svg);
      viewbox = svg.getAttribute("viewBox");
      if (viewbox) {
        viewbox = viewbox.split(" ");
        viewbox = new Bounds(viewbox[0], viewbox[1], viewbox[2], viewbox[3]);
      }
      return parsed;
    },
    getBounds: function(input) {
      var $svg, height, svg, viewbox, width;
      $svg = this.findSVGRoot(input);
      svg = $svg[0];
      width = svg.getAttribute("width");
      height = svg.getAttribute("height");
      viewbox = svg.getAttribute("viewBox");
      if (width == null) {
        if (viewbox != null) {
          width = viewbox.split(" ")[2];
        } else {
          console.warn("No width, defaulting to 1000");
          width = 1000;
        }
      }
      if (height == null) {
        if (viewbox != null) {
          height = viewbox.split(" ")[3];
        } else {
          console.warn("No height, defaulting to 1000");
          height = 1000;
        }
      }
      width = parseFloat(width);
      height = parseFloat(height);
      if (isNaN(width)) {
        console.warn("Width is NaN, defaulting to 1000");
        width = 1000;
      }
      if (isNaN(height)) {
        console.warn("Width is NaN, defaulting to 1000");
        height = 1000;
      }
      return new Bounds(0, 0, parseFloat(width), parseFloat(height));
    },
    recParse: function(container) {
      var elem, inside, monsvgs, parsed, parsedChildren, results, _i, _len, _ref;
      results = [];
      _ref = container.children();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (elem.nodeName === "defs") {
          continue;
          inside = this.recParse($(elem));
          results = results.concat(inside);
        } else if (elem.nodeName === "g") {
          parsedChildren = this.recParse($(elem));
          results = results.concat(parsedChildren);
        } else {
          parsed = this.parseElement(elem);
          if (parsed === false) {
            continue;
          }
          if (parsed instanceof Monsvg) {
            results.push(parsed);
          } else if (parsed instanceof Object && (parsed["xlink:href"] != null)) {
            parsed.reference = true;
            results.push(parsed);
          }
        }
      }
      monsvgs = results.filter(function(e) {
        return e instanceof Monsvg;
      });
      return results;
    },
    /*
    fillReferences: (aloe, rootaloe) ->
      for elem in aloe
        if elem.reference
          id = elem["xlink:href"].replace("#", "")
          referencing = rootaloe.filter (e) ->
            e.data?.id is id
          if referencing.length == 1
            clone = referencing[0].clone()
            # Replace the reference with a clone of what it is referencing.
            aloe = aloe.replace(elem, clone)
            if elem.transform?
    
              clone.applyTransform(elem.transform)
              clone.commit()
            if elem.x?
              clone.nudge(parseFloat(elem.x), 0)
            if elem.y?
              clone.nudge(0, -parseFloat(elem.y))
    
        else if elem instanceof Group
          elem.elements = @fillReferences(elem.elements, rootaloe)
    
      aloe
    */

    findSVGRoot: function(input) {
      var $svg;
      if (input instanceof Array) {
        return input[0].$rep.closest("svg");
      } else if (input instanceof $) {
        input = input.filter('svg');
        if (input.is("svg")) {
          return input;
        } else {
          $svg = input.find("svg");
          if ($svg.length === 0) {
            throw new Error("io: No svg node found.");
          } else {
            return $svg[0];
          }
        }
      } else {
        return this.findSVGRoot($(input));
      }
    },
    parseElement: function(elem) {
      var $elem, attr, attrs, classes, data, key, result, transform, type, virgin, virgins;
      classes = {
        'path': Path,
        'text': Text
      };
      virgins = {
        'rect': Rect,
        'ellipse': Ellipse,
        'polygon': Polygon,
        'polyline': Polyline
      };
      if (elem instanceof $) {
        $elem = elem;
        elem = elem[0];
      }
      attrs = elem.attributes;
      transform = null;
      for (key in attrs) {
        if (!__hasProp.call(attrs, key)) continue;
        attr = attrs[key];
        if (attr.name === "transform") {
          transform = attr.value;
        }
      }
      data = this.makeData(elem);
      type = elem.nodeName.toLowerCase();
      if ((classes[type] != null) || (virgins[type] != null)) {
        result = null;
        if (classes[type] != null) {
          result = new classes[elem.nodeName.toLowerCase()](data);
          if (type === "text") {
            result.setContent(elem.textContent);
          }
        } else if (virgins[type] != null) {
          virgin = new virgins[elem.nodeName.toLowerCase()](data);
          result = virgin.convertToPath();
          result.virgin = virgin;
        }
        console.log(transform);
        if (transform && elem.nodeName.toLowerCase() !== "text") {
          result.carryOutTransformations(transform);
          delete result.data.transform;
          result.rep.removeAttribute("transform");
          result.commit();
        }
        return result;
      } else if (type === "use") {
        return false;
      } else {
        return null;
      }
    },
    makeData: function(elem) {
      var attrs, blacklist, blacklistCheck, data, key, val;
      blacklist = ["inkscape", "sodipodi", "uuid"];
      blacklistCheck = function(key) {
        var x, _i, _len;
        for (_i = 0, _len = blacklist.length; _i < _len; _i++) {
          x = blacklist[_i];
          if (key.indexOf(x) > -1) {
            return false;
          }
        }
        return true;
      };
      attrs = elem.attributes;
      data = {};
      for (key in attrs) {
        val = attrs[key];
        key = val.name;
        val = val.value;
        if (key === "") {
          continue;
        }
        if (key === "style" && elem.nodeName !== "text") {
          data = this.applyStyles(data, val);
        } else if ((val != null) && blacklistCheck(key)) {
          if (/^\d+$/.test(val)) {
            val = float(val);
          }
          data[key] = val;
        }
      }
      return data;
    },
    applyStyles: function(data, styles) {
      var blacklist, key, style, val, _i, _len;
      blacklist = ["display", "transform"];
      styles = styles.split(";");
      for (_i = 0, _len = styles.length; _i < _len; _i++) {
        style = styles[_i];
        style = style.split(":");
        key = style[0];
        val = style[1];
        if (blacklist.has(key)) {
          continue;
        }
        data[key] = val;
      }
      return data;
    },
    parseAndAppend: function(input, makeNew) {
      var parsed;
      parsed = this.parse(input, makeNew);
      parsed.map(function(elem) {
        return elem.appendTo('#main');
      });
      ui.refreshAfterZoom();
      return parsed;
    },
    prepareForExport: function() {
      var elem, _i, _len, _ref, _results;
      _ref = ui.elements;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (elem.type === "path") {
          if (elem.virgin != null) {
            elem.virginMode();
          }
        }
        _results.push(typeof elem.cleanUpPoints === "function" ? elem.cleanUpPoints() : void 0);
      }
      return _results;
    },
    cleanUpAfterExport: function() {
      var elem, _i, _len, _ref, _results;
      _ref = ui.elements;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (elem.type === "path") {
          if (elem.virgin != null) {
            _results.push(elem.editMode());
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    makeFile: function() {
      var attr, blacklist, main, _i, _len;
      this.prepareForExport();
      main = new XMLSerializer().serializeToString(ui.dom.main);
      this.cleanUpAfterExport();
      main = main.replace(/>/gi, ">\n");
      blacklist = ["uuid"];
      for (_i = 0, _len = blacklist.length; _i < _len; _i++) {
        attr = blacklist[_i];
        main = main.replace(new RegExp(attr + '\\=\\"\[\\d\\w\]*\\"', 'gi'), '');
      }
      return "<!-- Made in Mondrian.io -->\n" + main;
    },
    makeBase64: function() {
      return btoa(this.makeFile());
    },
    makeBase64URI: function() {
      return "data:image/svg+xml;charset=utf-8;base64," + (this.makeBase64());
    },
    makePNGURI: function(elements, maxDimen) {
      var bounds, context, elem, s, sandbox, _i, _len;
      if (elements == null) {
        elements = ui.elements;
      }
      if (maxDimen == null) {
        maxDimen = void 0;
      }
      sandbox = ui.dom.pngSandbox;
      context = sandbox.getContext("2d");
      if (elements.length) {
        bounds = this.getBounds(elements);
      } else {
        bounds = this.getBounds(ui.dom.main);
      }
      sandbox.setAttribute("width", bounds.width);
      sandbox.setAttribute("height", bounds.height);
      if (maxDimen != null) {
        s = Math.max(context.canvas.width, context.canvas.height) / maxDimen;
        context.canvas.width /= s;
        context.canvas.height /= s;
        context.scale(1 / s, 1 / s);
      }
      if (typeof elements === "string") {
        elements = this.parse(elements, false);
      }
      for (_i = 0, _len = elements.length; _i < _len; _i++) {
        elem = elements[_i];
        elem.drawToCanvas(context);
      }
      return sandbox.toDataURL("png");
    }
  };

  /*
  
    SVG representation class/API
  */


  SVG = (function() {
    function SVG(contents) {
      this._ensureDoc(contents);
      this._svgRoot = this.doc.getElementByTagName('svg');
      if (this._svgRoot.length === 0) {
        throw new Error('No svg element found');
      }
      this._buildMetadata();
      this._buildElements();
    }

    SVG.prototype._ensureDoc = function(contents) {
      if (typeof contents === 'string') {
        return this.doc = new DOMParser().parseFromString(contents, this.MIMETYPE);
      } else if (contents.documentURI != null) {
        return this.doc = contents;
      } else {
        throw new Error('Bad input');
      }
    };

    SVG.prototype._buildMetadata = function() {};

    SVG.prototype._buildElements = function() {};

    SVG.prototype.elements = [];

    SVG.prototype.toString = function() {
      return new XMLSerializer().serializeToString(this.doc);
    };

    SVG.prototype.appendTo = function(selector) {
      return q(selector).appendChild(this._svgRoot);
    };

    SVG.prototype.MIMETYPE = 'image/svg+xml';

    return SVG;

  })();

  window.SVG = SVG;

  console.log("SUP");

}).call(this);

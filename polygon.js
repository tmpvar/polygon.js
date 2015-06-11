
if (typeof require !== 'undefined') {
  var Vec2 = require('vec2');
  var segseg = require('segseg');
  var Line2 = require('line2');
  var polygonBoolean = require('2d-polygon-boolean');
  var selfIntersections = require('2d-polygon-self-intersections');
}

var PI = Math.PI;
var TAU = PI*2;
var toTAU = function(rads) {
  if (rads<0) {
    rads += TAU;
  }

  return rads;
};

var isArray = function (a) {
  return Object.prototype.toString.call(a) === "[object Array]";
}

var isFunction = function(a) {
  return typeof a === 'function';
}

var defined = function(a) {
  return typeof a !== 'undefined';
}


function Polygon(points) {
  if (points instanceof Polygon) {
    return points;
  }

  if (!(this instanceof Polygon)) {
    return new Polygon(points);
  }

  if (!Array.isArray(points)) {
    points = (points) ? [points] : [];
  }

  this.points = points.map(function(point) {
    if (Array.isArray(point)) {
      return Vec2.fromArray(point);
    } else if (!(point instanceof Vec2)) {
      if (typeof point.x !== 'undefined' &&
          typeof point.y !== 'undefined')
      {
        return Vec2(point.x, point.y);
      }
    } else {
      return point;
    }
  });
}

Polygon.prototype = {
  each : function(fn) {
    for (var i = 0; i<this.points.length; i++) {
      if (fn.call(this, this.point(i-1), this.point(i), this.point(i+1), i) === false) {
        break;
      }
    }
    return this;
  },

  insert : function (vec, index) {
    this.points.splice(index, 0, vec);
  },

  point : function(idx) {
    var el = idx%(this.points.length);
    if (el<0) {
      el = this.points.length + el;
    }

    return this.points[el];
  },

  dedupe : function(returnNew) {
    var seen = {};
    // TODO: make this a tree
    var points = this.points.filter(function(a) {
      var key = a.x + ':' + a.y;
      if (!seen[key]) {
        seen[key] = true;
        return true;
      }
    });

    if (returnNew) {
      return new Polygon(points);
    } else {
      this.points = points;
      return this;
    }
  },

  remove : function(vec) {
    if (typeof vec === 'number') {
      this.points.splice(vec, 1);
    } else {
      this.points = this.points.filter(function(point) {
        return point!==vec;
      });
    }
    return this;
  },

  // Remove identical points occurring one after the other
  clean : function(returnNew) {
    var last = this.point(-1);

    var points = this.points.filter(function(a) {
      var ret = false;
      if (!last.equal(a)) {
        ret = true;
      }

      last = a;
      return ret;
    });

    if (returnNew) {
      return new Polygon(points);
    } else {
      this.points = points
      return this;
    }
  },

  simplify : function() {
    var clean = function(v) {
      return Math.round(v * 10000)/10000;
    }

    var collinear = function(a, b, c) {
      var r = a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y);
      return clean(r) === 0;
    };

    this.points = this.points.filter(Boolean);

    var newPoly = [];
    for (var i = 0; i<this.points.length; i++) {
      var p = this.point(i-1);
      var n = this.point(i+1);
      var c = this.point(i);

      var angle = c.subtract(p, true).angleTo(c.subtract(n, true));

      if (!collinear(p, c, n) && clean(angle)) {
        newPoly.push(c);
      }
    }

    this.points = newPoly;
    return this;
  },

  winding : function() {
    return this.area() > 0;
  },

  rewind : function(cw) {
    cw = !!cw;
    var winding = this.winding();
    if (winding !== cw) {
      this.points.reverse();
    }
    return this;
  },

  area : function() {
    var area = 0;
    var first = this.point(0);

    this.each(function(prev, current, next, idx) {
      if (idx<2) { return; }

      var edge1 = first.subtract(current, true);
      var edge2 = first.subtract(prev, true);
      area += ((edge1.x * edge2.y) - (edge1.y * edge2.x));
    });

    return area/2;
  },

  closestPointTo : function(vec) {
    var points = [],
        l = this.points.length,
        dist = Infinity,
        found = null,
        foundIndex = 0,
        foundOnPoint = false,
        i;

    for (i=0; i<l; i++) {

      var a = this.point(i-1);
      var b = this.point(i);

      // handle closed loops
      if (a.equal(b)) {
        continue;
      }

      var ab = b.subtract(a, true);
      var veca = vec.subtract(a, true);
      var vecadot = veca.dot(ab);
      var abdot = ab.dot(ab);

      var t = Math.min(Math.max(vecadot/abdot, 0), 1);

      var point = ab.multiply(t).add(a);
      var length = vec.subtract(point, true).lengthSquared();

      if (length < dist) {
        found = point;
        foundIndex = i;
        foundOnPoint = t===0 || t===1;
        dist = length;
      }
    }

    found.prev = this.point(foundIndex-1);
    found.next = this.point(foundIndex+1);

    if (foundOnPoint) {
      found.current = this.point(foundIndex);
    }

    return found;
  },

  center : function() {
    // TODO: the center of a polygon is not the center of it's aabb.
    var aabb = this.aabb();
    return Vec2(aabb.x + aabb.w/2, aabb.y + aabb.h/2);
  },

  scale : function(amount, origin, returnTrue) {
    var obj = this;
    if (returnTrue) {
      obj = this.clone();
    }

    if (!origin) {
      origin = obj.center();
    }

    obj.each(function(p, c) {
      c.multiply(amount);
    });

    var originDiff = origin.multiply(amount, true).subtract(origin);

    obj.each(function(p, c) {
      c.subtract(originDiff);
    });

    return obj;
  },

  containsPoint : function(point) {
    var c = false;

    this.each(function(prev, current, next) {
      ((prev.y <= point.y && point.y < current.y) || (current.y <= point.y && point.y < prev.y))
        && (point.x < (current.x - prev.x) * (point.y - prev.y) / (current.y - prev.y) + prev.x)
        && (c = !c);
    });

    return c;
  },

  containsPolygon : function(subject) {
    if (isArray(subject)) {
      subject = new Polygon(subject);
    }

    for (var i=0; i<subject.points.length; i++) {
      if (!this.containsPoint(subject.points[i])) {
        return false;
      }
    }

    for (var i=0; i<this.points.length; i++) {
      var outer = this.line(i);
      for (var j=0; j<subject.points.length; j++) {
        var inner = subject.line(j);

        var isect = segseg(outer[0], outer[1], inner[0], inner[1]);
        if (isect && isect !== true) {
          return false;
        }
      }
    }

    return true;
  },


  aabb : function() {
    if (this.points.length<2) {
      return { x: 0, y : 0, w: 0, h: 0};
    }

    var xmin, xmax, ymax, ymin, point1 = this.point(1);

    xmax = xmin = point1.x;
    ymax = ymin = point1.y;

    this.each(function(p, c) {
      if (c.x > xmax) {
        xmax = c.x;
      }

      if (c.x < xmin) {
        xmin = c.x;
      }

      if (c.y > ymax) {
        ymax = c.y;
      }

      if (c.y < ymin) {
        ymin = c.y;
      }
    });

    return {
      x : xmin,
      y : ymin,
      w : xmax - xmin,
      h : ymax - ymin
    };
  },

  offset : function(delta, prune) {

    var res = [];
    this.rewind(false).simplify().each(function(p, c, n, i) {
      var e1 = c.subtract(p, true).normalize();
      var e2 = c.subtract(n, true).normalize();

      var r = delta / Math.sin(Math.acos(e1.dot(e2))/2);
      var d = e1.add(e2, true).normalize().multiply(r, true);

      var angle = toTAU(e1.angleTo(e2));
      var o = e1.perpDot(e2) < 0 ? c.add(d, true) : c.subtract(d, true);

      if (angle > TAU * .75 || angle < TAU * .25) {

        o.computeSegments = angle;
        c.color = "white"
        c.radius = 3;
      }

      o.point = c;
      res.push(o);
    });


    var parline = function(a, b) {
      var normal = a.subtract(b, true);

      var angle = Vec2(1, 0).angleTo(normal);
      var bisector = Vec2(delta, 0).rotate(angle + Math.PI/2);

      bisector.add(b);

      var cperp = bisector.add(normal, true);

      var l = new Line2(bisector.x, bisector.y, cperp.x, cperp.y);
      var n = a.add(normal, true);
      var l2 = new Line2(a.x, a.y, n.x, n.y);
      return l;
    }

    var offsetPolygon = Polygon(res);
    var ret = [];


    offsetPolygon.each(function(p, c, n, i) {

      var isect = segseg(c, c.point, n, n.point);
      if (isect) {

        var pp = offsetPolygon.point(i-2);
        var nn = offsetPolygon.point(i+2);

        var ppline = parline(pp.point, p.point);
        var pline = parline(p.point, c.point);
        var nline = parline(c.point, n.point);
        var nnline = parline(n.point, nn.point);

        // ret.push(ppline.intersect(nline));
        // ret.push(pline.intersect(nline));
        // ret.push(ppline.intersect(pline));
        // ret.push(nline.intersect(nnline));

        var computed = pline.intersect(nnline);
        computed.color = "yellow";
        computed.point = c.point;

        ret.push(computed);

      } else {
        ret.push(c);
      }
    });

    return ret.length ? Polygon(ret) : offsetPolygon;
  },

  line : function(idx) {
    return [this.point(idx), this.point(idx+1)];
  },

  lines : function(fn) {
    var idx = 0;
    this.each(function(p, start, end) {
      fn(start, end, idx++);
    });

    return this;
  },

  selfIntersections : function() {
    var points = [];

    selfIntersections(this.points, function(isect, i, s, e, i2, s2, e2, unique) {
      if (!unique) return;
      var v = Vec2.fromArray(isect);
      points.push(v);

      v.s = i + (s.subtract(v, true).length() / s.subtract(e, true).length())
      v.b = i2 + (s2.subtract(v, true).length() / s2.subtract(e2, true).length())
      v.si = i;
      v.bi = i2;

      // don't create extra garbage for no reason
      return false;
    });

    return Polygon(points);
  },

  pruneSelfIntersections : function() {
    var selfIntersections = this.selfIntersections();

    var belongTo = function(s1, b1, s2, b2) {
      return s1 > s2 && b1 < b2
    }

    var contain = function(s1, b1, s2, b2) {
      return s1 < s2 && b1 > b2;
    }

    var interfere = function(s1, b1, s2, b2) {
      return (s1 < s2 && s2 < b1 && b2 > b1) || (s2 < b1 && b1 < b2 && s1 < s2);
    }

    function Node(value, depth) {
      this.value = value;
      this.depth = this.depth;
      this.children = [];
    }

    // TODO: create tree based on relationship operations
    // TODO: ensure the root node is valid
    var rootVec = this.point(0).clone();
    rootVec.s = 0;
    rootVec.b = (this.points.length-1) + 0.99;
    var root = new Node(rootVec);
    var last = root;
    var tree = [rootVec];
    selfIntersections.each(function(p, c, n) {
      console.log(
        'belongTo:', belongTo(last.s, last.b, c.s, c.b),
        'contain:', contain(last.s, last.b, c.s, c.b),
        'interfere:', interfere(last.s, last.b, c.s, c.b)
      );

      //if (!contain(1-last.s, 1-last.b, 1-c.s, 1-c.b)) {
        tree.push(c);
        last = c;
      //}
    });

    var ret = [];
    if (tree.length < 2) {
      return [this];
    }

    tree.sort(function(a, b) {
      return a.s - b.s;
    });

    for (var i=0; i<tree.length; i+=2) {
      var poly = [];
      var next = (i<tree.length-1) ? tree[i+1] : null;

     if (next) {

        // collect up to the next isect
        for (var j = Math.floor(tree[i].s); j<=Math.floor(next.s); j++) {
          poly.push(this.point(j));
        }

        poly.push(next);

        // collect up to the next isect
        for (var j = Math.floor(next.b+1); j<=Math.floor(tree[i].b); j++) {
          poly.push(this.point(j));
        }
      } else {
        poly.push(tree[i])
        for (var k = Math.floor(tree[i].s+1); k<=Math.floor(tree[i].b); k++) {
          poly.push(this.point(k));
        }
      }

      ret.push(new Polygon(poly));
    }


    return ret;
  },

  get length() {
    return this.points.length
  },

  clone : function() {
    var points = [];
    this.each(function(p, c) {
      points.push(c.clone());
    });
    return new Polygon(points);
  },

  rotate: function(rads, origin, returnNew) {
    origin = origin || this.center();

    var obj = (returnNew) ? this.clone() : this;

    return obj.each(function(p, c) {
      c.subtract(origin).rotate(rads).add(origin);
    });
  },

  translate : function(vec2, returnNew) {
    var obj = (returnNew) ? this.clone() : this;

    obj.each(function(p, c) {
      c.add(vec2);
    });

    return obj;
  },

  equal : function(poly) {
    var current = poly.length;

    while(current--) {
      if (!this.point(current).equal(poly.point(current))) {
        return false;
      }
    }
    return true;
  },


  containsCircle : function(x, y, radius) {
    var position = new Vec2(x, y);

    // Confirm that the x,y is inside of our bounds
    if (!this.containsPoint(position)) {
      return false;
    }

    var closestPoint = this.closestPointTo(position);

    if (closestPoint.distance(position) >= radius) {
      return true;
    }
  },

  contains : function(thing) {

    if (!thing) {
      return false;
    }

    // Other circles
    if (defined(thing.radius) && thing.position) {
      var radius;
      if (isFunction(thing.radius)) {
        radius = thing.radius();
      } else {
        radius = thing.radius;
      }

      return this.containsCircle(thing.position.x, thing.position.y, radius);

    } else if (typeof thing.points !== 'undefined') {

      var points, l;
      if (isFunction(thing.containsPolygon)) {
        points = thing.points;
      } else if (isArray(thing.points)) {
        points = thing.points;
      }

      return this.containsPolygon(points);

    } else if (
      defined(thing.x1) &&
      defined(thing.x2) &&
      defined(thing.y1) &&
      defined(thing.y2)
    ) {
      return this.containsPolygon([
        new Vec2(thing.x1, thing.y1),
        new Vec2(thing.x2, thing.y1),
        new Vec2(thing.x2, thing.y2),
        new Vec2(thing.x1, thing.y2)
      ]);

    } else if (defined(thing.x) && defined(thing.y)) {

      var x2, y2;

      if (defined(thing.w) && defined(thing.h)) {
        x2 = thing.x+thing.w;
        y2 = thing.y+thing.h;
      }

      if (defined(thing.width) && defined(thing.height)) {
        x2 = thing.x+thing.width;
        y2 = thing.y+thing.height;
      }

      return this.containsPolygon([
        new Vec2(thing.x, thing.y),
        new Vec2(x2, thing.y),
        new Vec2(x2, y2),
        new Vec2(thing.x, y2)
      ]);
    }

    return false;
  },

  union: function(other) {
    return Polygon(
      polygonBoolean(
        this.toArray(),
        other.toArray(),
        'or'
      )[0]
    );
  },

  cut: function(other) {
    return polygonBoolean(
      this.toArray(),
      other.toArray(),
      'not'
    ).map(function(r) {
      return new Polygon(r);
    });
  },

  intersect: function(other) {
    return polygonBoolean(
      this.toArray(),
      other.toArray(),
      'and'
    ).map(function(r) {
      return new Polygon(r);
    });
  },

  toArray: function() {
    var l = this.length;
    var ret = Array(l);
    for (var i=0; i<l; i++) {
      ret[i] = this.points[i].toArray();
    }
    return ret;
  },

  toString : function() {
    return this.points.join(',');
  }

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Polygon;
}

if (typeof window !== 'undefined') {
  window.Polygon = Polygon;
}

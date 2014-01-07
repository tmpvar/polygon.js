var Vec2 = require('vec2');
var segseg = require('segseg');
var PI = Math.PI;
var TAU = PI*2;
var toTAU = function(rads) {
  if (rads<0) {
    rads += TAU;
  }

  return rads;
};


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
    this.points = this.points.filter(function(point) {
      return point!==vec;
    });
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
    var points = [];

    this.each(function(prev, current, next) {
      // TODO: optimize
      var a = prev;
      var b = current;
      var ab = b.subtract(a, true);
      var veca = vec.subtract(a, true);
      var vecadot = veca.clone().dot(ab);
      var abdot = ab.clone().dot(ab);

      var t = vecadot/abdot;

      if (t<0) {
        t = 0;
      }

      if (t>1) {
        t = 1;
      }

      var point = ab.multiply(t, true).add(a);

      points.push({
        distance: point.distance(vec),
        point : point
      });
    });

    var obj = points.sort(function(a, b) {
      return a.distance-b.distance;
    })[0];

    var point = obj.point;
    point.distanceToCurrent = obj.distance;

    this.each(function(prev, current, next) {
      if (point.equal(current)) {
        point.current = current;
        point.prev = prev;
        point.next = next;
        return false;
      }
    });

    return point;
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
    var type=0,
        left = Vec2(this.aabb().x, point.y + .00001),
        seen = {};

    this.each(function(prev, current, next) {
      var i = segseg(left, point, current, next);
      if (i && i!==true) {
        type++;
      }
    });

    return type%2 === 1;
  },

  containsPolygon : function(subject) {
    var ret = true, that = this;
    subject.each(function(p, c, n) {
      if (!that.containsPoint(c)) {
        ret = false;
        return false;
      }
    });
    return ret;
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

  offset : function(delta) {

    var raw = [],
        ret = [],
        last = null,
        bisectors = [],
        rightVec = Vec2(1, 0);

    // Compute bisectors
    this.each(function(prev, current, next, idx) {
      var e1 = current.subtract(prev, true).normalize();
      var e2 = current.subtract(next, true).normalize();
      var ecross = e1.perpDot(e2);
      var length = delta / Math.sin(Math.acos(e1.dot(e2))/2);

      length = -length;
      var angleToZero = rightVec.angleTo(current.subtract(prev, true).normalize());

      var rads = prev.subtract(current, true).normalize().angleTo(
        next.subtract(current, true).normalize()
      )

      var bisector = Vec2(length, 0).rotate(angleToZero - rads/2);

      if (ecross < 0)
      {
        bisector.add(current);
      } else {
        bisector = current.subtract(bisector, true);
      }
      bisector.cornerAngle = rads;
      current.bisector = bisector;
      bisector.point = current;
      raw.push(bisector);
    });
    
    Polygon(raw).each(function(p, c, n, i) {

      var isect = segseg(c, c.point, n, n.point);

      if (isect && isect !== true) {
        // This means that the offset is self-intersecting
        // find where and use that as the current vec instead

        var isect2 = segseg(
          p,
          c,
          n,
          this.point(i+2)
        );

        if (isect2 && isect2 !== false) {
          isect = isect2;
        }

        this.remove(c);
        c.set(isect[0], isect[1]);

      }

      ret.push(c)
    });

    return Polygon(ret);

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
    var ret = [];

    // TODO: use a faster algorithm. Bentley–Ottmann is a good first choice
    this.lines(function(s, e, i) {
      this.lines(function(s2, e2, i2) {

        if (!s2.equal(e) && !s2.equal(s) && !e2.equal(s) && !e2.equal(e) && i+1 < i2) {
          var isect = segseg(s, e, s2, e2);
          // self-intersection
          if (isect && isect !== true) {
            var vec = Vec2.fromArray(isect);
            // TODO: wow, this is inneficient but is crucial for creating the
            //       tree later on.
            vec.s = i + (s.subtract(vec, true).length() / s.subtract(e, true).length())
            vec.b = i2 + (s2.subtract(vec, true).length() / s2.subtract(e2, true).length())

            ret.push(vec);
          }
        }
      });
    }.bind(this));
    return Polygon(ret);
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

    function Node(value) {
      this.value = value;
      this.children = [];
    }

    // TODO: create tree based on relationship operations

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
      //} else {
        // collect under children
      //}

    });

    var ret = [];

    if (tree.length < 2) {
      return ret;
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
        poly.push(this.point(Math.floor(tree[i].b)));
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
  }
};

if (typeof module !== 'undefined') {
  module.exports = Polygon;
}

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

  offset : function(delta) {
    var bisect = function(a, b) {
      var diff = a.subtract(b, true);
      var angle = toTAU(Vec2(1, 0).angleTo(diff));
      var bisector = Vec2(delta, 0).rotate(angle - Math.PI/2);

      return bisector;
    };

    var ret = [];
    var collect = function(a, point, type) {
      if (a) {
        a.type = a.type || type || 'edge';
        ret.push(a);
        if (point) {
          a.point = point;
        }

        if (a.type === 'edge') {
          a.color = "red";
        } else if (a.type === 'angle') {
          a.color = "yellow";
        } else if (a.type) {
          a.color = "pink";
        }
      }
    };

    var lines = [];
    this.rewind(false).simplify().each(function(p, c, n, i) {

      var e1 = c.subtract(p, true).normalize();
      var e2 = c.subtract(n, true).normalize();

      var r = delta / Math.sin(Math.acos(e1.dot(e2))/2);
      var d = e1.add(e2, true).normalize().multiply(r, true);

      var o = e1.perpDot(e2) < 0 ? c.add(d, true) : c.subtract(d, true);

      var pc = bisect(p, c);
      var bc = bisect(c, n);
      var nc = bisect(n, this.point(i+2));

      var prevprev = p.subtract(pc, true);
      var prev = c.subtract(pc, true);
      var start = c.subtract(bc, true);
      var end = n.subtract(bc, true);

      if (e1.angleTo(e2) <= -Math.PI * .75) {
        collect(o, c, 'angle');
        collect(end, n, 'edge');
      } else {

        var isect = segseg(prevprev, prev, start, end);

        if (isect) {
          collect(Vec2.fromArray(isect), c, 'isect');
        } else {
          collect(start, c, 'edge'); // edge offset
        }

        collect(end, n, 'edge'); // edge offset
      }
    });

    return Polygon(ret).simplify();
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

  pruneSelfIntersections : function(validFn) {
    var selfIntersections = this.selfIntersections();
    if (!selfIntersections.points.length) {
      return [this];
    }

console.log('self isects', selfIntersections.points.length, selfIntersections.dedupe().toString())
    var belongTo = function(s1, b1, s2, b2) {
      return s1 > s2 && b1 < b2
    }

    var contain = function(s1, b1, s2, b2) {
      return s1 < s2 && b1 > b2;
    }

    var interfere = function(s1, b1, s2, b2) {
      return (s1 < s2 && s2 < b1 && b2 > b1) || (s2 < b1 && b1 < b2 && s1 < s2);
    }

    var node_set_array = function(node, key, value) {
      if (!node[key]) {
        node[key] = [value];
      } else {
        node[key].push(value);
      }
    }

    var compare = function(a, b) {
      if (belongTo(a.s, a.b, b.s, b.b)) {
        return 'belongs';
      } else if (contain(a.s, a.b, b.s, b.b)) {
        return 'contains';
      } else if (interfere(a.s, a.b, b.s, b.b)) {
        return 'interferes'
      } else {
        return null;
      }
    }

    var node_associate = function(node, child) {
      if (!node) {
        return true;
      }

      var relationship = compare(node, child);
      console.log('%s:%s -> %s:%s :: %s', node.id, node.toString(), child.id, child.toString(), relationship);
      if (relationship) {

        if (relationship === 'contains') {
          child.parent = node;
          node_set_array(node, relationship, child);
          return true;
        }

        if (relationship === 'interferes') {

          // TODO: there are other cases
          //       consider keeping track of all the interference
          if (node.contains && node.contains.length) {
            console.log('REPARENTING', node.contains[0], child);

            node_reparent(node.contains[0], child);
            node_reparent(child, node);
            // node.contains.forEach(function(contained) {
            //   node_reparent(contained, child)
            // });
//            node_reparent(child, node);
            console.log(compare(child, node));
            return true;
            node_set_array(node.contains[0], 'contains', child);
            return true;
          }
        }
      }
    }

    var node_reparent = function(node, parent) {
      if (node.parent) {
        node.parent.contains = node.parent.contains.filter(function(n) {
          return n !== node;
        });
      }

      if (!parent.contains) {
        parent.contains = [];
      }

      if (!node.contains) {
        node.contains = [];
      }

      var oldParent = node.parent || null;
      node.parent = parent;
      parent.contains.push(node);
      return oldParent;
    };

    // TODO: ensure the root node is valid
    var root = this.point(0).clone();

    var points = selfIntersections.points.concat();
    var startCompareAt = 0;

    if (validFn && !validFn(root)) {

      var index = points.length-1;
      root = points[index];
      while (!validFn(root) && index--) {
        root = points[index];
      }

      // no valid start points found, bail out
      if (index == -1) {
        return [];
      }

    } else {
      root.s = 0;
      root.si = 0;
      root.bi = (this.points.length-1); + 0.99;
      root.b = root.bi + 0.99;

      points.unshift(root);
    }

    points.sort(function(a, b) {
      return a.s < b.s ? -1 : 1;
    });

    for (var i=1; i<points.length; i++) {
      if (!node_associate(points[i-1], points[i])) {
        var parent = points[i-1].parent;

        while (parent) {
          if (node_associate(parent, points[i])) {
            console.log('missed, but found')
            break;
          }
          parent = parent.parent;
        }
      };
    }

    console.log('ROOT NODE', root);

    var polygons = [];
    var that = this;
    var walk = function(node, depth) {
      var odd = !!(depth%2)
      var contains = node.contains || [];
      var i;
      if (!odd) {
        var poly = [];
        var collect = function(n, id) {
          console.log('collected', id || n.id, n.toArray());
          poly.push(n);
        }

        depth > 0 && collect(node, node.si + '->' + node.bi);
console.log('contains.length', contains.length, contains.join(','), contains[0], node);
        if (contains.length) {
          for (i=node.si; i<contains[0].si; i++) {
            collect(that.points[i], 'first-' + i);
          }

          // Ok, here we're going to special case the situation where
          // we've had to move past the root node to start the collection
          // process.


          if (root.si !== 0) {
            collect(node);
          }

          for (i=0; i<contains.length; i++) {
            collect(contains[i]);
            var next = contains[i+1];
            var collectTo = next ? next.si : node.bi;
            for (var j=contains[i].bi; j<collectTo; j++) {
              collect(that.points[j], i + ' :: ' + j);
            }

            if (contains[i].contains) {
              console.log('contains', contains[i].contains, i, contains[i].contains.length);

              for (var j=0; j<contains[i].contains.length; j++) {
                console.log('WALKING', depth+2)
                walk(contains[i].contains[j], depth+2);
              }
            } else {

              console.log(node, contains[i]);
            }
            // no else here because the next phase is even
          }

          collect(that.point(node.bi), node.id + '.b');
        } else {
          collect(node);

          for (var i = node.si; i<node.bi; i++) {
            collect(that.point(i));
          }
          collect(that.point(node.bi));
        }

        poly.length > 2 && polygons.push(new Polygon(poly));
      }
    };

    walk(root, 0)
    return polygons;
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

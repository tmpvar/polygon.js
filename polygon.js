
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

var clean = function(a, b) {
  return Math.round((a-b)*10000)/10000;
}

var near = function(a, b) {
  return clean(a, b) === 0;
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

  offset : function(delta, collectOriginal) {
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

        if (!a.color) {
          var map = {
            edge : 'red',
            angle: 'yellow',
            isect: 'pink',
            join: 'green'
          };

          if (map[a.type]) {
            a.color = map[a.type];
          } else {
            a.color = type;
          }
        }
      }
    };

    var roundCorner = function(p, c, n) {
      var v = Vec2(1, 0);
      var oangle = v.angleTo(p.subtract(c, true))
      var ae1 = v.angleTo(c.subtract(p, true));
      var ae2 = v.angleTo(n.subtract(c, true))

      var range = (ae2 > ae1) ? ae2-ae1 : TAU-(ae1 - ae2);

      oangle += TAU/4

      if (delta < 0) {
        range = TAU - range;
        if (range > TAU/2) {
          return;
        }
      }

      var steps = 10;// + Math.floor(Math.abs(delta)*.01);
      var stepSize = range / steps;

      if (delta < 0) {
        range /= 2;
        stepSize = -stepSize;
      }

      var b = Vec2(delta, 0).rotate(oangle);
      for (var i = 0; i<steps-1; i++) {
        collect(c.add(b.rotate(stepSize), true), c, 'green')
      }
    };



    var swap = function(a, b) {
      var tmp = a.toArray();
      a.set(b.x, b.y);
      b.set(tmp[0], tmp[1]);
    };

    var angleBisector = function(p, c, n) {
      var e1 = c.subtract(p, true).normalize();
      var e2 = c.subtract(n, true).normalize();

      var r = delta / Math.sin(Math.acos(e1.dot(e2))/2);
      if (Number.isFinite(r)) {
        var d = e1.add(e2, true).normalize().multiply(r, true);
      } else {
        var d = Vec2(0, 0);
      }


      var o = e1.perpDot(e2) < 0 ? c.add(d, true) : c.subtract(d, true);
      o.angle = e1.angleTo(e2);

      return [o, c];
    };

    var edgeBisector = function(start, end) {
      var o = bisect(start, end);
      return [start.subtract(o, true), end.subtract(o, true)];
    };

    var segsegArrays = function(a, b) {
      return segseg(a[0], a[1], b[0], b[1]);
    };

    var joinAngle = function(p, c, n) {
      return c.subtract(p, true).angleTo(c.subtract(n, true));
    };

    var that = this;
    var original = this.simplify().rewind(false).clone();
    var sentinel = 20;
    var done = false;

    original.each(function(p, c, n, i) {
      var nn = original.point(i+2);
      // local self-intersection
      if (segseg(c, p, n, nn)) {
        swap(c, n);
      }

      c.point = that.point(i);
    });

    var diameter = Math.abs(delta)*2;
    var deltaSquared = delta*delta;

    while (sentinel-- && !done) {
      done = true;

      for (var i = 0; i<original.length; i++) {
        var pp  = original.point(i-2);
        var p  = original.point(i-1);
        var c  = original.point(i);
        var n  = original.point(i+1);
        var nn = original.point(i+2);

        var ao = angleBisector(p, c, n);
        var angleBisectorIsect = segsegArrays(angleBisector(c, n, nn), ao);
        var d2 = Math.abs(delta) * 2;
        var pnndiff = p.subtract(nn, true);

        var dpnn = pnndiff.length();
        var dcn = c.distance(n);
        var dpn = p.distance(n);

        if (angleBisectorIsect) {

          // TODO: do the math to figure out how much of the circle is sticking into
          //       the corner
          if (dpnn < diameter && diameter/2 < p.distance(c)) {

            var a = Vec2(1, 0).angleTo(pnndiff);
            var loc = (Math.PI - (Math.acos((2 * deltaSquared - dpnn*dpnn)/(2 * deltaSquared))))/2;

            // attempt an intersection between two tangent lines
            var tnormal = Vec2(1, 0).rotate(a + loc + Math.PI/2);
            var line1 = new Line2(p.x, p.y, p.x+tnormal.x, p.y+tnormal.y);

            tnormal = Vec2(1, 0).rotate(a - loc - Math.PI/2);
            var line2 = new Line2(nn.x, nn.y, nn.x-tnormal.x, nn.y-tnormal.y);
            var tangentIsect = line1.intersect(line2);
            if (tangentIsect) {

              c.set(tangentIsect);
              original.points.splice(i+1, 1);
              done = false;
              c.color = "orange";
            } else {
              c.color = "#f0f";
            }

          } else {
            var tangentThrough;
            var moveTarget;
            var tangentIsectTarget;
            var bisectorPoint;

            if (joinAngle(p, c, n) < joinAngle(c, n, nn)) {
              n.color = "red";
              tangentThrough = n;
              moveTarget = c;

              bisectorPoint = ao[0];
              tangentIsectTarget = [p, c];
            } else {
              c.color = "purple";
              tangentThrough = c;
              moveTarget = n;
              bisectorPoint = angleBisector(p, c, n)[0];
              tangentIsectTarget = [n,nn];
            }

            var diff = bisectorPoint.subtract(tangentThrough, true);

            if (diff.lengthSquared()) {
              var tangentLine = new Line2(
                tangentThrough.x,
                tangentThrough.y,
                tangentThrough.x - diff.y,
                tangentThrough.y + diff.x
              );

              var newPoint = tangentLine.intersect(
                tangentIsectTarget[0].x,
                tangentIsectTarget[0].y,
                tangentIsectTarget[1].x,
                tangentIsectTarget[1].y
              );

              if (newPoint) {
                moveTarget.set(newPoint);
                done = false;
              } else {
                //console.error('no tangent intersection');
                moveTarget.color = "purple"
              }
            } else {
              console.log('DIFF FAILED')
            }
          }
        }
      }
    }
    console.log('sentinel', sentinel);

    if (!collectOriginal) {
      original.dedupe().each(function(p, c, n) {

        var cab = angleBisector(p, c, n)

console.log('o.angle', cab[0].angle);

        var angle = joinAngle(p, c, n);
        var reflex = angle > 0 && angle < Math.PI;

        //collect(o, c, 'angle');

        if (reflex === delta < 0) {
          roundCorner(p, c, n);
        } else {
          collect(cab[0], c, c.color || 'angle');
        }
      });

      return Polygon(ret);
    } else {
      return original;
    }

    // catch the cases where two adjacent bisectors intersect
    var sentinel = 100;
    var done = false;
    while (sentinel-- && !done) {
      done = true;

      var poly = Polygon(ret).simplify();
      var ret = poly.points.filter(function(v, i) {

        var p = poly.point(i-1);
        var c = poly.point(i);
        var n = poly.point(i+1);
        var nn = poly.point(i+2);
        var bisectorIsect = segseg(c.point, c, n, n.point);
        // if (bisectorIsect) {
        //   if (c.point !== n.point) {
        //     c.set(bisectorIsect[0], bisectorIsect[1]);
        //     //n.invalid = true;
        //     done = false;
        //     // return false;
        //   }
        // }


        var cn = segseg(p, c, n, nn);
        if (!p.equal(c)) {
          if (cn) {
            c.color = "#f0f";
            c.set(cn[0], cn[1]);
            n.invalid = true;
            done = false;
          } else if (bisectorIsect) {

            var edgeIsect = segseg(c.edges[0], c.edges[1], n.edges[0], n.edges[1]);
            console.log(c.edges.join(','), n.edges.join(','))
            if (edgeIsect) {
              console.log('here');
              c.set(edgeIsect[0], edgeIsect[1])
            } else {
              c.color = "orange";
              //n.invalid = true;
              done = false;
              // return false;
            }
          }
        }

        return !c.invalid;

        if (segseg(p, c, n, n.point)) {
          done = false;
          //n.invalid = true;
        }


        if (segseg(c, c.point, n, n.point)) {

          var offsetIsect = segseg(p,c, n, nn);

          if ((!c.equal(p))) {
            if (offsetIsect && offsetIsect!==true) {
              console.log('yep')

              done = false;
              c.set(offsetIsect[0], offsetIsect[1]);
              c.color = "blue";
            }
          }
        }


        return !c.invalid;

      });


/*      var ret = poly.points.filter(function(v, i) {
        var c = poly.point(i);
        var n = poly.point(i+1);

        if (c.point !== n.point) {
          var isect = segseg(c, c.point, n, n.point);
          if (isect) {
            // this intersection point is not a valid part of the
            // offset curve, but it is an indicator of a local problem
            // which is fixed below

            var offsetIsect = segseg(
              poly.point(i-1),
              c,
              n,
              poly.point(i+2)
            );
            if (offsetIsect && offsetIsect !== true) {
              n.set(offsetIsect[0], offsetIsect[1]);
              n.color = "purple";
              return false;
            } else {
              n.invalid = true;
            }
            done = false;
          } else {
            var closest = original.closestPointTo(c);
            var dist = Vec2.clean(c.distance(closest));
            // console.log(dist, delta);
            // if (dist + .0000001 < Math.abs(delta)) {
            //   done = false;
            //   return false;
            // }
          }
        }

        return !c.invalid;
      });*/
    }

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

  doesIntersectPolygon : function(poly) {

    var l = this.length;
    var l2 = poly.length;
    for (var i=0; i<l; i++) {
      for (var j = 0; j<l2; j++) {
        var isect = segseg(
          this.point(i),
          this.point(i+1),
          poly.point(j),
          poly.point(j+1)
        );

        if (isect) {
          return true;
        }
      }
    }

    return false;
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


  splitSelfIntersections : function(delta, originalPolygon) {
    var selfIntersections = this.selfIntersections();

    if (!selfIntersections.points.length) {
      if (this.doesIntersectPolygon(originalPolygon)) {
        return [];
      } else {
        return [this];
      }
    }

    var contain = function(parent, child) {
      return parent.s < child.s && parent.b > child.b;
    }

    var interfere = function(s1, b1, s2, b2) {
      return (s1 < s2 && s2 < b1 && b2 > b1) || (s2 < b1 && b1 < b2 && s1 < s2);
    }

    // Setup the root to be the first point in this polygon
    var root = this.points[0];
    root.s = 0;
    root.si = 0;
    root.depth = 0;
    root.bi = (this.points.length-1);
    root.b = root.bi + 0.99;

    var node_reparent = function(node, parent) {

      if (node === parent) {
        return;
      }

      if (node.parent) {
        node.parent.contains = node.parent.contains.filter(function(n) {
          return n !== node;
        });
      }

      if (!parent.contains) {
        parent.contains = [];
      }

      var oldParent = node.parent || null;
      if (oldParent === root) {
        root = node;
        node.parent = null;
      } else {
        node.parent = parent;
      }

      parent.contains.push(node);
      return oldParent;
    };

    var current = root;

    selfIntersections.points.sort(function(a, b) {
      return a.s < b.s ? -1 : 1;
    });

    selfIntersections.points.unshift(root);

    for (var i=1; i<selfIntersections.length; i++) {
      var current = selfIntersections.point(i);
      for (var j=i-1; j>=0; j--) {
        var compare = selfIntersections.point(j);
        if (contain(compare, current)) {
          node_reparent(current, compare);
          break;
        } else if (interfere(compare, current)) {
          console.error('INTERFERE');
        } else {
          // console.log('hrm', contain(compare, current), compare.si, compare.bi, current.si, current.bi);

        }
      }
    }

    var ret = [];
    var poly = [];
    var referencePolygon = [];

    var collect = function(v) {
      // skip adjacent duplicates
      if (poly.length && poly[poly.length-1].equal(v)) {
        return;
      }

      poly.push(v);

      if (v.point) {
        referencePolygon.push(v.point);
      }
    };

    var evenDepth = function(node, mod) {
      var i = mod || 0;
      node = node.parent;
      while (node) {
        node = node.parent;
        i++;
      }
      return i%2 === 0;
    }

    var evenOffset = 0;
    while (selfIntersections.length) {
      var item = selfIntersections.points.shift();

      collect(item);

      if (item.contains) {

        for (var k2 = item.si+1; k2<=item.contains[0].si; k2++) {
         collect(this.point(k2));
        }

        for (var l=0; l<item.contains.length; l++) {
          var contained = item.contains[l];
          collect(contained);

          var start = contained.bi;
          var end = item.contains[l+1] ? item.contains[l+1].si+1 : item.bi;

          for (var m = start; m<end; m++) {
            collect(this.point(m));
          }
        }

        collect(this.point(item.bi));
      } else {
        for (var n = item.si+1; n<=item.bi; n++) {
          collect(this.point(n));
        }
      }

      var collectedPoly = Polygon(poly).simplify();

      if (collectedPoly.length > 2) {
        var referenceWinding = Polygon(referencePolygon).winding();

        if (
          evenDepth(collectedPoly.points[0], evenOffset) &&
          referenceWinding === collectedPoly.winding() &&
          !originalPolygon.doesIntersectPolygon(collectedPoly) &&
          ((delta > 0 && !originalPolygon.containsPoint(collectedPoly.points[0])) || (delta < 0 && originalPolygon.containsPoint(collectedPoly.points[0])))
        ) {

          var valid = true;
          for (var i=0; i<collectedPoly.length; i++) {

            if (clean(originalPolygon.closestPointTo(collectedPoly.point(i)).distance(collectedPoly.point(i)), Math.abs(delta)) < -(Math.abs(delta/2))) {
              evenOffset++;
              valid = false;
              break;
            }
          }

          valid && ret.push(collectedPoly);

        } else if (!ret.length) {
          evenOffset++;
        }
      }
      poly = [];
      referencePolygon = [];
    }

    return ret;
  },

  pruneSelfIntersections2 : function(validFn) {
    var selfIntersections = this.selfIntersections();

    if (!selfIntersections.points.length) {
      return [this];
    }

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
            // node_reparent(child, node);
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
    var root = this.point(0);

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

      points = points.slice(index-1);

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

    var polygons = [];
    var that = this;

    var plan = function(a, b) {
      console.warn('collection plan %s -> %s', a, b);
    }

    var walk = function(node) {
      var poly = [];
      var collect = function(n, id) {
        if (n) {
          //console.log('collected', id || n.id, n.toString(), 'line: ' + (new Error()).stack.split('\n')[2].split('js:').pop().split(':').shift());
          poly.push(n);
        }
      };

      var contains = node.contains || [];

      if (contains.length) {
        var i, j;

        // If there's a parent we're not going to collect completely around
        // to this node.  So add it now.
        node.parent && collect(node, 'collect node if it has a parent');
        plan(node.si, contains[0].si);

        for (i = node.si; i<=contains[0].si; i++) {
          collect(that.points[i], 'up to next: ' + i);
        }

        if (node.si !== 0 && !node.parent) {
          poly.pop();
          collect(node, 'first collection is not root');
        }

        for (j = 0; j<contains.length; j++) {
          // TODO: need to i<=contains[i] for the right
          //       but it breaks other stuff
          var startPoint = contains[j].bi+1;
          var endPoint = j<contains.length-1 ? contains[j+1].si : node.bi;

          collect(contains[j], 'root node collect ' + contains[j].si);

          plan(startPoint, endPoint);
          for (i = startPoint; i<=endPoint; i++) {
            collect(that.points[i], 'contains[' + j + '] ' + i);
          }
          startPoint = contains[j].si
        }

      } else {

        // the last self intersection was on the current segment
        if (node.parent && node.parent.bi - node.bi <= 1 && node.parent.si - node.si <= 1) {

          for (var i = node.parent.bi-1; i <= node.si; i++) {
            collect(that.points[i], 'TODO');
          }

          collect(node);

          // Adding overhead, but ensuring proper offsetting
          // this fixes a case where the polygon has an ear
          // that actually protrudes into the offset area.
          var nodeStart = node.si;
          if (validFn && !validFn(that.points[i])) {
            nodeStart++;
          }

          for (var i = nodeStart; i<=node.bi; i++) {
            collect(that.points[i], 'TODO');
          }

          for (var i = node.bi; i <= node.parent.si; i++) {
            collect(that.points[i], 'TODO');
          }

        } else {

          for (var i = node.si; i<=node.bi; i++) {
            collect(that.points[i], 'TODO');
          }

          collect(node);
        }
      }

      var polygon = new Polygon(poly);

      // TODO: this test is defective.
      //
      //       A: filter invalid points - this resolves
      //          the issue to some extent, but causes
      //          other issues (i.e. jumping across the boundaries)
      //
      //       B: don't rely on polygon winding, and instead
      //          find a way to reliably determine if the polygon is an ear
      //
      //       C: track the winding of the parent feature. If the resulting poly
      //          does not match it's winding then it's invalid.

      var mapping = polygon.points.map(function(p) {
        if (p.point) {
          return p.point;
        }
      }).filter(Boolean);

      var sourceWinding = Polygon(mapping).winding();
      if (sourceWinding === polygon.winding() && polygon.length > 2) {
        polygon.points[0].radius = 10
        polygons.push(polygon);
        return true;
      } else {
        return false
      }
    };

    // TODO: this is decent, but it needs to be a breadth
    //       first search in order to be robust.
    //
    //       Why? well, any node on the tree can have multiple
    //       children which means the polygon spans multiple
    //       self-intersections.  This implementation does not
    //       handle this.
    for (var i=0; i<points.length; i+=2) {
      if (!walk(points[i])) {
        i--;
      }
    }
    console.log(polygons);
    return polygons;
  },

  pruneSelfIntersections1 : function(validFn) {
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
            // node_reparent(child, node);
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

var Vec2 = require('vec2');
var segseg = require('segseg');

function Polygon(points) {
  if (!(this instanceof Polygon)) {
    return new Polygon(points);
  }

  this.points = points || [];
}

Polygon.prototype = {

  each : function(fn) {
    for (var i = 0; i<this.points.length; i++) {
      var prev = i>0 ? this.points[i-1] : this.points[this.points.length-1];
      var next = i<this.points.length-1 ? this.points[i+1] : this.points[0];
      if (fn(prev, this.points[i], next, i) === false) {
        break;
      }
    }
    return this;
  },

  dedupe : function() {
    var seen = {};
    // TODO: make this a tree
    this.points = this.points.filter(function(a) {
      var key = a.x + ':' + a.y;
      if (!seen[key]) {
        seen[key] = true;
        return true;
      }
    });

    return this;
  },

  // Remove identical points occurring one after the other
  clean : function() {
    var last = this.points[this.points.length-1];

    this.points = this.points.filter(function(a) {
      var ret = false;
      if (!last.equal(a)) {
        ret = true;
      }

      last = a;
      return ret;
    });

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
    var first = this.points[0];

    this.each(function(prev, current, next, idx) {
      if (idx<2) { return; }

      var edge1 = first.subtract(current, true);
      var edge2 = first.subtract(prev, true);
      area += ((edge1.x * edge2.y) - (edge1.y * edge2.x))/2
    });

    return area;
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

  containsPoint : function(point) {
    var type=0,
        // Avoid intersections with points as they
        // cause weird results.

        // TODO: this is prone to errors when the x is < -1e10
        //       calculating the x off of the AABB would be prefered
        left = Vec2(0, point.y + .00001),
        seen = {};


    this.each(function(prev, current, next) {
      var i = segseg(left, point, current, next);
      if (i && i!==true) {
        type++;
      }
    });


    return type%2 === 1;
  }
};

module.exports = Polygon;

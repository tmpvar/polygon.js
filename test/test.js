var test = require('tape');
var Polygon = require('../polygon');
var Vec2 = require('vec2');

test('constructor - take an array of vec2s', function(t) {
  var p = new Polygon([
    Vec2(1,2),
    Vec2(100,200),
    Vec2(0,200)
  ]);

  t.equal(p.points.length, 3);
  t.end();
});

test('constructor - can create a polygon a single Vec2', function(t) {
  var p = new Polygon(Vec2(10, 20));
  t.ok(p.point(0).equal(Vec2(10, 20)));
  t.end();
});

test('constructor - accepts arrays', function(t) {
  var p = new Polygon([
    [10, 20]
  ]);
  t.ok(p.point(0).equal(Vec2(10, 20)));
  t.end();
});

test('constructor - accepts objects', function(t) {
  var p = new Polygon([
    {x : 10, y: 20 }
  ]);
  t.ok(p.point(0).equal(Vec2(10, 20)));
  t.end();
});

test('constructor - hotwires returning incoming polygons', function(t) {
  var p = Polygon([Vec2(1, 0)]);
  var p2 = Polygon(p);
  t.ok(p === p2);
  t.end();
});

test('Polygon#each - return the prev, current, next, and idx', function(t) {
  var p = new Polygon([
    Vec2(1,2),
    Vec2(100,200),
    Vec2(0,200)
  ]);

  p.each(function(prev, current, next, idx) {

    if (idx === 0) {
      t.equal(prev, p.points[2]);
      t.equal(current, p.points[0]);
      t.equal(next, p.points[1]);
    }

    if (idx === 1) {
      t.equal(prev, p.points[0]);
      t.equal(current, p.points[1]);
      t.equal(next, p.points[2]);
    }

    if (idx === 2) {
      t.equal(prev, p.points[1]);
      t.equal(current, p.points[2]);
      t.equal(next, p.points[0]);
    }
  });
  t.end();
});

test('Polygon#each - allow exiting early', function(t) {
  var p = new Polygon([
    Vec2(1,2),
    Vec2(100,200),
    Vec2(0,200)
  ]);

  p.each(function(prev, current, next, idx) {
    t.equal(idx, 0);
    return false;
  });

  t.end();
});

test('Polygon#insert - allow exiting early', function(t) {
  var p = new Polygon([
    Vec2(1,2),
    Vec2(100,200),
    Vec2(0,200)
  ]);

  p.insert(Vec2(50, 50), 1);

  t.deepEqual(p.toArray(), [
    [1, 2],
    [50, 50],
    [100, 200],
    [0, 200]
  ]);

  t.end();
});

test('Polygon#area - compute the area of a triangle', function(t) {
  var p = new Polygon([
    Vec2(200,200),
    Vec2(200,0),
    Vec2(0,0)
  ]);

  var area = p.area();

  t.equal(area, 200*200/2);
  t.end();
});

test('Polygon#area - compute the area of a square', function(t) {
  var p = new Polygon([
    Vec2(0,200),
    Vec2(200,200),
    Vec2(200,0),
    Vec2(0,0)
  ]);

  var area = p.area();

  t.equal(area, 200*200);
  t.end();
});

test('Polygon#winding - detect a polygon wound clockwise', function(t) {
  var p = new Polygon([
    Vec2(200,200),
    Vec2(200,0),
    Vec2(0,0)
  ]);

  t.ok(p.winding());
  t.end();
});

test('Polygon#winding - detect a polygon wound counterclockwise', function(t) {
  var p = new Polygon([
    Vec2(0,0),
    Vec2(200,0),
    Vec2(200,200)
  ]);

  t.ok(!p.winding());
  t.end();
});

test('Polygon#rewind - counterclockwise to clockwise', function(t) {

  var p = new Polygon([
    Vec2(0,0),
    Vec2(200,0),
    Vec2(200,200)
  ]);

  t.ok(!p.winding());
  p.rewind(true);
  t.ok(p.winding());
  t.end();
});


test('Polygon#rewind - clockwise to counterclockwise', function(t) {
  var p = new Polygon([
    Vec2(200,200),
    Vec2(200,0),
    Vec2(0,0)
  ]);

  t.ok(p.winding());
  p.rewind(false);
  t.ok(!p.winding());
  t.end();
});


test('Polygon#rewind - both', function(t) {
  var p = new Polygon([
    Vec2(200,200),
    Vec2(200,0),
    Vec2(0,0)
  ]);

  p.rewind(false);
  t.ok(!p.winding());

  p.rewind(true);
  t.ok(p.winding());
  t.end();
});

test('Polygon#closestPointTo - identify the closest point in the polygon to the incoming vector', function(t) {
  var p = new Polygon([
    Vec2(200,200),
    Vec2(200,0),
    Vec2(0,0)
  ]);

  var target = Vec2(300,300);
  var point = p.closestPointTo(target);

  t.equal(point.x, 200);
  t.equal(point.y, 200);

  t.deepEqual(point.current, p.points[0]);
  t.deepEqual(point.next, p.points[1]);
  t.deepEqual(point.prev, p.points[2]);

  t.equal(point.distance(target), 141.4213562373095);
  t.end();
});

test('Polygon#closestPointTo - identify the closest point in the polygon to the incoming vector', function(t) {
  var p = new Polygon([
    Vec2(0,200),
    Vec2(200,200),
    Vec2(200,0),
    Vec2(0,0)
  ]);

  var target = Vec2(300,100);
  var point = p.closestPointTo(target);
  t.equal(point.x, 200);
  t.equal(point.y, 100);
  t.ok(!point.current);
  t.equal(point.distance(target), 100);
  t.end();
});

test('Polygon#dedupe - remove dupes', function(t) {
  t.equal(Polygon([
    Vec2(10, 10),
    Vec2(10, 10),
    Vec2(20, 10),
    Vec2(20, 20),
  ]).dedupe().points.length, 3)
  t.end();
});

test('Polygon#dedupe - return a new instance if specified', function(t) {
  p = Polygon([
    Vec2(10, 10),
    Vec2(10, 10),
    Vec2(20, 10),
    Vec2(20, 20),
  ]);
  var p2 = p.dedupe(true);
  t.equal(3, p2.points.length);
  t.equal(4, p.points.length);
  t.end();
});

test('Polygon#containsPoint - return true when a vec is inside of the poly', function(t) {
  t.ok(Polygon([
    Vec2(0,0),
    Vec2(10,0),
    Vec2(10,10),
    Vec2(0,10)
  ]).containsPoint(Vec2(5,5)));

  t.ok(Polygon([
    Vec2(90, 90),
    Vec2(110, 90),
    Vec2(110, 110),
    Vec2(90, 110)
  ]).containsPoint(Vec2(100, 100)));
  t.end();
});

test('Polygon#containsPoint - works with polygons in negative space', function(t) {
  t.ok(Polygon([
    Vec2(0,0),
    Vec2(-10,0),
    Vec2(-10,-10),
    Vec2(10,-10)
  ]).containsPoint(Vec2(-5,-5)));
  t.end();
});

test('Polygon#containsPoint - return false when a vec is outside of a poly', function(t) {
  t.ok(!Polygon([
    Vec2(0,0),
    Vec2(10,0),
    Vec2(10,10),
    Vec2(0,10)
  ]).containsPoint(Vec2(50,5)));

  t.ok(!Polygon([
    Vec2(90, 90),
    Vec2(110, 90),
    Vec2(110, 110),
    Vec2(90, 110)
  ]).containsPoint(Vec2(85, 95)));
  t.end();
});


test('Polygon#remove - remove the passed vec2', function(t) {
  var p = Polygon([
    Vec2(0,0),
  ]);

  p.remove(p.point(0));
  t.equal(0, p.length);
  t.end();
});

test('Polygon#remove - return this', function(t) {
  var p = Polygon([
    Vec2(0,0),
  ]);

  t.ok(p === p.remove(p.point(0)));
  t.end();
});


test('Polygon#remove - allow numeric index', function(t) {
  var p = new Polygon([
    Vec2(1,2),
    Vec2(100,200),
    Vec2(0,200)
  ]);

  p.remove(1);

  t.deepEqual(p.toArray(), [
    [1, 2],
    [0, 200]
  ]);

  t.end();
});


test('Polygon#clean - remove subsequent identical points', function(t) {
  var p = Polygon([
    Vec2(0,0),
    Vec2(0,0),
    Vec2(1, 1),
    Vec2(3, 3),
  ]);

  p.clean();

  t.equal(p.points.length, 3);
  t.ok(p.points[0].equal(0, 0));
  t.ok(p.points[1].equal(1, 1));
  t.ok(p.points[2].equal(3, 3));

  t.end();
});

test('Polygon#clean - leave identical points that are not immediately connected', function(t) {
  var p = Polygon([
    Vec2(0,0),
    Vec2(1, 1),
    Vec2(0,0),
    Vec2(3, 3),
  ]);

  p.clean();

  t.equal(p.points.length, 4);
  t.ok(p.points[0].equal(0, 0));
  t.ok(p.points[1].equal(1, 1));
  t.ok(p.points[2].equal(0, 0));
  t.ok(p.points[3].equal(3, 3));
  t.end();
});

test('Polygon#clean - remove the loop if exists', function(t) {
  var p = Polygon([
    Vec2(0,0),
    Vec2(1, 1),
    Vec2(3, 3),
    Vec2(0,0),
  ]);

  p.clean();

  t.equal(p.points.length, 3);
  t.ok(p.points[0].equal(1, 1));
  t.ok(p.points[1].equal(3, 3));
  t.ok(p.points[2].equal(0, 0));
  t.end();
});

test('Polygon#clean - return a new polygon if requested', function(t) {
  var p = Polygon([
    Vec2(0,0),
    Vec2(0,0),
    Vec2(1, 1),
    Vec2(3, 3),
  ]);

  var p2 = p.clean(true);
  t.equal(3, p2.points.length);
  t.equal(4, p.points.length);
  t.end();
});

test('clone the object and all vecs', function(t) {
  var p = Polygon([
    Vec2(0,0),
    Vec2(1, 1),
    Vec2(3, 3),
    Vec2(0,0),
  ]);

  var p2 = p.clone();

  t.equal(p.length, p2.length);
  t.deepEqual(p, p2);
  p2.each(function(prev, c, n, idx) {
    t.equal(c.x, p.points[idx].x);
    t.equal(c.y, p.points[idx].y);
    t.ok(c !== p.points[idx]);
  });
  t.end();
});

test('Polygon#aabb - return a box that contains all of the points', function(t) {
  var p = Polygon([
    Vec2(300, 300),
    Vec2(320, 350),
    Vec2(300, 400),
    Vec2(400, 400),
    Vec2(450, 450),
    Vec2(400, 200),
    Vec2(400, 100)
  ], 20);

  var aabb = p.aabb();
  t.equal(aabb.x, 300);
  t.equal(aabb.y, 100);
  t.equal(aabb.w, 150);
  t.equal(aabb.h, 350);
  t.end();
});

test('Polygon#aabb - not explode when there are no points', function(t) {
  var p = Polygon();
  var aabb = p.aabb();
  t.equal(aabb.x, 0);
  t.equal(aabb.y, 0);
  t.equal(aabb.w, 0);
  t.equal(aabb.h, 0);
  t.end();
});


test('Polygon#containsPolygon - return true if the subject polygon is completely contained', function(t) {
  var p = new Polygon([
    Vec2(0,0),
    Vec2(100,0),
    Vec2(100,100),
    Vec2(0,100)
  ]);

  var p2 = new Polygon([
    Vec2(10,10),
    Vec2(90,10),
    Vec2(90,90),
    Vec2(10,90)
  ]);

  t.ok(p.containsPolygon(p2))
  t.end();
})

test('Polygon#containsPolygon - return false if the subject polygon is not completely contained', function(t) {
  var p = new Polygon([
    Vec2(0,0),
    Vec2(100,0),
    Vec2(100,100),
    Vec2(0,100)
  ]);

  var p2 = new Polygon([
    Vec2(-10,-10),
    Vec2(90,10),
    Vec2(90,90),
    Vec2(10,90)
  ]);

  t.ok(!p.containsPolygon(p2))
  t.end();
});

test('Polygon#containsPolygon - return false if the outer polygon intersects the inner', function(t) {

  /*
    The setup

    o--o     o--o
    |  |     |  |
    |   |   |   |
    | o--|-|--o |
    | |   o   | |
    | |       | |
    | o-------o |
    o-----------o

  */



  var p = new Polygon([
    Vec2(0,0),
    Vec2(100,0),
    Vec2(100,100),
    Vec2(80,100),
    Vec2(50,50),
    Vec2(20,100),
    Vec2(0,100)
  ]);

  var p2 = new Polygon([
    Vec2(10,10),
    Vec2(90,10),
    Vec2(90,60),
    Vec2(10,60)
  ]);

  t.ok(!p.containsPolygon(p2));
  t.end();
});

test('Polygon#offset', function(t) {
  var p = Polygon([
    Vec2(10, 10),
    Vec2(10, 100),
    Vec2(100, 100),
    Vec2(100, 10)
  ]).rewind(true);

  var offset = p.offset(-10);
  offset.each(function(p, c) {
    t.equal(Vec2.clean(c.distance(c.point)), 14.1421356);
  });
  t.end();
});

test('Polygon#point -return the index specified', function(t) {
  var p = Polygon([
    Vec2(10, 10),
    Vec2(10, 100),
    Vec2(100, 100),
    Vec2(100, 10)
  ]);

  t.ok(p.point(0).equal(Vec2(10, 10)));
  t.ok(p.point(-1).equal(Vec2(100, 10)));
  t.ok(p.point(4).equal(Vec2(10, 10)));
  t.ok(p.point(8).equal(Vec2(10, 10)));
  t.ok(p.point(-4).equal(Vec2(10, 10)));
  t.end();
});

test('Polygon#center - return a vec2 at the center', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10),
  ]);

  t.ok(p.center().equal(Vec2(5, 5)));
  t.end();
});

test('Polygon#scale - scale from the center by default', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10),
  ]);

  p.scale(Vec2(10, 1));
  t.ok(Vec2(-45, 0).equal(p.point(0)));
  t.ok(Vec2(55, 0).equal(p.point(1)));
  t.ok(Vec2(55, 10).equal(p.point(2)));
  t.ok(Vec2(-45, 10).equal(p.point(3)));
  t.ok(p.center().equal(Vec2(5, 5)));

  p.scale(Vec2(1, 10));
  t.ok(Vec2(-45, -45).equal(p.point(0)));
  t.ok(Vec2(55, -45).equal(p.point(1)));
  t.ok(Vec2(55, 55).equal(p.point(2)));
  t.ok(Vec2(-45, 55).equal(p.point(3)));

  t.ok(p.center().equal(Vec2(5, 5)));
  t.end();
});

test('Polygon#scale - scale from an abitrary point when specified', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10),
  ]);

  p.scale(Vec2(10, 1), Vec2(0, 0));
  t.ok(Vec2(0, 0).equal(p.point(0)));
  t.ok(Vec2(100, 0).equal(p.point(1)));
  t.ok(Vec2(100, 10).equal(p.point(2)));
  t.ok(Vec2(0, 10).equal(p.point(3)));

  t.ok(p.center().equal(Vec2(50, 5)));

  p.scale(Vec2(1, 10), Vec2(0, 0));
  t.ok(Vec2(0, 0).equal(p.point(0)));
  t.ok(Vec2(100, 0).equal(p.point(1)));
  t.ok(Vec2(100, 100).equal(p.point(2)));
  t.ok(Vec2(0, 100).equal(p.point(3)));

  t.ok(p.center().equal(Vec2(50, 50)));
  t.end();
});

test('Polygon#scale - chain', function(t) {
  var p = Polygon();
  t.equal(p, p.scale(10));
  t.end();
});

test('Polygon#scale - return a new polygon if returnNew is specified', function(t) {
  var p = Polygon([
    Vec2(10, 10)
  ]);

  var p2 = p.scale(Vec2(10, 1), null, true);
  t.ok(Vec2(100, 10).equal(p2.point(0)));
  t.ok(Vec2(10, 10).equal(p.point(0)));
  t.end();
});

test('Polygon#lines - iterate and call back with pairs', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10)
  ]);

  var count = 0;
  p.lines(function(start, end, idx) {
    t.equal(idx, count);

    t.ok(start.equal(p.point(count)));
    count++
    t.ok(end.equal(p.point(count)));
  });
  t.end();
});

test('Polygon#lines - chain', function(t) {
  var p = Polygon();
  t.equal(p, p.lines(function(t) {}));
  t.end();
});

test('Polygon#line - return an array', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10)
  ]);

  var line0 = p.line(0);
  t.ok(line0[0].equal(p.point(0)));
  t.ok(line0[1].equal(p.point(1)));

  var line1 = p.line(1);
  t.ok(line1[0].equal(p.point(1)));
  t.ok(line1[1].equal(p.point(2)));

  var line2 = p.line(2);
  t.ok(line2[0].equal(p.point(2)));
  t.ok(line2[1].equal(p.point(3)));

  var line3 = p.line(3);
  t.ok(line3[0].equal(p.point(3)));
  t.ok(line3[1].equal(p.point(4)));

  var line4 = p.line(4);
  t.ok(line4[0].equal(p.point(4)));
  t.ok(line4[1].equal(p.point(5)));
  t.end();
});

test('Polygon#rotate - rotate around center by default', function(t) {

  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10)
  ]);

  p.rotate(Math.PI/2); // rotate 90 degrees

  t.ok(p.point(0).equal(10, 0));
  t.ok(p.point(1).equal(10, 10));
  t.ok(p.point(2).equal(0, 10));
  t.ok(p.point(3).equal(0, 0));
  t.end();
});

test('Polygon#rotate - support rotation around arbitrary points', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10)
  ]);

  p.rotate(Math.PI/2, Vec2(0, 0)); // rotate 90 degrees

  t.ok(p.point(0).equal(0, 0));
  t.ok(p.point(1).equal(0, 10));
  t.ok(p.point(2).equal(-10, 10));
  t.ok(p.point(3).equal(-10, 0));
  t.end();
});

test('Polygon#rotate - chain', function(t) {
  var p = Polygon();
  t.equal(p, p.rotate());
  t.end();
});

test('Polygon#rotate - return a new polgyon when returnNew is specified', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10)
  ]);

  var p2 = p.rotate(Math.PI/2, Vec2(0, 0), true); // rotate 90 degrees

  t.ok(p.point(0).equal(0, 0));
  t.ok(p.point(1).equal(10, 0));
  t.ok(p.point(2).equal(10, 10));
  t.ok(p.point(3).equal(0, 10));

  t.ok(p2.point(0).equal(0, 0));
  t.ok(p2.point(1).equal(0, 10));
  t.ok(p2.point(2).equal(-10, 10));
  t.ok(p2.point(3).equal(-10, 0));
  t.end();
});

test('Polygon#equal - compare order and value', function(t) {
  t.ok(Polygon([Vec2(1, 1)]).equal(Polygon([Vec2(1, 1)])));
  t.ok(!Polygon([Vec2(1, 1)]).equal(Polygon([Vec2(1, 0)])));
  t.end();
});

test('Polygon#translate - move a polygon', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10)
  ]);

  p.translate(Vec2(10, 10));

  t.ok(p.equal(Polygon([
    Vec2(10, 10),
    Vec2(20, 10),
    Vec2(20, 20),
    Vec2(10, 20)
  ])));
  t.end();
});

test('Polygon#translate - return a new polygon if specified', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10)
  ]);

  var p2 = p.translate(Vec2(10, 10), true);

  t.ok(p2.equal(Polygon([
    Vec2(10, 10),
    Vec2(20, 10),
    Vec2(20, 20),
    Vec2(10, 20)
  ])));

  t.ok(p.equal(Polygon([
    Vec2(0, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(0, 10)
  ])));
  t.end();
});

test('Polygon#selfIntersections - no intersections', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(0, 10),
    Vec2(10, 10),
    Vec2(10, 0),
  ]);

  var isects = p.selfIntersections();
  t.equal(isects.length, 0, 'no intersections');
  t.end();
});

test('Polygon#selfIntersections - no intersections', function(t) {
  var p = Polygon([
    Vec2(0, 0),
    Vec2(10, 10),
    Vec2(0, 10),
    Vec2(10, 0),
  ]);

  var isects = p.selfIntersections();
  t.deepEqual(isects, {
    points: [ { x: 5, y: 5, s: 0.5, b: 2.5, si: 0, bi: 2 } ]
  }, 'single intersection');
  t.end();
});

test('Polygon#selfIntersections - returns a polygon', function(t) {
  var p = Polygon([
    Vec2(-10, 0),
    Vec2(10, 0),
    Vec2(10, 10),
    Vec2(1, 10),
    Vec2(1, -1),
    Vec2(-1, -1),
    Vec2(-1, 10),
    Vec2(-10, 10)
  ]);

  var isects = p.selfIntersections();

  t.equal(2, isects.length);
  t.ok(isects.point(0).equal(Vec2(1, 0)));
  t.ok(isects.point(1).equal(Vec2(-1, 0)));
  t.end();
});

test('Polygon#containsCircle - return detect circle-like containment', function(t) {

  var p = Polygon([
    Vec2(0, 0),
    Vec2(20, 0),
    Vec2(20, 20),
    Vec2(0, 20)
  ]);

  t.ok(p.contains({
    position: Vec2(10, 10),
    radius : 10
  }));

  t.ok(!p.contains({
    position: Vec2(10, 10),
    radius : 10.1
  }));
  t.end();
});

test('Polygon#containsCircle - return detect circle-like containment (function)', function(t) {

  var p = Polygon([
    Vec2(0, 0),
    Vec2(20, 0),
    Vec2(20, 20),
    Vec2(0, 20)
  ]);

  t.ok(p.contains({
    position: Vec2(10, 10),
    radius : function(t) { return 10; }
  }));

  t.ok(!p.contains({
    position: Vec2(10, 10),
    radius : function(t) { return 10.1 }
  }));

  t.ok(!p.rewind(false).contains({
    position: Vec2(10, 10),
    radius : function(t) { return 10.1 }
  }));
  t.end();
});

test('Polygon#containsCircle - not contain a circle outside of its bounds', function(t) {
  var p = Polygon([
    Vec2(-11,11),
    Vec2(15,-4),
    Vec2(32,12),
    Vec2(29,40),
    Vec2(-15,28)
  ]);

  t.ok(!p.containsCircle({
    position: Vec2(-29, -19),
    radius: 13.03840481
  }));
  t.end();
});


test('Polygon#containsCircle - handle the case where a line goes through the circle', function(t) {

  /*

    o---o
    |   |    ___
    |   |   -   -
    |   o- |-----|-o
    |      |  o  | |
    |       -___-  |
    |              |
    o--------------o

    yeah, it's a circle..
  */

  var p = new Polygon([
    Vec2(0, 0),
    Vec2(100, 0),
    Vec2(100, 50),
    Vec2(25, 50),
    Vec2(25, 100),
    Vec2(0, 100)
  ]);

  t.ok(!p.containsCircle(75,49, 10));
  t.end();
});

test('Polygon#contains - polygon containment', function(t) {
  var p = Polygon([
    Vec2(10, 10),
    Vec2(20, 10),
    Vec2(20, 20),
    Vec2(10, 20)
  ]);

  var p2 = Polygon([
    Vec2(11, 11),
    Vec2(19, 11),
    Vec2(19, 19),
    Vec2(11, 19)
  ]);

  var p3 = Polygon([
    Vec2(11, 9),
    Vec2(19, 11),
    Vec2(19, 19),
    Vec2(11, 19)
  ]);

  t.ok(p.contains(p2));
  t.ok(!p.contains(p3))
  t.end();
});

test('Polygon#contains - bounding-box-like containment', function(t) {

  var p = Polygon([
    Vec2(0, 0),
    Vec2(20, 0),
    Vec2(20, 20),
    Vec2(0, 20)
  ]);

  t.ok(p.contains({
    x1: 1,
    y1: 1,
    x2: 5,
    y2: 5
  }));

  t.ok(!p.contains({
    x1: 1,
    y1: 1,
    x2: 5,
    y2: 50
  }));
  t.end();
});

test('Polygon#contains - rect-like containment (w/h)', function(t) {

  var p = Polygon([
    Vec2(0, 0),
    Vec2(20, 0),
    Vec2(20, 20),
    Vec2(0, 20)
  ]);

  t.ok(p.contains({
    x: 1,
    y: 1,
    w: 5,
    h: 5
  }));

  t.ok(!p.contains({
    x: 1,
    y: 1,
    w: 5,
    h: 50
  }));
  t.end();
});

test('Polygon#contains - containment (width/height)', function(t) {

  var p = Polygon([
    Vec2(0, 0),
    Vec2(20, 0),
    Vec2(20, 20),
    Vec2(0, 20)
  ]);

  t.ok(p.contains({
    x: 1,
    y: 1,
    width: 5,
    height: 5
  }));

  t.ok(!p.contains({
    x: 1,
    y: 1,
    width: 5,
    height: 50
  }));
  t.end();
});

test('Polygon#toArray', function(t) {

  var points = [
    [0, 0],
    [1, 0],
    [1, 1]
  ];

  var out = Polygon(points).toArray();
  t.deepEqual(out, points);
  t.end();
});

test('Polygon#union', function(t){
  var result = Polygon([
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2]
  ]).union(Polygon([
    [1, 1],
    [3, 1],
    [3, 3],
    [1, 3]
  ]))

  t.deepEqual(result.toArray(), [
    [2, 1],
    [2, 0],
    [0, 0],
    [0, 2],
    [1, 2],
    [1, 3],
    [3, 3],
    [3, 1]
  ]);

  t.end();
})

test('Polygon#cut', function(t){
  var result = Polygon([
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2]
  ]).cut(Polygon([
    [1, 1],
    [3, 1],
    [3, 3],
    [1, 3]
  ]))

  t.equal(result.length, 1);

  t.deepEqual(result[0].toArray(), [
    [2, 1],
    [2, 0],
    [0, 0],
    [0, 2],
    [1, 2],
    [1, 1]
  ]);
  t.end();
})

test('Polygon#intersect', function(t){
  var result = Polygon([
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2]
  ]).intersect(Polygon([
    [1, 1],
    [3, 1],
    [3, 3],
    [1, 3]
  ]))

  t.equal(result.length, 1);

  t.deepEqual(result[0].toArray(), [
    [2, 1],
    [2, 2],
    [1, 2],
    [1, 1]
  ]);

  t.end();
})


test('issue 6 (NaN)', function(t) {
  var point = Vec2(10, 10);
  var pol = Polygon([
    [1,1],
    [5,1],
    [5,5],
    [1,5],
    [1,1]
  ]);
  var r = pol.closestPointTo(point);

  t.equal(r.x, 5, 'x matches');
  t.equal(r.y, 5, 'y matches');

  t.end();
})

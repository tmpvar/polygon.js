var assert = require('assert');
var Polygon = require('../polygon');
var Vec2 = require('vec2');

describe('Polygon', function() {

  describe('#constructor', function() {
    it('should take an array of vec2s', function() {
      var p = new Polygon([
        Vec2(1,2),
        Vec2(100,200),
        Vec2(0,200)
      ]);

      assert.equal(p.points.length, 3);
    });
  });

  describe('#each', function() {
    it('should return the prev, current, next, and idx', function() {
      var p = new Polygon([
        Vec2(1,2),
        Vec2(100,200),
        Vec2(0,200)
      ]);

      p.each(function(prev, current, next, idx) {

        if (idx === 0) {
          assert.equal(prev, p.points[2]);
          assert.equal(current, p.points[0]);
          assert.equal(next, p.points[1]);
        }

        if (idx === 1) {
          assert.equal(prev, p.points[0]);
          assert.equal(current, p.points[1]);
          assert.equal(next, p.points[2]);
        }

        if (idx === 2) {
          assert.equal(prev, p.points[1]);
          assert.equal(current, p.points[2]);
          assert.equal(next, p.points[0]);
        }
      });
    });

    it('should allow exiting early', function() {
      var p = new Polygon([
        Vec2(1,2),
        Vec2(100,200),
        Vec2(0,200)
      ]);

      p.each(function(prev, current, next, idx) {
        assert.equal(idx, 0);
        return false;
      });
    });
  });


  describe('#area', function() {
    it('it should properly compute the area of a triangle', function() {
      var p = new Polygon([
        Vec2(200,200),
        Vec2(200,0),
        Vec2(0,0)
      ]);

      var area = p.area();

      assert.equal(area, 200*200/2);
    });

    it('it should properly compute the area of a square', function() {
      var p = new Polygon([
        Vec2(0,200),
        Vec2(200,200),
        Vec2(200,0),
        Vec2(0,0)
      ]);

      var area = p.area();

      assert.equal(area, 200*200);
    });
  });

  describe('#winding', function() {

    it('should detect a polygon wound clockwise', function() {
      var p = new Polygon([
        Vec2(200,200),
        Vec2(200,0),
        Vec2(0,0)
      ]);

      assert.ok(p.winding());
    });

    it('should detect a polygon wound counterclockwise', function() {
      var p = new Polygon([
        Vec2(0,0),
        Vec2(200,0),
        Vec2(200,200)
      ]);

      assert.ok(!p.winding());
    });
  });

  describe('#rewind', function() {
    it('should rewind a counterclockwise to clockwise', function() {

      var p = new Polygon([
        Vec2(0,0),
        Vec2(200,0),
        Vec2(200,200)
      ]);

      assert.ok(!p.winding());
      p.rewind(true);
      assert.ok(p.winding());
    });


    it('should rewind a clockwise to counterclockwise', function() {
      var p = new Polygon([
        Vec2(200,200),
        Vec2(200,0),
        Vec2(0,0)
      ]);

      assert.ok(p.winding());
      p.rewind(false);
      assert.ok(!p.winding());
    });


    it('should rewind an arbitrary polygon to the winding specified', function() {
      var p = new Polygon([
        Vec2(200,200),
        Vec2(200,0),
        Vec2(0,0)
      ]);

      p.rewind(false);
      assert.ok(!p.winding());

      p.rewind(true);
      assert.ok(p.winding());
    });
  });

  describe('#closestPointTo', function() {
    it('should identify the closest point in the polygon to the incoming vector', function() {
      var p = new Polygon([
        Vec2(200,200),
        Vec2(200,0),
        Vec2(0,0)
      ]);

      var point = p.closestPointTo(Vec2(300,300));
      assert.equal(point.x, 200);
      assert.equal(point.y, 200);
    })
  });

  it('should identify the closest point in the polygon to the incoming vector', function() {
    var p = new Polygon([
      Vec2(0,200),
      Vec2(200,200),
      Vec2(200,0),
      Vec2(0,0)
    ]);

    var point = p.closestPointTo(Vec2(300,100));
    assert.equal(point.x, 200);
    assert.equal(point.y, 100);
  });
});
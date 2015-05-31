# polygon.js

## Install


__nodejs__

`npm install polygon`

## Usage

Create a new polygon:

```javascript
var p = new Polygon([
  Vec2(0, 0),
  Vec2(10, 0),
  Vec2(0, 10)
]);

```

You can pass an array of `Vec2`s, arrays `[x, y]`, or objects `{ x: 10, y: 20 }`


## Supported Methods

* `each(function(prev, current, next, idx) {})`
* `point(idx)` - returns the point at index `idx`. note: this will wrap in both directions
* `dedupe(returnNew)` - ensure all of the points are unique
* `insert(vec2, index)` - insert `vec2` at the specified index
* `remove(vecOrIndex)` - remove the specified `vec2` or numeric index from this polygon
* `clean(returnNew)` - removes contiguous points that are the same
* `winding()` - returns the direction in which a polygon is wound (true === clockwise)
* `rewind(bool)` - rewinds the polygon in the specified direction (true === clockwise)
* `area()` - computes the area of the polygon
* `closestPointTo(vec2)` - finds the closest point in this polygon to `vec2`
* `center()` - returns a `Vec2` at the center of the AABB
* `scale(amount, origin, returnNew)` - scales this polygon around `origin` (default is `this.center()`) and will return a new polygon if requested with `returnNew`
* `containsPoint(vec2)` - returns true if `vec2` is inside the polygon
* `containsPolygon(poly)` - returns true if `poly` is completely contained in this polygon
* `aabb()` - returns an object `{x:_, y:_, w:_, h:_}` representing the axis-aligned bounding box of this polygyon
* `offset(amount)` - performs an offset/buffering operation on this polygon and returns a new one
* `line(index)` - return an array `[startpoint, endpoint]` representing the line at the specified `index`
* `lines(function(start, end, index) {})` - iterate over the lines in this polygon
* `selfIntersections` - find self-intersections and return them as a new polygon
* `pruneSelfIntersections` - remove self intersections from this polygon.  returns an array of polygons
* `length` - returns the number of points in this polygon
* `clone` - return a new instance of this polygon
* `rotate(rads, vec2, returnNew)` - rotate by origin `vec2` (default `this.center()`) by radians `rads` and return a clone if `returnNew` is specified
* `translate(vec2, returnNew)` - translate by `vec2` and return a clone if `returnNew` is specified
* `equal(poly)` - return true if this polygon has the same components and the incoming `poly`
* `contains(thing)` - works with an array of vec2's, an object containing a `.position` and `.radius`, an object populated with x1,y1,x2,y2, an object populated with x,y,w,h, and an object populated with x,y,width,height.  See the tests for more info
* `union(polygon)` returns a new polygon representing the boolean union of `this` and the incoming `polygon`
* `cut(polygon)` returns a new polygon representing the boolean cut of `polygon` from `this`
* `toArray()` convert this polygon into an array of arrays (`[[x, y]]`)

## license

MIT

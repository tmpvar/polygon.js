# polygon.js

## Install


__nodejs__

`npm install polygon`


# Supported Methods

* `each(function(prev, current, next, idx) {})`
* `point(idx)`
* `dedupe(returnNew)` - ensure all of the points are unique
* `remove(idx)`
* `clean(returnNew)` - removes contiguous points that are the same
* `winding()` - returns the direction in which a polygon is wound (true === clockwise)
* `rewind(bool)` - rewinds the polygon in the specified direction (true === clockwise)
* `area()` - computes the area of the polygon
* `closestPointTo(vec2)` - finds the closest point in this polygon to `vec2`
* `scale(amount)` - scales this polygon
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
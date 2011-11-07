function V2(x,y) {
    this.x = x;
    this.y = y;
}

V2.prototype.add = function(vector) {
    return new V2(this.x + vector.x, this.y + vector.y);
};

V2.prototype.sub = function(vector) {
    return new V2(this.x - vector.x, this.y - vector.y);
};

V2.prototype.mul = function(val) {
    if (typeof val == "V2")
        return new V2(this.x * val.x, this.y * val.y);
    else
        return new V2(this.x * val, this.y * val);
};

V2.prototype.length = function() {
    return Math.sqrt(this.x*this.x + this.y*this.y);
};

V2.prototype.normalize = function() {
    return new V2(this.x/this.length(), this.y/this.length());
};

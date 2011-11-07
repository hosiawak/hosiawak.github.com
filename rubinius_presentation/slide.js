$(function() {
    g = $g().size(610,300).place('#canvas');

    function Square(segment, row, column, idx) {
        this.segment = segment;
        this.row = row;
        this.column = column;
        this.idx = idx;
        this.width = this.calcWidth();
        this.height = this.calcHeight();
        this.half_width = this.width/2;
        this.half_height = this.height/2;
        this.appearing_time = 4;
        this.dx = this.half_width/this.appearing_time;
        this.dy = this.half_height/this.appearing_time;
        this.position = new V2(this.calcX(), this.calcY());
        this.state = 'new';
        this.states = ['new', 'appearing', 'appeared'];
        this.new_fill = '#f5be10';
        this.live_fill = '#8cb61d';
        this.speed = 30;
    }

    Square.prototype.calcWidth = function() {
        return (this.segment.width / this.segment.columns - this.segment.spacing - this.segment.padding / this.segment.columns);
    };

    Square.prototype.calcHeight = function() {
        return (this.segment.height / this.segment.rows - this.segment.spacing - this.segment.padding / this.segment.rows);
    };

    Square.prototype.calcX = function() {
        var padX = (this.column-1) == 0 ? 0 : 1;
        return (this.column-1)*this.width + (this.column-1)*padX*this.segment.spacing + this.segment.padding + this.segment.x;
    };

    Square.prototype.calcY = function() {

        var padY = (this.row-1) == 0 ? 0 : 1;
        return (this.row-1)*this.height + (this.row-1)*padY*this.segment.spacing + this.segment.padding + this.segment.y;
    };

    Square.prototype.other_segment = function() {
        return this.segment.other_segment;
    };

    Square.prototype.move = function() {
        this.destination = this.other_segment().new_slot_coords();
        this.moving = this.destination.sub(this.position);
        this.state = 'moving';
        g.add('square_moving', this);
    };

    Square.prototype.draw = function(ctx, canvas) {
        switch(this.state) {
        case 'new':
        break;
        case 'appearing':

        ctx.fillStyle = this.new_fill;
        ctx.save();
        ctx.translate(this.half_width-this.dx, this.half_height-this.dy);
        ctx.fillRect(this.position.x, this.position.y, 2*this.dx, 2*this.dy);
        ctx.restore();
        this.appearing_time -= 1;
        this.dx += this.dx;
        this.dy += this.dy;
        if (this.appearing_time < 2) {
            this.segment.square_appeared(this);
            this.state = 'appeared';
        }
        break;
        case 'appeared':
        ctx.fillStyle = this.new_fill;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        break;
        case 'live':
        ctx.fillStyle = this.live_fill;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        break;
        case 'moving':

        this.position = this.position.add(this.moving.normalize().mul((this.speed)));
        if (this.position.x < this.destination.x) {
            ctx.fillStyle = this.live_fill;
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        } else {
            // done moving
            this.segment.square_moved(this);
        }
        break;
        }
    };

    function Scanner(segment, width) {
        this.segment = segment;
        this.width = width;
        this.x = segment.x;
        this.y = segment.y;
        this.height = segment.height;
        this.fill = '#ae0f0f';
        this.speed = 6;
        this.d = 0;
        this.last_column = 0;
    }

    Scanner.prototype.draw = function(ctx, canvas) {
        this.d += this.speed;
        if (this.x + this.d + this.width < this.segment.width) {
            // if scanner is over a column mark some objects as 'live'
            var column = Math.ceil((this.x + this.d) / this.segment.slots[0].width);
            if (this.last_column != column) {
                $.each(this.segment.slots, function(idx, item) {
                        if (item.column == column && Math.random() < 0.1) {
                            item.state = 'live';
                        }
                    });
                this.last_column = column;
            }
            ctx.fillStyle = this.fill;
            ctx.save();
            ctx.translate(this.d, 0);
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        } else {
            // make the scanner disappear
            g.remove('scanner');
            this.segment.done_scanning();
        }
    };

    function Segment(x,y,width, height, name) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.fill = '#eee';
        this.columns = 8;
        this.rows = 8;
        this.slots = [];
        this.width = width;
        this.height = height;
        this.padding = 5;
        this.spacing = 5;
        this.live_objects = 4;
    }

    Segment.prototype.draw = function(ctx, canvas) {
        ctx.fillStyle = this.fill;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    };

    Segment.prototype.new_slot_coords = function() {
        this.slots.forEach(function(o) {
            if (o.state == "new") return new V2(o.position.x, o.position.y);
            });
    };

    Segment.prototype.square_appeared = function(square) {
        if (square.idx+1 < this.slots.length && this.slots[square.idx+1].state == 'new')
            this.slots[square.idx+1].state = 'appearing';
        else
            this.done_appearing();
    };

    Segment.prototype.done_appearing = function() {
        // start scanning
        g.add('scanner', new Scanner(this, 40));
    };

    Segment.prototype.done_scanning = function() {
        // remove all squares
        g.remove('squareA');
        // find appeared squares
        $.each(this.slots, function(idx,item) {
                if (item.state == "appeared")
                    g.add('square_appeared', item);
            });
        var moving = false;
        $.each(this.slots, function(idx, item) {
                if (item.state == "live") {
                    if (moving == false) {
                        item.move();
                        moving = true;
                    } else {
                        g.add('square_live', item);
                    }
                }
            });
    }

    Segment.prototype.square_moved = function(square) {
        g.remove('square_moving');
        for(var i = 0; i < this.other_segment.slots.length; i++) {
            var o = this.other_segment.slots[i];
            if (o.state == "new") {
                o.state='live';
                break;
            }
        }
        for(var i = 0; i < this.slots.length; i++) {
            var o = this.slots[i];
            if (typeof o == "Square" && o.row == square.row && o.column == square.column) {
                this.slots[i] = undefined;
            }
            if (o.state == "live") {
                o.move();
                break;
            }
        }
    };

    var segmentA = new Segment(0,0,290,250);
    var segmentB = new Segment(320,0,290,250);
    segmentA.other_segment = segmentB;
    segmentB.other_segment = segmentA;
    g.add('segA', segmentA);
    g.add('segB', segmentB);
    var idx = 0;
    for(var row = 1; row <= segmentA.rows; row++) {
        for(var column = 1; column <= segmentA.columns; column++) {
            var squareA = new Square(segmentA, row, column, idx);
            var squareB = new Square(segmentB, row, column, idx);
            g.add('squareA', squareA);
            g.add('squareB', squareB);
            idx += 1;
            segmentA.slots.push(squareA);
            segmentB.slots.push(squareB);
        }
    }
    // kick off animation
    segmentA.slots[0].state = 'appearing';
    g.play(30);
});
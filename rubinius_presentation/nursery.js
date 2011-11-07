window.nursery = function() {

    function Block(slot) {
        this.slot = slot;
        this.position = new V2(0,0);
        this.width = 0;
        this.height = 0;
        this.fill = '#fff';
    }

    Block.prototype.draw = function(ctx, canvas) {
        ctx.fillStyle = this.fill;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    };

    function Slot(segment, row, column) {
        this.segment = segment;
        this.row = row;
        this.column = column;
        this.width = segment.slotWidth();
        this.height = segment.slotHeight();
        this.position = this.calculatePosition();
        this.block = null;
        this.new_fill = '#f5be10';
        this.live_fill = '#8cb61d';
        this.status = 'idle';
        this.currentFade = 1;
    }

    Slot.prototype.calculatePosition = function() {
        var col0 = this.column-1;
        var padX = col0 == 0 ? 0 : 1;
        var x = col0*this.width + col0*padX*this.segment.spacing + this.segment.padding + this.segment.position.x;
        var row0 = this.row-1;
        var padY = row0 == 0 ? 0 : 1;
        var y = row0*this.height + row0*padY*this.segment.spacing + this.segment.padding + this.segment.position.y;
        return new V2(x,y);
    };

    Slot.prototype.isEmpty = function() {
        return (this.block === null);
    };

    Slot.prototype.empty = function() {
        this.block = null;
        this.status = 'idle';
        return true;
    };

    Slot.prototype.fill = function() {
        this.block = new Block(this);
    };

    Slot.prototype.allocate = function() {
        if (this.isEmpty()) this.fill();
        this.block.position = new V2(this.position.x+this.width/2, this.position.y+this.height/2);
        this.status = 'allocating';
    };

    Slot.prototype.moveLive = function(dest) {
        this.dest = dest;
        this.status = 'moving_live';
    };

    Slot.prototype.draw = function(ctx, canvas) {
        if (!this.isEmpty()) {

            switch(this.status) {
            case 'allocating':
            this.block.fill = this.new_fill;
            var speed = 5;
            var move = this.position.sub(new V2(this.position.x+this.width/2, this.position.y+this.height/2)).normalize().mul(speed);
            this.block.position = this.block.position.add(move);
            this.block.width = this.block.width + Math.abs(move.x*2);
            this.block.height = this.block.height + Math.abs(move.y*2);
            if (this.block.width > this.width) {
                this.status = 'allocated';
                this.segment.allocateBlocks();
            }
            this.block.draw(ctx, canvas);
            break;
            case 'allocated':
            this.block.fill = this.new_fill;
            this.block.position = this.position;
            this.block.width = this.width;
            this.block.height = this.height;
            this.block.draw(ctx, canvas);
            break;
            case 'live':
            this.block.fill = this.live_fill;
            this.block.position = this.position;
            this.block.width = this.width;
            this.block.height = this.height;
            this.block.draw(ctx, canvas);
            break;
            case 'moving_live':
            var speed = 20;
            var move = this.dest.position.sub(this.position).normalize().mul(speed);
            this.block.position = this.block.position.add(move);
            var distance = this.dest.position.sub(this.block.position).length();
            if (distance < speed) {
                this.status = 'moved_live';
                this.segment.movedLive(this, this.dest);
            } else {
                this.block.draw(ctx, canvas);
            }
            break;
            }
        }
    };

    function Scanner(segment, width) {
        this.segment = segment;
        this.width = width;
        this.position = segment.position;
        this.height = segment.height;
        this.fill = '#ae0f0f';
        this.speed = 4;
        this.last_column = 0;
    }

    Scanner.prototype.draw = function(ctx, canvas) {
        var move = this.segment.position.add(new V2(this.position.x+this.width, this.position.y)).normalize();
        this.position = this.position.add(move.mul(this.speed));
        if (this.position.x+this.width < this.segment.position.x+this.segment.width) {

            // if scanner is over a column mark some objects as 'live'
            var column = Math.ceil((this.position.x - this.segment.position.x) / this.segment.slots[0].width);
            if (this.last_column != column) {
                this.segment.slots.each(function(slot) {
                        if (slot.column == column && Math.random() < 0.1) {
                            slot.status = 'live';
                        }
                    });
                this.last_column = column;
            }
            ctx.fillStyle = this.fill;
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        } else {
            // make the scanner disappear

            this.segment.doneScanning();
        }
    };

    function Segment(scene, name, position, width, height) {
        this.scene = scene;
        this.name = name;
        this.position = position;
        this.width = width;
        this.height = height;
        this.columns = 8;
        this.rows = 8;
        this.fill = "#ddd";
        this.padding = 5;
        this.spacing = 5;
        this.createSlots();
    }

    Segment.prototype.createSlots = function() {
        this.slots = [];
        for(var row = 1; row <= this.rows; row++) {
            for(var column = 1; column <= this.columns; column++) {
                this.slots.push(new Slot(this, row, column));
            }
        }
        this.slots_length = this.slots.length;
    };

    Segment.prototype.fillSlots = function() {
        this.slots.each(function(slot) {
                if (slot.isEmpty()) slot.fill();
            });
    };

    Segment.prototype.emptySlots = function() {
        this.slots.each(function(slot) {
                if (!slot.isEmpty()) slot.empty();
            });
    };

    Segment.prototype.firstEmptySlot = function() {
        return this.slots.detect(function(slot) {
                if (slot.isEmpty()) return true;
            });
    };

    Segment.prototype.allocateBlocks = function() {
        var idle_slot = this.slots.detect(function(slot) {
                if (slot.status == "idle") {
                    return true;
                }
            });
        if (idle_slot) {
            idle_slot.allocate();
        }
    };

    Segment.prototype.scan = function() {
        // mark all non empty slots as allocated
        this.slots.each(function(slot) {
                if (!slot.isEmpty()) {
                    slot.status = 'allocated';
                }
            });
        this.scanner = new Scanner(this, 40);
    };

    Segment.prototype.moveLive = function() {
        var dest = this.scene.findInactiveSegment().firstEmptySlot(),
        live_slot = this.slots.detect(function(slot) {
                if (slot.status == "live") return true;
            });
        if (live_slot) live_slot.moveLive(dest);
    };

    Segment.prototype.movedLive = function(source, dest) {
        source.empty();
        dest.fill();
        dest.status = 'live';
        this.moveLive();
    };

    Segment.prototype.doneScanning = function() {
        this.scanner = null;
    };

    Segment.prototype.slotWidth = function() {
        return (this.width / this.columns - this.spacing - this.padding / this.columns);
    };

    Segment.prototype.slotHeight = function() {
        return (this.height / this.rows - this.spacing - this.padding / this.rows);
    };

    Segment.prototype.fadeGarbage = function() {
        this.slots.each(function(slot) {
                slot.empty();
            });
    };

    Segment.prototype.draw = function(ctx, canvas) {
        ctx.fillStyle = this.fill;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'normal 40px sans-serif';
        ctx.fillText(this.name, this.position.x+this.width/6, this.position.y+this.height/1.8);
    };

    Segment.prototype.drawSlots = function(ctx, canvas) {
        var liveSlots = [];
        this.slots.each(function(slot) {
            if (slot.status == "moving_live")
                liveSlots.push(slot);
            else
                slot.draw(ctx, canvas);
            });
        // live slots
        liveSlots.each(function(live_slot) {
                live_slot.draw(ctx,canvas);
            });
        if (this.scanner) this.scanner.draw(ctx, canvas);
    };

    function Legend(position) {
        this.position = position;
        this.liveText = "NEW OBJECT";
        this.survivingText = "SURVIVING OBJECT";
        this.fontColor = '#333';
        this.font = 'normal 20px sans-serif';
        this.newFill = '#f5be10';
        this.liveFill = '#8cb61d';
    }

    Legend.prototype.draw = function(ctx, canvas) {
        ctx.fillStyle = this.newFill;
        ctx.fillRect(this.position.x, this.position.y, 40, 30);
        ctx.fillStyle = this.liveFill;
        ctx.fillRect(this.position.x, this.position.y+40, 40, 30);
        ctx.fillStyle = this.fontColor;
        ctx.font = this.font;
        ctx.fillText(this.liveText, this.position.x + 50, this.position.y+22);
        ctx.fillText(this.survivingText, this.position.x + 50, this.position.y + 62);
    };

    function Scene() {
        this.canvas = document.getElementById("nursery_canvas");
        this.ctx = this.canvas.getContext("2d");
        this.setup();
        this.activeSegment = null;
        this.currentStep = null;
        this.steps = ['allocate', 'scan', 'moveLive', 'fadeGarbage'];
        this.button = document.getElementById("nursery_button");
        this.button.onclick = this.nextStep.bind(this);
    }

    Scene.prototype.setup = function() {
        var segmentA, segmentB;
        segmentA = new Segment(this, 'Nursery', new V2(0,0), 290, 250);
        segmentA.createSlots();
        segmentB = new Segment(this, 'Young gen', new V2(320,0), 290, 250);
        segmentB.createSlots();
        console.log(segmentB);
        this.segments = [segmentA, segmentB];
        this.legend = new Legend(new V2(640,0));
    };

    Scene.prototype.findActiveSegment = function() {
        var emptySegment;
        if (!this.activeSegment) {
            // finds the first empty segment
            emptySegment = this.segments.detect(function(segment) {
                    if (segment.firstEmptySlot()) {
                        return true;
                    }});
            if (emptySegment) {
                this.activeSegment = emptySegment;
            } else {
                alert("no empty segment found");
            }
        }
        return this.activeSegment;
    };

    Scene.prototype.findInactiveSegment = function() {
        if (!this.inactiveSegment) {
            for(var i = 0; i < this.segments.length; i++) {
                var s = this.segments[i];
                if (this.activeSegment !== s) {
                    this.inactiveSegment = s;
                    return s;
                }
            }
        } else return this.inactiveSegment;
    };

    Scene.prototype.toggleSegmentActive = function() {
        var tmp = this.activeSegment;
        this.activeSegment = this.inactiveSegment;
        this.inactiveSegment = tmp;
    };

    Scene.prototype.allocate = function() {
        this.findActiveSegment().allocateBlocks();
    };

    Scene.prototype.scan = function() {
        this.findActiveSegment().scan();
    };

    Scene.prototype.moveLive = function() {
        this.findActiveSegment().moveLive();
    };

    Scene.prototype.fadeGarbage = function() {
        this.findActiveSegment().fadeGarbage();
        //        this.toggleSegmentActive();
    };

    Scene.prototype.nextStep = function() {
        var firstStep = this.steps[0];
        var nextStep = firstStep;
        for(var i = 0; i < this.steps.length; i++) {
            if (this.currentStep === this.steps[i]) {
                if (i+1 < this.steps.length)
                    nextStep = this.steps[i+1];
            }
        }
        this.currentStep = nextStep;
        this[nextStep].call(this);
        return nextStep;
    };

    Scene.prototype.draw = function() {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
        for (var i = 0; i < this.segments.length; i++) {
            this.segments[i].draw(this.ctx, this.canvas);
        }
        for (var i = 0; i < this.segments.length; i++) {
            this.segments[i].drawSlots(this.ctx, this.canvas);
        }
        this.legend.draw(this.ctx, this.canvas);
    };

    var scene = new Scene();
    setInterval(function() { scene.draw()}, 25);

};
Array.method('each', function(f) {
        var i;
        for (i = 0; i < this.length; i += 1) {
            f(this[i]);
        }
    });

Array.method('mapa', function(f) {
        var ary = [];
        this.each(function(e) {
                ary.push(f(e));
            });
        return ary;
    });

Array.method('reduce', function(f, value) {
        this.each(function(e) {
                value = f(e, value);
            });
        return value;
    });

Array.method('detect', function(f) {
        var i, current, found;
        for (i = 0; i < this.length; i += 1) {
            current = this[i];
            if (f(current) === true) {
                    found = current;
                    break;
            }
        }
        return found;
    });
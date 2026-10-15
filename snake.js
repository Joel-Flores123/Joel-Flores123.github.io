// A little snake that lives behind the page content. It chases the mouse, and wanders on its
// own when the mouse is idle or off the page.
(function () {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var canvas = document.createElement("canvas");
    canvas.id = "snake";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    var color = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#5e2b7e";
    var SEGMENTS = 22;
    var SPACING = 7;
    var SPEED = 90;          // wandering speed, px per second
    var CHASE_SPEED = 220;   // speed when chasing the mouse
    var MARGIN = 80;         // start turning back this far from the edge
    var IDLE_MS = 4000;      // go back to wandering after the mouse sits still this long

    var mouse = { x: 0, y: 0, seen: false, lastMove: -Infinity };
    window.addEventListener("pointermove", function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.seen = true;
        mouse.lastMove = performance.now();
    });
    document.addEventListener("pointerleave", function () { mouse.lastMove = -Infinity; });

    // Scrolling carries the snake along with the page, then it chases the cursor back.
    var lastScrollY = window.scrollY;
    window.addEventListener("scroll", function () {
        var dy = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        // Don't let it get carried more than a little way off screen.
        var headY = body[0].y - dy;
        if (headY < -150) dy = body[0].y + 150;
        if (headY > height + 150) dy = body[0].y - height - 150;
        body.forEach(function (seg) { seg.y -= dy; });
        if (mouse.seen) mouse.lastMove = performance.now();
    }, { passive: true });

    var width, height;
    function resize() {
        var dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    var angle = Math.random() * Math.PI * 2;
    var turn = 0;
    var body = [];
    for (var i = 0; i < SEGMENTS; i++) {
        body.push({ x: width / 2 - Math.cos(angle) * i * SPACING, y: height / 2 - Math.sin(angle) * i * SPACING });
    }

    function angleTo(x, y) {
        var target = Math.atan2(y - body[0].y, x - body[0].x);
        return Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
    }

    function step(dt, now) {
        var head = body[0];
        var speed = SPEED;

        if (now - mouse.lastMove < IDLE_MS) {
            // Chase: turn toward the pointer, and slow down as it gets close so it doesn't orbit.
            turn = Math.max(-5, Math.min(5, angleTo(mouse.x, mouse.y) * 6));
            var dist = Math.hypot(mouse.x - head.x, mouse.y - head.y);
            speed = CHASE_SPEED * Math.min(1, Math.max(0, dist - 12) / 80);
        } else {
            // Wander: drift the turn rate randomly, with damping so it curves smoothly.
            turn += (Math.random() - 0.5) * 8 * dt;
            turn *= 0.97;
            turn = Math.max(-2.5, Math.min(2.5, turn));

            // Near an edge, steer back toward the middle of the screen.
            if (head.x < MARGIN || head.x > width - MARGIN || head.y < MARGIN || head.y > height - MARGIN) {
                turn += angleTo(width / 2, height / 2) * 4 * dt;
            }
        }

        angle += turn * dt;
        head.x += Math.cos(angle) * speed * dt;
        head.y += Math.sin(angle) * speed * dt;

        // Each segment follows the one in front of it at a fixed distance.
        for (var i = 1; i < body.length; i++) {
            var prev = body[i - 1], seg = body[i];
            var dx = seg.x - prev.x, dy = seg.y - prev.y;
            var d = Math.hypot(dx, dy) || 1;
            seg.x = prev.x + (dx / d) * SPACING;
            seg.y = prev.y + (dy / d) * SPACING;
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        // Body, drawn tail first so the head ends up on top.
        for (var i = body.length - 1; i >= 0; i--) {
            var t = 1 - i / body.length;
            ctx.beginPath();
            ctx.arc(body[i].x, body[i].y, 2 + t * 6, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.55 + t * 0.45;
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        var head = body[0];
        var cos = Math.cos(angle), sin = Math.sin(angle);

        // Tongue flicks out every couple of seconds.
        if (time % 2000 < 300) {
            var tx = head.x + cos * 16, ty = head.y + sin * 16;
            ctx.strokeStyle = "#d6336c";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(head.x + cos * 7, head.y + sin * 7);
            ctx.lineTo(tx, ty);
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(angle + 0.5) * 4, ty + Math.sin(angle + 0.5) * 4);
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(angle - 0.5) * 4, ty + Math.sin(angle - 0.5) * 4);
            ctx.stroke();
        }

        // Eyes.
        [-1, 1].forEach(function (side) {
            var ex = head.x + cos * 3 - sin * 3.5 * side;
            var ey = head.y + sin * 3 + cos * 3.5 * side;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#1f1f2e";
            ctx.beginPath();
            ctx.arc(ex + cos * 0.8, ey + sin * 0.8, 1.1, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    var last = performance.now();
    function frame(now) {
        var dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        step(dt, now);
        draw(now);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();

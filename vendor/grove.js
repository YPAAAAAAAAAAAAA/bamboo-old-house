/* Bamboo Old House — original WebGL grove.
   idea after @yuukilike (yuukilike/bamboo-old-house); clean-room implementation, no code copied. */
(function () {
  "use strict";

  var canvas = document.getElementById("stage");
  var panel = document.getElementById("panel");
  var lineEl = document.getElementById("line");
  if (!canvas || !panel) return;

  var sent = false;
  function markReady() {
    if (sent) return;
    var g = window.__gbSandbox;
    if (!g || typeof g.ready !== "function") return;
    sent = true;
    g.ready();
  }

  var FOVX = 54 * Math.PI / 180;
  var POND = { x: -2.2, z: 5.35, rx: 1.5, rz: 1.08 };

  var COL = {
    plaster: [0.84, 0.74, 0.58],
    plaster2: [0.76, 0.66, 0.5],
    timber: [0.46, 0.29, 0.17],
    timberDk: [0.32, 0.2, 0.12],
    roof: [0.22, 0.4, 0.36],
    roofDk: [0.14, 0.26, 0.24],
    door: [0.55, 0.18, 0.14],
    paper: [1, 0.84, 0.52],
    glow: [1, 0.58, 0.26],
    floor: [0.55, 0.38, 0.22],
    stone: [0.52, 0.48, 0.42],
    clay: [0.58, 0.32, 0.22],
    celadon: [0.36, 0.5, 0.46],
    boat: [0.43, 0.28, 0.16],
    boatDk: [0.3, 0.18, 0.11],
    interior: [0.07, 0.045, 0.035],
    well: [0.5, 0.48, 0.44],
    reed: [0.34, 0.42, 0.22],
    lily: [0.2, 0.42, 0.24]
  };

  var CULMS = [
    [0.64, 0.74, 0.32],
    [0.78, 0.78, 0.38],
    [0.42, 0.58, 0.26],
    [0.56, 0.68, 0.3],
    [0.7, 0.74, 0.34]
  ];
  var LEAVES = [
    [0.34, 0.58, 0.16],
    [0.18, 0.42, 0.12],
    [0.46, 0.66, 0.18],
    [0.14, 0.36, 0.1]
  ];

  var SPOTS = [
    [-6.5, -5.2, 9.6], [-4.8, -5.6, 10.4], [-3, -4.5, 8.8], [-0.8, -5.2, 10],
    [1.3, -4.8, 9], [3.3, -5.5, 10.6], [5.1, -4.2, 8.6], [6.7, -2.8, 9.4],
    [-7.4, -2.2, 8.2], [7.5, -1, 9.8], [-2.2, -3.5, 7.8], [2.4, -3.4, 8.4],
    [0.2, -3.2, 11.2], [-1.7, -2.8, 9.8], [1.9, -2.6, 10.5],
    [-5.2, -0.4, 8.5], [-6.6, 1, 9.6], [-4.1, 1.4, 7.3], [-5.8, 2.5, 8.9],
    [-3.7, 3.2, 6.7], [-6.9, 3.7, 10], [-4.6, 4.7, 7.5], [-5.5, 5.9, 8.7],
    [-7.3, 6.3, 7.9], [-3.9, 6.8, 6.5], [-6.1, 7.5, 9.1], [-4.5, 8.1, 7.1],
    [4.5, 0, 8.1], [5.9, 0.8, 9.3], [3.9, 1.8, 6.9], [6.5, 2.2, 8.7],
    [4.7, 3.4, 7.5], [5.7, 4.6, 9.5], [3.7, 5.2, 6.7], [6.9, 5.8, 8.3],
    [4.9, 6.8, 7.7], [7.3, 3.6, 9.1], [5.3, 7.7, 8.5],
    [3.35, 6.7, 7.4], [4.35, 5.35, 8.6], [-1.55, 7.15, 8.4], [2.15, 6.55, 7.2],
    [-2.85, 3.55, 8.6], [2.45, 3.35, 7.8], [-3.15, 2.15, 9.2], [2.85, 2.05, 8.4]
  ];

  function hash1(n) {
    var s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hypot2(x, y) { return Math.sqrt(x * x + y * y); }
  function norm3(a) {
    var l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }
  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function eyeY(x, z) {
    if (Math.abs(x) < 2.7 && z > 1.5 && z < 3.22) return 1.9;
    return 1.62;
  }
  function blocked(x, z) {
    if (Math.abs(x) < 3.15 && z > -2.3 && z < 3.45) return true;
    if (x < -2.5 && x > -4.6 && z > 0 && z < 1.85) return true;
    var dx = x - POND.x, dz = z - POND.z;
    if ((dx * dx) / (POND.rx * POND.rx) + (dz * dz) / (POND.rz * POND.rz) < 1.35) return true;
    return false;
  }

  function Mesh() { this.a = []; }
  Mesh.prototype.pushV = function (p, nx, ny, nz, col, kind) {
    this.a.push(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2], p[3], p[4], kind, p[5], p[6]);
  };
  Mesh.prototype.tri = function (A, B, C, col, kind) {
    var ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    var vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var len = Math.hypot(nx, ny, nz);
    if (len < 1e-7) return;
    nx /= len; ny /= len; nz /= len;
    this.pushV(A, nx, ny, nz, col, kind);
    this.pushV(B, nx, ny, nz, col, kind);
    this.pushV(C, nx, ny, nz, col, kind);
  };
  Mesh.prototype.quad = function (A, B, C, D, col, kind) {
    this.tri(A, B, C, col, kind);
    this.tri(A, C, D, col, kind);
  };

  function P(x, y, z, u, v) { return [x, y, z, u || 0, v || 0, 0, 0]; }
  function Rp(p, u, v) { return [p[0], p[1], p[2], u, v, 0, 0]; }

  function addBox(mesh, x0, y0, z0, x1, y1, z1, col, kind) {
    mesh.quad(P(x0, y0, z1, 0, 0), P(x1, y0, z1, 1, 0), P(x1, y1, z1, 1, 1), P(x0, y1, z1, 0, 1), col, kind);
    mesh.quad(P(x1, y0, z0, 0, 0), P(x0, y0, z0, 1, 0), P(x0, y1, z0, 1, 1), P(x1, y1, z0, 0, 1), col, kind);
    mesh.quad(P(x1, y0, z1, 0, 0), P(x1, y0, z0, 1, 0), P(x1, y1, z0, 1, 1), P(x1, y1, z1, 0, 1), col, kind);
    mesh.quad(P(x0, y0, z0, 0, 0), P(x0, y0, z1, 1, 0), P(x0, y1, z1, 1, 1), P(x0, y1, z0, 0, 1), col, kind);
    mesh.quad(P(x0, y1, z1, 0, 0), P(x1, y1, z1, 1, 0), P(x1, y1, z0, 1, 1), P(x0, y1, z0, 0, 1), col, kind);
    mesh.quad(P(x0, y0, z0, 0, 0), P(x1, y0, z0, 1, 0), P(x1, y0, z1, 1, 1), P(x0, y0, z1, 0, 1), col, kind);
  }

  function addCyl(mesh, x, z, y0, y1, r, segs, col, kind, cap) {
    var i, a0, a1, c0, s0, c1, s1, b0, b1, t0, t1;
    for (i = 0; i < segs; i++) {
      a0 = (i / segs) * Math.PI * 2;
      a1 = ((i + 1) / segs) * Math.PI * 2;
      c0 = Math.cos(a0); s0 = Math.sin(a0); c1 = Math.cos(a1); s1 = Math.sin(a1);
      b0 = P(x + c0 * r, y0, z + s0 * r, i / segs, 0);
      b1 = P(x + c1 * r, y0, z + s1 * r, (i + 1) / segs, 0);
      t1 = P(x + c1 * r, y1, z + s1 * r, (i + 1) / segs, 1);
      t0 = P(x + c0 * r, y1, z + s0 * r, i / segs, 1);
      mesh.quad(b0, b1, t1, t0, col, kind);
      if (cap) mesh.tri(P(x, y1, z, 0.5, 1), t0, t1, col, kind);
    }
  }

  function addCulm(mesh, x, z, h, r0, col, phase, lean) {
    var sides = 6, rings = 4, s, i, prev, cur, s2;
    var lx = Math.sin(lean) * 0.38, lz = Math.cos(lean) * 0.24;
    function ring(ri) {
      var t = ri / rings;
      var y = h * t;
      var rad = r0 * (1 - t * 0.42);
      var sway = Math.pow(t, 1.7);
      var ox = x + lx * t, oz = z + lz * t;
      var arr = [];
      for (s = 0; s < sides; s++) {
        var a = (s / sides) * Math.PI * 2 + 0.25;
        arr.push([ox + Math.cos(a) * rad, y, oz + Math.sin(a) * rad, s / sides, t, sway, phase]);
      }
      return arr;
    }
    prev = ring(0);
    for (i = 1; i <= rings; i++) {
      cur = ring(i);
      for (s = 0; s < sides; s++) {
        s2 = (s + 1) % sides;
        mesh.tri(prev[s], prev[s2], cur[s2], col, 2);
        mesh.tri(prev[s], cur[s2], cur[s], col, 2);
      }
      prev = cur;
    }
    var top = prev;
    var c = [x + lx, h, z + lz, 0.5, 1, 1, phase];
    for (s = 0; s < sides; s++) mesh.tri(c, top[s], top[(s + 1) % sides], col, 2);
  }

  function addLeaf(mesh, ox, oy, oz, yaw, pitch, len, wid, col, phase, sway) {
    var hw = wid * 0.5;
    var raw = [[-hw, 0, 0, 0, 0], [hw, 0, 0, 1, 0], [hw * 0.12, len, 0.03, 1, 1], [-hw * 0.12, len, 0.03, 0, 1]];
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var pts = [], i, x, y, z, y2, z2, x3, z3;
    for (i = 0; i < 4; i++) {
      x = raw[i][0]; y = raw[i][1]; z = raw[i][2];
      y2 = y * cp - z * sp;
      z2 = y * sp + z * cp;
      x3 = x * cy + z2 * sy;
      z3 = -x * sy + z2 * cy;
      pts.push([x3 + ox, y2 + oy, z3 + oz, raw[i][3], raw[i][4], sway, phase]);
    }
    mesh.tri(pts[0], pts[1], pts[2], col, 3);
    mesh.tri(pts[0], pts[2], pts[3], col, 3);
  }

  function buildWorld() {
    var mesh = new Mesh();
    var i, s, h, phase, lean, col, leaf, L, t, yaw;

    mesh.quad(P(-2.05, 0, 1.3, 0, 0), P(2.05, 0, 1.3, 1, 0), P(2.05, 2.46, 1.3, 1, 1), P(-2.05, 2.46, 1.3, 0, 1), COL.plaster, 0);
    mesh.quad(P(2.05, 0, -1.62, 0, 0), P(-2.05, 0, -1.62, 1, 0), P(-2.05, 2.46, -1.62, 1, 1), P(2.05, 2.46, -1.62, 0, 1), COL.plaster2, 0);
    mesh.quad(P(-2.08, 0, -1.62, 0, 0), P(-2.08, 0, 1.3, 1, 0), P(-2.08, 2.46, 1.3, 1, 1), P(-2.08, 2.46, -1.62, 0, 1), COL.plaster, 0);
    mesh.quad(P(2.08, 0, 1.3, 0, 0), P(2.08, 0, -1.62, 1, 0), P(2.08, 2.46, -1.62, 1, 1), P(2.08, 2.46, 1.3, 0, 1), COL.plaster2, 0);

    var posts = [[-2.22, 1.46], [2.22, 1.46], [-2.22, -1.76], [2.22, -1.76]];
    for (i = 0; i < posts.length; i++) {
      addBox(mesh, posts[i][0] - 0.09, 0, posts[i][1] - 0.09, posts[i][0] + 0.09, 2.64, posts[i][1] + 0.09, COL.timber, 5);
    }
    addBox(mesh, -2.3, 2.42, 1.36, 2.3, 2.58, 1.54, COL.timberDk, 5);
    addBox(mesh, -2.3, 2.42, -1.86, 2.3, 2.58, -1.68, COL.timberDk, 5);
    addBox(mesh, -0.5, 0, 1.4, -0.38, 1.86, 1.52, COL.timber, 5);
    addBox(mesh, 0.38, 0, 1.4, 0.5, 1.86, 1.52, COL.timber, 5);
    addBox(mesh, -0.5, 1.74, 1.4, 0.5, 1.9, 1.54, COL.timberDk, 5);
    mesh.quad(P(-0.34, 0.06, 1.36, 0, 0), P(0.34, 0.06, 1.36, 1, 0), P(0.34, 1.66, 1.36, 1, 1), P(-0.34, 1.66, 1.36, 0, 1), COL.interior, 0);
    mesh.quad(P(0.02, 0.12, 1.43, 0, 0), P(0.32, 0.12, 1.43, 1, 0), P(0.32, 1.52, 1.43, 1, 1), P(0.02, 1.52, 1.43, 0, 1), COL.glow, 4);
    addBox(mesh, -0.44, 0.02, 1.46, -0.02, 1.76, 1.58, COL.door, 5);
    addBox(mesh, -2.08, 0.86, 1.32, -0.56, 1.0, 1.46, COL.timber, 5);
    addBox(mesh, 0.56, 0.86, 1.32, 2.08, 1.0, 1.46, COL.timber, 5);
    addBox(mesh, -2.08, 2.02, 1.32, 2.08, 2.16, 1.48, COL.timberDk, 5);
    addBox(mesh, -1.62, 1.12, 1.34, -0.92, 1.78, 1.4, COL.timber, 5);
    addBox(mesh, 0.92, 1.12, 1.34, 1.62, 1.78, 1.4, COL.timber, 5);
    mesh.quad(P(-1.52, 1.22, 1.45, 0, 0), P(-1.02, 1.22, 1.45, 1, 0), P(-1.02, 1.7, 1.45, 1, 1), P(-1.52, 1.7, 1.45, 0, 1), COL.paper, 4);
    mesh.quad(P(1.02, 1.22, 1.45, 0, 0), P(1.52, 1.22, 1.45, 1, 0), P(1.52, 1.7, 1.45, 1, 1), P(1.02, 1.7, 1.45, 0, 1), COL.paper, 4);

    var R0 = [-2.45, 3.78, -0.05], R1 = [0, 3.9, -0.08], R2 = [2.45, 3.78, -0.05];
    var E0 = [-3.05, 2.22, 3.28], E1 = [0, 1.88, 3.38], E2 = [3.05, 2.22, 3.28];
    var B0 = [-2.75, 2.05, -2.25], B1 = [0, 1.78, -2.35], B2 = [2.75, 2.05, -2.25];
    mesh.quad(Rp(E0, 0, 0), Rp(E1, 0.5, 0), Rp(R1, 0.5, 1), Rp(R0, 0, 1), COL.roof, 1);
    mesh.quad(Rp(E1, 0.5, 0), Rp(E2, 1, 0), Rp(R2, 1, 1), Rp(R1, 0.5, 1), COL.roof, 1);
    mesh.quad(Rp(R0, 0, 1), Rp(R1, 0.5, 1), Rp(B1, 0.5, 0), Rp(B0, 0, 0), COL.roof, 1);
    mesh.quad(Rp(R1, 0.5, 1), Rp(R2, 1, 1), Rp(B2, 1, 0), Rp(B1, 0.5, 0), COL.roof, 1);
    mesh.tri(Rp(R0, 0, 1), Rp(E0, 0, 0), Rp(B0, 0, 0), COL.timber, 5);
    mesh.tri(Rp(R2, 1, 1), Rp(B2, 1, 0), Rp(E2, 1, 0), COL.timber, 5);
    mesh.quad(Rp([E0[0], E0[1] - 0.07, E0[2]], 0, 0), Rp([R0[0], R0[1] - 0.07, R0[2]], 0, 1), Rp([R1[0], R1[1] - 0.07, R1[2]], 0.5, 1), Rp([E1[0], E1[1] - 0.07, E1[2]], 0.5, 0), COL.roofDk, 1);
    mesh.quad(Rp([E1[0], E1[1] - 0.07, E1[2]], 0.5, 0), Rp([R1[0], R1[1] - 0.07, R1[2]], 0.5, 1), Rp([R2[0], R2[1] - 0.07, R2[2]], 1, 1), Rp([E2[0], E2[1] - 0.07, E2[2]], 1, 0), COL.roofDk, 1);
    addBox(mesh, -2.2, 3.72, -0.28, 2.2, 4.02, 0.08, COL.roofDk, 1);
    mesh.tri(Rp(E0, 0, 0), Rp([E0[0] - 0.22, E0[1] + 0.55, E0[2] + 0.08], 0, 1), Rp([E0[0] + 0.35, E0[1] + 0.08, E0[2] - 0.15], 1, 0), COL.roof, 1);
    mesh.tri(Rp(E2, 1, 0), Rp([E2[0] - 0.35, E2[1] + 0.08, E2[2] - 0.15], 0, 0), Rp([E2[0] + 0.22, E2[1] + 0.55, E2[2] + 0.08], 1, 1), COL.roof, 1);

    addBox(mesh, -4.35, 0, 0.15, -2.72, 1.62, 1.55, COL.plaster2, 0);
    addBox(mesh, -4.42, 0, 0.08, -4.26, 1.85, 0.24, COL.timber, 5);
    addBox(mesh, -2.84, 0, 0.08, -2.68, 1.85, 0.24, COL.timber, 5);
    mesh.quad(Rp([-4.5, 1.7, 1.62], 0, 0), Rp([-2.6, 1.7, 1.62], 1, 0), Rp([-2.65, 2.48, 0.8], 1, 1), Rp([-4.55, 2.48, 0.8], 0, 1), COL.roof, 1);
    mesh.quad(Rp([-4.55, 2.48, 0.8], 0, 1), Rp([-2.65, 2.48, 0.8], 1, 1), Rp([-2.6, 1.7, 0.05], 1, 0), Rp([-4.5, 1.7, 0.05], 0, 0), COL.roof, 1);

    addBox(mesh, -2.65, 0.04, 1.42, 2.65, 0.3, 3.18, COL.floor, 5);
    addBox(mesh, -1.15, 0, 3.15, 1.15, 0.1, 3.62, COL.stone, 0);
    addBox(mesh, -1.05, 0.1, 2.78, 1.05, 0.2, 3.2, COL.stone, 0);
    addBox(mesh, -0.95, 0.2, 2.42, 0.95, 0.3, 2.82, COL.stone, 0);
    var vp = [[-2.4, 2.95], [2.4, 2.95], [-2.4, 1.7], [2.4, 1.7]];
    for (i = 0; i < vp.length; i++) {
      addBox(mesh, vp[i][0] - 0.07, 0.3, vp[i][1] - 0.07, vp[i][0] + 0.07, 2.25, vp[i][1] + 0.07, COL.timber, 5);
    }
    addBox(mesh, -2.48, 0.72, 1.6, -2.32, 0.84, 2.95, COL.timberDk, 5);
    addBox(mesh, 2.32, 0.72, 1.6, 2.48, 0.84, 2.95, COL.timberDk, 5);
    addBox(mesh, 1.25, 0.3, 2.25, 2.25, 0.48, 2.72, COL.floor, 5);
    addBox(mesh, -1.22, 1.55, 2.42, -1.08, 1.95, 2.58, COL.glow, 4);
    addBox(mesh, -1.16, 1.95, 2.46, -1.14, 2.35, 2.5, COL.timberDk, 5);
    addCyl(mesh, -0.85, 1.95, 0.3, 0.62, 0.14, 8, COL.celadon, 0, true);
    addCyl(mesh, 0.95, 1.82, 0.3, 0.58, 0.15, 8, COL.clay, 0, true);
    addCyl(mesh, 1.85, 4.15, 0, 0.46, 0.42, 8, COL.well, 0, false);
    addCyl(mesh, 1.85, 4.15, 0.34, 0.46, 0.28, 8, [0.12, 0.2, 0.22], 0, true);

    var stones = [[0.48, 7.05], [0.22, 6.15], [0.4, 5.2], [0.12, 4.25], [0.28, 3.4]];
    for (i = 0; i < stones.length; i++) {
      addBox(mesh, stones[i][0] - 0.28, 0.01, stones[i][1] - 0.2, stones[i][0] + 0.28, 0.07, stones[i][1] + 0.2, COL.stone, 0);
    }

    var bx = -2.15, bz = 5.42, by = 0.1;
    mesh.quad(P(bx - 0.72, by, bz - 0.28, 0, 0), P(bx + 0.7, by, bz - 0.22, 1, 0), P(bx + 0.66, by, bz + 0.28, 1, 1), P(bx - 0.66, by, bz + 0.32, 0, 1), COL.boatDk, 5);
    mesh.quad(P(bx - 0.72, by, bz - 0.28, 0, 0), P(bx - 0.66, by, bz + 0.32, 1, 0), P(bx - 0.8, by + 0.22, bz + 0.2, 1, 1), P(bx - 0.86, by + 0.22, bz - 0.16, 0, 1), COL.boat, 5);
    mesh.quad(P(bx + 0.7, by, bz - 0.22, 0, 0), P(bx + 0.84, by + 0.22, bz - 0.1, 0, 1), P(bx + 0.78, by + 0.22, bz + 0.2, 1, 1), P(bx + 0.66, by, bz + 0.28, 1, 0), COL.boat, 5);
    mesh.tri(P(bx + 0.7, by, bz - 0.22, 0, 0, 0, 0), P(bx + 0.66, by, bz + 0.28, 1, 0, 0, 0), P(bx + 1.15, by + 0.16, bz + 0.02, 0.5, 1, 0, 0), COL.boat, 5);
    mesh.tri(P(bx + 0.84, by + 0.22, bz - 0.1, 0, 0, 0, 0), P(bx + 1.15, by + 0.16, bz + 0.02, 0.5, 1, 0, 0), P(bx + 0.78, by + 0.22, bz + 0.2, 1, 0, 0, 0), COL.boat, 5);
    addBox(mesh, bx - 0.1, by + 0.12, bz - 0.12, bx + 0.28, by + 0.18, bz + 0.14, COL.boatDk, 5);
    addCulm(mesh, bx + 0.2, bz + 0.02, 1.65, 0.028, CULMS[1], 0.4, 0.8);

    addCyl(mesh, POND.x - 0.28, POND.z - 0.12, 0.055, 0.09, 0.26, 7, COL.lily, 0, true);
    addCyl(mesh, POND.x + 0.42, POND.z + 0.18, 0.055, 0.09, 0.2, 7, COL.lily, 0, true);
    addCyl(mesh, POND.x + 0.05, POND.z + 0.32, 0.055, 0.08, 0.15, 6, [0.16, 0.34, 0.2], 0, true);

    for (i = 0; i < 9; i++) {
      var a = (i / 9) * Math.PI * 2 + 0.3;
      var rx = POND.x + Math.cos(a) * (POND.rx + 0.08);
      var rz = POND.z + Math.sin(a) * (POND.rz + 0.05);
      addLeaf(mesh, rx, 0.02, rz, a, 0.42, 1.15 + (i % 3) * 0.18, 0.06, COL.reed, i * 0.7, 0.4);
    }

    for (i = 0; i < SPOTS.length; i++) {
      s = SPOTS[i];
      if (blocked(s[0], s[1])) continue;
      h = s[2];
      phase = hash1(i * 12.9) * 6.28318;
      lean = hash1(i * 3.3) * 6.28318;
      col = CULMS[i % CULMS.length];
      addCulm(mesh, s[0], s[1], h, 0.055 + h * 0.0048, col, phase, lean);
      leaf = LEAVES[i % LEAVES.length];
      for (L = 0; L < 7; L++) {
        t = L < 5 ? 0.76 + (L % 5) * 0.045 : 0.58;
        yaw = phase + L * (Math.PI * 2 / 5);
        addLeaf(
          mesh,
          s[0] + Math.sin(lean) * 0.38 * t,
          h * t,
          s[1] + Math.cos(lean) * 0.24 * t,
          yaw,
          1.62 + (L % 3) * 0.2,
          2.15 + (h > 8.2 ? 0.85 : 0.25) + (L % 2) * 0.3,
          0.38 + (L % 3) * 0.07,
          leaf,
          phase + L * 0.4,
          Math.pow(t, 1.45)
        );
      }
    }
    return new Float32Array(mesh.a);
  }

  var TIMES = [
    {
      skyTop: [0.95, 0.64, 0.52], skyHor: [0.99, 0.84, 0.66], fog: [0.97, 0.8, 0.66],
      sun: [1, 0.74, 0.5], sunDir: [0.55, 0.32, 0.66], moonDir: [-0.34, 0.34, -0.86],
      ambSky: [0.8, 0.6, 0.52], ambGround: [0.38, 0.3, 0.24],
      glow: 0.2, night: 0, star: 0, moon: 0.08, fogK: 0.022
    },
    {
      skyTop: [0.4, 0.66, 0.84], skyHor: [0.76, 0.88, 0.8], fog: [0.8, 0.88, 0.8],
      sun: [1, 0.98, 0.9], sunDir: [0.28, 0.88, 0.3], moonDir: [-0.4, 0.18, -0.72],
      ambSky: [0.64, 0.76, 0.74], ambGround: [0.36, 0.38, 0.3],
      glow: 0.06, night: 0, star: 0, moon: 0, fogK: 0.014
    },
    {
      skyTop: [0.18, 0.2, 0.38], skyHor: [0.94, 0.5, 0.28], fog: [0.88, 0.52, 0.36],
      sun: [1, 0.64, 0.34], sunDir: [0.48, 0.32, 0.7], moonDir: [-0.22, 0.62, -0.74],
      ambSky: [0.58, 0.4, 0.38], ambGround: [0.3, 0.2, 0.17],
      glow: 0.95, night: 0.24, star: 0.28, moon: 0.9, fogK: 0.02
    },
    {
      skyTop: [0.03, 0.05, 0.12], skyHor: [0.1, 0.14, 0.24], fog: [0.08, 0.11, 0.18],
      sun: [0.58, 0.66, 0.86], sunDir: [-0.3, 0.58, -0.7], moonDir: [-0.3, 0.55, -0.74],
      ambSky: [0.16, 0.2, 0.32], ambGround: [0.06, 0.07, 0.1],
      glow: 1.2, night: 1, star: 1, moon: 1, fogK: 0.02
    }
  ];
  var WEATHER = [
    { wind: 0.26, rain: 0, wet: 0, fogMul: 0.7 },
    { wind: 0.4, rain: 0, wet: 0.04, fogMul: 1.45 },
    { wind: 0.72, rain: 1, wet: 1, fogMul: 1.65 },
    { wind: 1.22, rain: 0, wet: 0, fogMul: 0.8 }
  ];

  function compose(ti, wi) {
    var t = TIMES[ti], w = WEATHER[wi];
    return {
      skyTop: t.skyTop.slice(), skyHor: t.skyHor.slice(), fog: t.fog.slice(), sun: t.sun.slice(),
      sunDir: norm3(t.sunDir), moonDir: norm3(t.moonDir),
      ambSky: t.ambSky.slice(), ambGround: t.ambGround.slice(),
      glow: t.glow, night: t.night, star: t.star, moon: t.moon,
      fogK: t.fogK * w.fogMul, wind: w.wind, rain: w.rain, wet: w.wet
    };
  }
  function cloneLook(L) {
    return {
      skyTop: L.skyTop.slice(), skyHor: L.skyHor.slice(), fog: L.fog.slice(), sun: L.sun.slice(),
      sunDir: L.sunDir.slice(), moonDir: L.moonDir.slice(),
      ambSky: L.ambSky.slice(), ambGround: L.ambGround.slice(),
      glow: L.glow, night: L.night, star: L.star, moon: L.moon,
      fogK: L.fogK, wind: L.wind, rain: L.rain, wet: L.wet
    };
  }
  function lerp3(d, s, t) {
    d[0] += (s[0] - d[0]) * t; d[1] += (s[1] - d[1]) * t; d[2] += (s[2] - d[2]) * t;
  }
  function renorm(a) {
    var l = Math.hypot(a[0], a[1], a[2]) || 1;
    a[0] /= l; a[1] /= l; a[2] /= l;
  }
  function lerpLook(d, s, t) {
    lerp3(d.skyTop, s.skyTop, t); lerp3(d.skyHor, s.skyHor, t); lerp3(d.fog, s.fog, t);
    lerp3(d.sun, s.sun, t); lerp3(d.sunDir, s.sunDir, t); lerp3(d.moonDir, s.moonDir, t);
    lerp3(d.ambSky, s.ambSky, t); lerp3(d.ambGround, s.ambGround, t);
    renorm(d.sunDir); renorm(d.moonDir);
    d.glow += (s.glow - d.glow) * t; d.night += (s.night - d.night) * t;
    d.star += (s.star - d.star) * t; d.moon += (s.moon - d.moon) * t;
    d.fogK += (s.fogK - d.fogK) * t; d.wind += (s.wind - d.wind) * t;
    d.rain += (s.rain - d.rain) * t; d.wet += (s.wet - d.wet) * t;
  }

  function boot2d() {
    var ctx = canvas.getContext("2d");
    if (!ctx) { markReady(); return; }
    var t0 = performance.now();
    function paint() {
      var w = canvas.clientWidth || 390;
      var h = canvas.clientHeight || 844;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var W = Math.max(2, Math.floor(w * dpr));
      var H = Math.max(2, Math.floor(h * dpr));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#2a3158");
      g.addColorStop(0.42, "#e07a3a");
      g.addColorStop(0.58, "#c47848");
      g.addColorStop(1, "#3d4a32");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      var time = (performance.now() - t0) * 0.001;
      ctx.fillStyle = "#6a8a3a";
      var i;
      for (i = 0; i < 18; i++) {
        var x = (i * 47) % w;
        var sway = Math.sin(time * 1.2 + i) * 8;
        ctx.fillRect(x + sway, h * 0.18, 5, h * 0.7);
        ctx.beginPath();
        ctx.ellipse(x + sway, h * 0.22, 16, 7, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#d9c4a0";
      ctx.fillRect(w * 0.32, h * 0.48, w * 0.36, h * 0.2);
      ctx.fillStyle = "#3e534c";
      ctx.beginPath();
      ctx.moveTo(w * 0.26, h * 0.5);
      ctx.lineTo(w * 0.5, h * 0.36);
      ctx.lineTo(w * 0.74, h * 0.5);
      ctx.fill();
      ctx.fillStyle = "#f4efe2";
      ctx.beginPath();
      ctx.arc(w * 0.62, h * 0.16, 14, 0, Math.PI * 2);
      ctx.fill();
      markReady();
      requestAnimationFrame(paint);
    }
    paint();
  }

  var gl = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: false, antialias: false, depth: true, stencil: false, powerPreference: "high-performance"
    });
  } catch (err) { gl = null; }
  if (!gl) { boot2d(); return; }

  var soft = false;
  var dbg = gl.getExtension("WEBGL_debug_renderer_info");
  if (dbg) soft = /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || ""));
  var maxDpr = soft ? 1 : 1.6;
  var prec = "highp";
  var hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!hp || hp.precision < 1) prec = "mediump";
  var PH = "precision " + prec + " float;\n";

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function makeProg(vs, fs, names) {
    var p = gl.createProgram();
    var a = compile(gl.VERTEX_SHADER, vs);
    var b = compile(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    gl.attachShader(p, a);
    gl.attachShader(p, b);
    var i;
    for (i = 0; i < names.length; i++) gl.bindAttribLocation(p, i, names[i]);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      return null;
    }
    var u = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      u[info.name.replace("[0]", "")] = gl.getUniformLocation(p, info.name);
    }
    return { p: p, u: u };
  }
  function u1(p, n, v) { var l = p.u[n]; if (l) gl.uniform1f(l, v); }
  function u2(p, n, a, b) { var l = p.u[n]; if (l) gl.uniform2f(l, a, b); }
  function u3(p, n, a, b, c) { var l = p.u[n]; if (l) gl.uniform3f(l, a, b, c); }
  function u4(p, n, a, b, c, d) { var l = p.u[n]; if (l) gl.uniform4f(l, a, b, c, d); }
  function um(p, n, m) { var l = p.u[n]; if (l) gl.uniformMatrix4fv(l, false, m); }

  var sky = makeProg(
    "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}",
    PH +
      "uniform vec3 uFwd;uniform vec3 uRight;uniform vec3 uUp;uniform vec2 uTan;uniform vec2 uRes;" +
      "uniform vec3 uTop;uniform vec3 uHor;uniform vec3 uFog;uniform vec3 uSunDir;uniform vec3 uSunColor;" +
      "uniform vec3 uMoonDir;uniform float uTime;uniform float uNight;uniform float uStar;uniform float uMoon;uniform float uRain;" +
      "void main(){" +
      "vec2 ndc=(gl_FragCoord.xy/uRes)*2.0-1.0;" +
      "vec3 rd=normalize(uFwd+uRight*ndc.x*uTan.x+uUp*ndc.y*uTan.y);" +
      "float up=rd.y;" +
      "vec3 col=mix(uFog,uHor,smoothstep(-0.25,0.08,up));" +
      "col=mix(col,uTop,smoothstep(0.0,0.62,up));" +
      "col=mix(col,uHor,smoothstep(0.22,0.0,abs(up))*0.35);" +
      "float sd=dot(rd,normalize(uSunDir));" +
      "float sunVis=1.0-uNight;" +
      "col+=uSunColor*smoothstep(0.96,0.9995,sd)*0.55*sunVis;" +
      "col+=vec3(1.0,0.96,0.86)*smoothstep(0.9982,0.9996,sd)*sunVis;" +
      "float md=dot(rd,normalize(uMoonDir));" +
      "col+=vec3(0.62,0.7,0.9)*smoothstep(0.982,0.998,md)*0.4*uMoon;" +
      "col+=vec3(0.97,0.96,0.9)*smoothstep(0.9985,0.99955,md)*uMoon;" +
      "vec3 g=rd*240.0;vec3 cell=floor(g);vec3 fr=fract(g)-0.5;" +
      "float h=fract(sin(dot(cell,vec3(12.71,31.17,7.47)))*43758.5453);" +
      "float star=step(0.994,h)*smoothstep(0.04,0.0,dot(fr,fr))*step(0.16,rd.y);" +
      "col+=vec3(0.95,0.96,1.0)*star*(0.55+0.45*sin(uTime*2.3+h*40.0))*uStar;" +
      "float cld=sin(rd.x*5.0+rd.z*3.2+uTime*0.045)*0.5+0.5;" +
      "float band=smoothstep(0.02,0.16,rd.y)*smoothstep(0.55,0.2,rd.y);" +
      "col=mix(col,mix(uHor,vec3(1.0),0.4),smoothstep(0.42,0.82,cld)*0.3*band*(1.0-uNight));" +
      "col=mix(col,col*vec3(0.46,0.52,0.6)+vec3(0.02,0.025,0.03),uRain*0.78);" +
      "gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);}",
    ["aPos"]
  );

  var ground = makeProg(
    "attribute vec3 aPos;uniform mat4 uMvp;varying vec3 vWorld;void main(){vWorld=aPos;gl_Position=uMvp*vec4(aPos,1.0);}",
    PH +
      "varying vec3 vWorld;uniform vec3 uEye;uniform vec3 uSunDir;uniform vec3 uSunColor;" +
      "uniform vec3 uAmbSky;uniform vec3 uAmbGround;uniform vec3 uFogColor;uniform float uFogK;" +
      "uniform float uGlow;uniform float uWet;uniform vec4 uPond;" +
      "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
      "void main(){" +
      "vec2 w=vWorld.xz;" +
      "float n=sin(w.x*0.65)*sin(w.y*0.5);float n2=sin(w.x*2.1+w.y*1.6);" +
      "vec3 moss=vec3(0.26,0.44,0.2);vec3 soil=vec3(0.4,0.3,0.16);" +
      "vec3 earth=mix(soil,moss,0.62+0.2*n);earth=mix(earth,earth*0.86,smoothstep(0.35,0.95,n2));" +
      "vec2 a=vec2(0.55,9.4);vec2 b=vec2(0.02,2.35);vec2 ab=b-a;" +
      "float t=clamp(dot(w-a,ab)/dot(ab,ab),0.0,1.0);float pd=length(w-(a+ab*t));" +
      "float path=smoothstep(0.78,0.22,pd)*smoothstep(2.05,2.7,w.y);" +
      "earth=mix(earth,vec3(0.6,0.54,0.44),path*0.9);" +
      "vec2 cell=floor(w*vec2(1.65,1.3));vec2 f=fract(w*vec2(1.65,1.3))-0.5;" +
      "float stone=smoothstep(0.33,0.18,length(f*vec2(1.0,0.78)))*step(0.58,hash(cell));" +
      "earth=mix(earth,vec3(0.5,0.47,0.42),path*stone);" +
      "float e=length((w-uPond.xy)/uPond.zw);" +
      "earth=mix(earth,vec3(0.26,0.32,0.22),smoothstep(1.28,0.92,e)*0.7);" +
      "earth=mix(earth,vec3(0.09,0.15,0.14),smoothstep(0.95,0.4,e));" +
      "float sh=smoothstep(3.5,1.3,abs(w.x+0.15))*smoothstep(4.3,1.5,abs(w.y-0.7));" +
      "earth*=mix(1.0,0.6,sh);" +
      "float ndl=clamp(uSunDir.y*0.65+0.4,0.22,1.0);" +
      "vec3 col=earth*(mix(uAmbGround,uAmbSky,0.45)+uSunColor*ndl*0.85);" +
      "float lamp=smoothstep(5.2,0.25,length(w-vec2(0.05,2.15)));" +
      "col+=vec3(1.0,0.58,0.28)*lamp*uGlow*0.32;" +
      "col*=mix(1.0,0.7,uWet);" +
      "col+=vec3(0.16,0.17,0.18)*uWet*path*0.25;" +
      "float fog=1.0-exp(-uFogK*length(vWorld-uEye));" +
      "col=mix(col,uFogColor,clamp(fog,0.0,1.0));" +
      "gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);}",
    ["aPos"]
  );

  var lit = makeProg(
    "precision highp float;attribute vec3 aPos;attribute vec3 aNrm;attribute vec3 aCol;attribute vec2 aUv;" +
      "attribute float aKind;attribute float aSway;attribute float aPhase;" +
      "uniform mat4 uMvp;uniform float uTime;uniform float uWind;" +
      "varying vec3 vWorld;varying vec3 vNrm;varying vec3 vCol;varying vec2 vUv;varying float vKind;" +
      "void main(){" +
      "float bend=sin(uTime*1.32+aPhase)*uWind*aSway;" +
      "float flutter=0.0;if(aKind>2.5&&aKind<3.5)flutter=sin(uTime*3.4+aPhase*5.0+aPos.y*0.7)*uWind*0.07;" +
      "vec3 p=aPos;p.x+=bend*0.72+flutter;p.z+=bend*0.34;" +
      "vec3 n=aNrm;n.x-=bend*0.45;" +
      "vWorld=p;vNrm=n;vCol=aCol;vUv=aUv;vKind=aKind;gl_Position=uMvp*vec4(p,1.0);}",
    PH +
      "varying vec3 vWorld;varying vec3 vNrm;varying vec3 vCol;varying vec2 vUv;varying float vKind;" +
      "uniform vec3 uEye;uniform vec3 uSunDir;uniform vec3 uSunColor;uniform vec3 uAmbSky;uniform vec3 uAmbGround;" +
      "uniform vec3 uFogColor;uniform float uFogK;uniform float uGlow;uniform float uWet;uniform vec3 uLamp;" +
      "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
      "void main(){" +
      "float k=vKind;vec3 albedo=vCol;" +
      "if(k<0.5){float n=hash(floor(vUv*9.0));albedo*=0.93+0.07*n;albedo=mix(albedo*vec3(0.72,0.86,0.68),albedo,smoothstep(0.0,0.42,vUv.y));}" +
      "else if(k<1.5){float row=fract(vUv.y*12.0);albedo*=mix(1.0,0.74,smoothstep(0.16,0.0,row));float alt=step(0.93,fract(vUv.x*16.0+floor(vUv.y*12.0)*0.37));albedo*=mix(1.0,0.82,alt);}" +
      "else if(k<2.5){float joint=smoothstep(0.07,0.0,abs(fract(vUv.y*8.0)-0.1));albedo=mix(albedo,albedo*vec3(0.42,0.48,0.32),joint);albedo*=mix(0.78,1.05,vUv.y);}" +
      "else if(k<3.5){float w=mix(0.96,0.1,vUv.y);if(abs(vUv.x-0.5)*2.0>w)discard;float vein=smoothstep(0.14,0.0,abs(vUv.x-0.5));albedo*=mix(0.82,1.12,vein);albedo*=mix(0.72,1.0,vUv.y);}" +
      "else if(k>4.5){albedo*=0.9+0.1*sin(vUv.x*8.0+vUv.y*2.4);float band=smoothstep(0.05,0.0,abs(fract(vUv.y*4.0)-0.5));albedo=mix(albedo,albedo*0.78,band*0.4);}" +
      "vec3 N=normalize(vNrm);if(!gl_FrontFacing)N=-N;vec3 L=normalize(uSunDir);" +
      "float ndl=clamp(dot(N,L),0.0,1.0);" +
      "float wrap=pow(clamp(dot(N,L)*0.5+0.5,0.0,1.0),1.05);" +
      "float shade=(k>1.5&&k<3.5)?mix(wrap,ndl,0.72):wrap;" +
      "vec3 amb=mix(uAmbGround,uAmbSky,N.y*0.5+0.5);" +
      "vec3 col=albedo*(amb+uSunColor*shade*0.95);" +
      "if(k>3.5&&k<4.5)col+=albedo*(0.15+uGlow*1.35);" +
      "vec3 toL=uLamp-vWorld;float ld=length(toL);vec3 ldir=toL/max(ld,0.001);" +
      "float att=clamp(1.0-ld/7.5,0.0,1.0);att*=att;" +
      "col+=albedo*vec3(1.0,0.58,0.26)*clamp(dot(N,ldir),0.0,1.0)*att*uGlow*0.95;" +
      "vec3 V=normalize(uEye-vWorld);" +
      "col+=uSunColor*pow(clamp(dot(reflect(-L,N),V),0.0,1.0),28.0)*uWet*0.22;" +
      "col+=uAmbSky*pow(1.0-clamp(dot(N,V),0.0,1.0),2.4)*0.16;" +
      "col*=mix(1.0,0.78,uWet*0.65);" +
      "float fog=1.0-exp(-uFogK*length(vWorld-uEye));" +
      "col=mix(col,uFogColor,clamp(fog,0.0,1.0));" +
      "gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);}",
    ["aPos", "aNrm", "aCol", "aUv", "aKind", "aSway", "aPhase"]
  );

  var water = makeProg(
    "attribute vec3 aPos;uniform mat4 uMvp;varying vec3 vWorld;void main(){vWorld=aPos;gl_Position=uMvp*vec4(aPos,1.0);}",
    PH +
      "varying vec3 vWorld;uniform vec3 uEye;uniform float uTime;uniform vec3 uFogColor;uniform float uFogK;" +
      "uniform vec3 uHor;uniform vec4 uPond;uniform float uRain;uniform vec3 uSunDir;uniform vec3 uSunColor;" +
      "void main(){" +
      "vec2 w=vWorld.xz;float e=length((w-uPond.xy)/uPond.zw);float a=smoothstep(1.04,0.84,e);if(a<0.02)discard;" +
      "float sp=1.0+uRain*2.4;float rip=sin(w.x*5.5*sp+uTime*1.5)*sin(w.y*4.4-uTime*1.15);" +
      "vec3 col=mix(vec3(0.1,0.3,0.28),uHor,0.26+rip*0.05);" +
      "col+=uSunColor*pow(clamp(rip,0.0,1.0),3.0)*0.14;" +
      "float fog=1.0-exp(-uFogK*length(vWorld-uEye));col=mix(col,uFogColor,clamp(fog,0.0,1.0));" +
      "gl_FragColor=vec4(clamp(col,0.0,1.0),a*0.9);}",
    ["aPos"]
  );

  var rain = makeProg(
    "attribute vec3 aSeed;attribute float aAlong;attribute float aSide;" +
      "uniform mat4 uMvp;uniform vec3 uRight;uniform float uTime;uniform float uWind;uniform float uRain;varying float vFade;" +
      "void main(){float t=fract(aSeed.z-uTime*0.72);float y=mix(6.2,-0.4,t)-aAlong*0.62;" +
      "vec3 p=vec3(aSeed.x,y,aSeed.y);p+=uRight*aSide*0.016;p.x+=aAlong*uWind*0.22;" +
      "gl_Position=uMvp*vec4(p,1.0);vFade=smoothstep(0.0,0.1,t)*smoothstep(1.0,0.8,t)*uRain*(1.0-aAlong*0.35);}",
    PH + "varying float vFade;void main(){gl_FragColor=vec4(0.78,0.86,0.9,vFade*0.42);}",
    ["aSeed", "aAlong", "aSide"]
  );

  var flies = makeProg(
    "attribute vec3 aPos;attribute float aPhase;uniform mat4 uMvp;uniform float uTime;uniform float uNight;varying float vHot;" +
      "void main(){float t=uTime*0.45+aPhase*6.28318;vec3 p=aPos;p.x+=sin(t)*0.42;p.z+=cos(t*0.77)*0.33;p.y+=sin(t*1.6+aPhase)*0.16;" +
      "gl_Position=uMvp*vec4(p,1.0);float blink=0.35+0.65*pow(max(sin(uTime*2.2+aPhase*12.0),0.0),2.0);" +
      "vHot=blink*smoothstep(0.08,0.55,uNight);gl_PointSize=mix(2.4,6.5,blink);}",
    PH + "varying float vHot;void main(){vec2 pc=gl_PointCoord*2.0-1.0;float d=dot(pc,pc);if(d>1.0)discard;float a=(1.0-sqrt(d))*vHot;gl_FragColor=vec4(1.0,0.88,0.45,a);}",
    ["aPos", "aPhase"]
  );

  if (!sky || !ground || !lit || !water || !rain || !flies) { boot2d(); return; }

  var world = buildWorld();
  var worldBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, worldBuf);
  gl.bufferData(gl.ARRAY_BUFFER, world, gl.STATIC_DRAW);
  var worldCount = world.length / 14;

  var groundData = new Float32Array([
    -48, 0, -48, 48, 0, -48, 48, 0, 48,
    -48, 0, -48, 48, 0, 48, -48, 0, 48
  ]);
  var groundBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, groundBuf);
  gl.bufferData(gl.ARRAY_BUFFER, groundData, gl.STATIC_DRAW);

  var pad = 0.4;
  var waterData = new Float32Array([
    POND.x - POND.rx - pad, 0.05, POND.z - POND.rz - pad,
    POND.x + POND.rx + pad, 0.05, POND.z - POND.rz - pad,
    POND.x + POND.rx + pad, 0.05, POND.z + POND.rz + pad,
    POND.x - POND.rx - pad, 0.05, POND.z - POND.rz - pad,
    POND.x + POND.rx + pad, 0.05, POND.z + POND.rz + pad,
    POND.x - POND.rx - pad, 0.05, POND.z + POND.rz + pad
  ]);
  var waterBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, waterBuf);
  gl.bufferData(gl.ARRAY_BUFFER, waterData, gl.STATIC_DRAW);

  var skyData = new Float32Array([-1, -1, 3, -1, -1, 3]);
  var skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, skyData, gl.STATIC_DRAW);

  var rainN = 80;
  var rainArr = [];
  var ri, rk;
  for (ri = 0; ri < rainN; ri++) {
    var rx = (hash1(ri * 3.1) - 0.5) * 24;
    var rz = (hash1(ri * 7.7) - 0.5) * 24 + 2;
    var rp = hash1(ri * 1.9);
    var corners = [[0, -1], [0, 1], [1, 1], [0, -1], [1, 1], [1, -1]];
    for (rk = 0; rk < 6; rk++) rainArr.push(rx, rz, rp, corners[rk][0], corners[rk][1]);
  }
  var rainData = new Float32Array(rainArr);
  var rainBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, rainBuf);
  gl.bufferData(gl.ARRAY_BUFFER, rainData, gl.STATIC_DRAW);
  var rainCount = rainData.length / 5;

  var flyN = 32;
  var flyArr = [];
  for (ri = 0; ri < flyN; ri++) {
    flyArr.push((hash1(ri * 2.2) - 0.5) * 12, 0.45 + hash1(ri * 5.1) * 2.1, hash1(ri * 4.4) * 10 - 1, hash1(ri * 9.2));
  }
  var flyData = new Float32Array(flyArr);
  var flyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, flyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, flyData, gl.STATIC_DRAW);

  function bindBuf(buf, parts) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    var stride = 0, i, off = 0;
    for (i = 0; i < parts.length; i++) stride += parts[i];
    stride *= 4;
    for (i = 0; i < 8; i++) {
      if (i < parts.length) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, parts[i], gl.FLOAT, false, stride, off);
        off += parts[i] * 4;
      } else gl.disableVertexAttribArray(i);
    }
  }

  var Mv = new Float32Array(16);
  var Mp = new Float32Array(16);
  var Mm = new Float32Array(16);
  var basis = { f: [0, 0, 0], s: [0, 0, 0], u: [0, 0, 0] };
  var eye = [0, 0, 0];
  var bufW = 2, bufH = 2, cssW = 0, cssH = 0, tanX = 0.5, tanY = 0.5;

  function resize() {
    var w = canvas.clientWidth || window.innerWidth || 390;
    var h = canvas.clientHeight || window.innerHeight || 844;
    if (w < 2) w = 390;
    if (h < 2) h = 844;
    var dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    var W = Math.max(2, Math.floor(w * dpr));
    var H = Math.max(2, Math.floor(h * dpr));
    // Software GL readback stalls the sentinel when the buffer is desktop-sized.
    // Phone frames stay 1:1; only oversized software buffers are scaled down.
    if (soft && (W > 640 || H > 960)) {
      var cap = 110000;
      if (W * H > cap) {
        var fit = Math.sqrt(cap / (W * H));
        W = Math.max(2, Math.floor(W * fit));
        H = Math.max(2, Math.floor(H * fit));
      }
    }
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    bufW = W; bufH = H; cssW = w; cssH = h;
    tanX = Math.tan(FOVX * 0.5);
    tanY = tanX / (W / H);
    gl.viewport(0, 0, W, H);
  }
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy * 0.5), nf = 1 / (near - far), i;
    for (i = 0; i < 16; i++) out[i] = 0;
    out[0] = f / aspect; out[5] = f;
    out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
  }
  function setCamera(yaw, pitch) {
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var sy = Math.sin(yaw), cy = Math.cos(yaw);
    var f = basis.f, s = basis.s, u = basis.u;
    f[0] = sy * cp; f[1] = sp; f[2] = cy * cp;
    s[0] = -f[2]; s[1] = 0; s[2] = f[0];
    var sl = Math.hypot(s[0], s[1], s[2]) || 1;
    s[0] /= sl; s[2] /= sl;
    u[0] = s[1] * f[2] - s[2] * f[1];
    u[1] = s[2] * f[0] - s[0] * f[2];
    u[2] = s[0] * f[1] - s[1] * f[0];
    Mv[0] = s[0]; Mv[1] = u[0]; Mv[2] = -f[0]; Mv[3] = 0;
    Mv[4] = s[1]; Mv[5] = u[1]; Mv[6] = -f[1]; Mv[7] = 0;
    Mv[8] = s[2]; Mv[9] = u[2]; Mv[10] = -f[2]; Mv[11] = 0;
    Mv[12] = -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]);
    Mv[13] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
    Mv[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
    Mv[15] = 1;
    var c, r;
    for (c = 0; c < 4; c++) {
      for (r = 0; r < 4; r++) {
        Mm[c * 4 + r] = Mp[r] * Mv[c * 4] + Mp[4 + r] * Mv[c * 4 + 1] + Mp[8 + r] * Mv[c * 4 + 2] + Mp[12 + r] * Mv[c * 4 + 3];
      }
    }
  }

  function poseFromLook(ex, ez, lx, ly, lz) {
    var y = eyeY(ex, ez);
    var dx = lx - ex, dy = ly - y, dz = lz - ez;
    return { x: ex, z: ez, yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, hypot2(dx, dz)) };
  }
  var lane = poseFromLook(0.42, 8.5, -0.05, 1.72, 1.05);
  var porch = poseFromLook(0.18, 2.95, 0.02, 1.35, 1.22);
  var cur = { x: lane.x, z: lane.z, yaw: lane.yaw, pitch: lane.pitch };
  var goal = { x: lane.x, z: lane.z, yaw: lane.yaw, pitch: lane.pitch };
  var lerping = false;
  var dragging = false;
  var velY = 0, velP = 0;
  var timeI = 2, weatherI = 1;
  var goalLook = cloneLook(compose(timeI, weatherI));
  var shown = cloneLook(goalLook);

  function clampWalk(p) {
    p.x = clamp(p.x, -8, 8);
    p.z = clamp(p.z, -1.2, 15.5);
    if (Math.abs(p.x) < 2.4 && p.z > -2.05 && p.z < 1.5) p.z = 1.5;
    if (p.x < -2.55 && p.x > -4.5 && p.z > 0.05 && p.z < 1.7) p.x = -2.55;
    var dx = p.x - POND.x, dz = p.z - POND.z;
    if ((dx * dx) / (POND.rx * POND.rx) + (dz * dz) / (POND.rz * POND.rz) < 0.9) {
      p.z += dz >= 0 ? 0.4 : -0.4;
    }
  }
  function goPose(x, z, yaw, pitch) {
    goal.x = x; goal.z = z; goal.yaw = yaw; goal.pitch = pitch;
    velY = 0; velP = 0; lerping = true;
  }

  var LINES = {
    lane: "The lane home, between the culms.",
    porch: "The veranda, where the day cooled.",
    sky: "Look up. The grove holds the moon."
  };
  function mark(k, v) {
    var buttons = panel.querySelectorAll("button");
    var i, b;
    for (i = 0; i < buttons.length; i++) {
      b = buttons[i];
      if (b.getAttribute("data-k") === k) b.classList.toggle("on", b.getAttribute("data-v") === String(v));
    }
  }
  function say(key) {
    if (lineEl) lineEl.textContent = LINES[key] || LINES.lane;
  }
  mark("time", 2);
  mark("weather", 1);
  mark("place", "lane");

  function stopEv(e) { e.stopPropagation(); }
  ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend", "wheel", "mousedown"].forEach(function (name) {
    panel.addEventListener(name, stopEv, { passive: true });
  });
  panel.addEventListener("click", function (e) {
    var node = e.target;
    while (node && node !== panel && node.tagName !== "BUTTON") node = node.parentNode;
    if (!node || node.tagName !== "BUTTON") return;
    var k = node.getAttribute("data-k");
    var v = node.getAttribute("data-v");
    if (k === "time") { timeI = +v; mark("time", timeI); goalLook = cloneLook(compose(timeI, weatherI)); }
    else if (k === "weather") { weatherI = +v; mark("weather", weatherI); goalLook = cloneLook(compose(timeI, weatherI)); }
    else if (k === "place") {
      mark("place", v);
      say(v);
      if (v === "lane") goPose(lane.x, lane.z, lane.yaw, lane.pitch);
      else if (v === "porch") goPose(porch.x, porch.z, porch.yaw, porch.pitch);
      else {
        var m = goalLook.moonDir;
        goPose(lane.x, lane.z, Math.atan2(m[0], m[2]), Math.atan2(m[1], hypot2(m[0], m[2])));
      }
    }
  });

  var ptrs = {};
  var prevPinch = 0;
  function countPtrs() {
    var n = 0, k;
    for (k in ptrs) if (Object.prototype.hasOwnProperty.call(ptrs, k)) n++;
    return n;
  }
  function pinchDist() {
    var ks = [], k;
    for (k in ptrs) if (Object.prototype.hasOwnProperty.call(ptrs, k)) ks.push(k);
    if (ks.length < 2) return 0;
    var a = ptrs[ks[0]], b = ptrs[ks[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  canvas.addEventListener("pointerdown", function (e) {
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    dragging = true; lerping = false; velY = 0; velP = 0;
    if (countPtrs() >= 2) prevPinch = pinchDist();
  });
  canvas.addEventListener("pointermove", function (e) {
    var p = ptrs[e.pointerId];
    if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (countPtrs() >= 2) {
      var d = pinchDist();
      if (prevPinch > 8) {
        var step = (d - prevPinch) * 0.022;
        cur.x += Math.sin(cur.yaw) * step;
        cur.z += Math.cos(cur.yaw) * step;
        clampWalk(cur);
        goal.x = cur.x; goal.z = cur.z;
      }
      prevPinch = d;
      return;
    }
    var sy = -dx * 0.0054, sp = -dy * 0.0038;
    cur.yaw += sy;
    cur.pitch = clamp(cur.pitch + sp, -0.62, 1.02);
    goal.yaw = cur.yaw; goal.pitch = cur.pitch;
    velY = sy * 0.65; velP = sp * 0.65;
  });
  function endPtr(e) {
    delete ptrs[e.pointerId];
    if (countPtrs() === 0) dragging = false;
    if (countPtrs() < 2) prevPinch = 0;
  }
  canvas.addEventListener("pointerup", endPtr);
  canvas.addEventListener("pointercancel", endPtr);
  canvas.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    var step = -clamp(e.deltaY, -80, 80) * 0.01;
    cur.x += Math.sin(cur.yaw) * step;
    cur.z += Math.cos(cur.yaw) * step;
    clampWalk(cur);
    goal.x = cur.x; goal.z = cur.z;
  }, { passive: false });

  var audio = null, windG = null, rustleG = null, rainG = null, cricketG = null, nextBird = 0;
  function chirp(delay, ctx) {
    var t = ctx.currentTime + delay;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    var f0 = 1400 + Math.random() * 800;
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.45, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.2);
  }
  function startAudio() {
    if (audio) {
      if (audio.state === "suspended") { try { audio.resume(); } catch (err) {} }
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ctx;
    try { ctx = new AC(); } catch (err) { return; }
    audio = ctx;
    var len = ctx.sampleRate;
    var buf = ctx.createBuffer(1, len, len);
    var data = buf.getChannelData(0);
    var i;
    for (i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    function chain(type, freq, q) {
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      var g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start();
      return g;
    }
    windG = chain("bandpass", 360, 0.7);
    rustleG = chain("highpass", 1500, 0.5);
    rainG = chain("highpass", 900, 0.6);
    var co = ctx.createOscillator(); co.type = "sine"; co.frequency.value = 3120;
    var co2 = ctx.createOscillator(); co2.type = "sine"; co2.frequency.value = 3360;
    cricketG = ctx.createGain(); cricketG.gain.value = 0;
    co.connect(cricketG); co2.connect(cricketG); cricketG.connect(ctx.destination);
    co.start(); co2.start();
    var fl = ctx.createOscillator(); fl.frequency.value = 4.2;
    var flg = ctx.createGain(); flg.gain.value = 16;
    fl.connect(flg); flg.connect(co.frequency); fl.start();
    nextBird = ctx.currentTime + 0.8;
    try { ctx.resume(); } catch (err2) {}
  }
  window.addEventListener("pointerdown", function () { startAudio(); }, true);

  if (!window.__gbSandbox) {
    setTimeout(function () {
      if (document.getElementById("gb-ui-toggle") || document.getElementById("grove-toggle")) return;
      var b = document.createElement("button");
      b.id = "grove-toggle";
      b.type = "button";
      b.setAttribute("aria-label", "Show controls");
      b.textContent = "\u2699";
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var on = document.documentElement.classList.toggle("gb-ui-open");
        b.setAttribute("aria-expanded", on ? "true" : "false");
      });
      ["pointerdown", "pointerup", "touchstart", "touchend", "touchmove", "wheel"].forEach(function (name) {
        b.addEventListener(name, function (e) { e.stopPropagation(); });
      });
      document.body.appendChild(b);
    }, 400);
  }

  var t0 = performance.now();
  var last = 0;
  function nowSec() { return (performance.now() - t0) * 0.001; }

  function draw(time, dt) {
    if (dt > 0) {
      var k = 1 - Math.exp(-3.2 * dt);
      if (lerping) {
        cur.x += (goal.x - cur.x) * k;
        cur.z += (goal.z - cur.z) * k;
        cur.yaw += angDiff(goal.yaw, cur.yaw) * k;
        cur.pitch += (goal.pitch - cur.pitch) * k;
        clampWalk(cur);
        if (Math.abs(goal.x - cur.x) + Math.abs(goal.z - cur.z) + Math.abs(angDiff(goal.yaw, cur.yaw)) < 0.02) lerping = false;
      } else if (!dragging) {
        cur.yaw += velY;
        cur.pitch = clamp(cur.pitch + velP, -0.62, 1.02);
        velY *= 0.86; velP *= 0.86;
        if (Math.abs(velY) < 0.00004) velY = 0;
        if (Math.abs(velP) < 0.00004) velP = 0;
        goal.yaw = cur.yaw; goal.pitch = cur.pitch;
      }
      lerpLook(shown, goalLook, 1 - Math.exp(-2.8 * dt));
    }
    var yaw = cur.yaw + (dragging ? 0 : Math.sin(time * 0.16) * 0.02);
    var pitch = cur.pitch + (dragging ? 0 : Math.sin(time * 0.11) * 0.006);
    eye[0] = cur.x; eye[1] = eyeY(cur.x, cur.z); eye[2] = cur.z;
    perspective(Mp, 2 * Math.atan(tanY), bufW / bufH, 0.08, 90);
    setCamera(yaw, pitch);

    gl.clearColor(shown.fog[0], shown.fog[1], shown.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(sky.p);
    u3(sky, "uFwd", basis.f[0], basis.f[1], basis.f[2]);
    u3(sky, "uRight", basis.s[0], basis.s[1], basis.s[2]);
    u3(sky, "uUp", basis.u[0], basis.u[1], basis.u[2]);
    u2(sky, "uTan", tanX, tanY);
    u2(sky, "uRes", bufW, bufH);
    u3(sky, "uTop", shown.skyTop[0], shown.skyTop[1], shown.skyTop[2]);
    u3(sky, "uHor", shown.skyHor[0], shown.skyHor[1], shown.skyHor[2]);
    u3(sky, "uFog", shown.fog[0], shown.fog[1], shown.fog[2]);
    u3(sky, "uSunDir", shown.sunDir[0], shown.sunDir[1], shown.sunDir[2]);
    u3(sky, "uSunColor", shown.sun[0], shown.sun[1], shown.sun[2]);
    u3(sky, "uMoonDir", shown.moonDir[0], shown.moonDir[1], shown.moonDir[2]);
    u1(sky, "uTime", time); u1(sky, "uNight", shown.night); u1(sky, "uStar", shown.star);
    u1(sky, "uMoon", shown.moon); u1(sky, "uRain", shown.rain);
    bindBuf(skyBuf, [2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.useProgram(ground.p);
    um(ground, "uMvp", Mm);
    u3(ground, "uEye", eye[0], eye[1], eye[2]);
    u3(ground, "uSunDir", shown.sunDir[0], shown.sunDir[1], shown.sunDir[2]);
    u3(ground, "uSunColor", shown.sun[0], shown.sun[1], shown.sun[2]);
    u3(ground, "uAmbSky", shown.ambSky[0], shown.ambSky[1], shown.ambSky[2]);
    u3(ground, "uAmbGround", shown.ambGround[0], shown.ambGround[1], shown.ambGround[2]);
    u3(ground, "uFogColor", shown.fog[0], shown.fog[1], shown.fog[2]);
    u1(ground, "uFogK", shown.fogK); u1(ground, "uGlow", shown.glow); u1(ground, "uWet", shown.wet);
    u4(ground, "uPond", POND.x, POND.z, POND.rx, POND.rz);
    bindBuf(groundBuf, [3]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.useProgram(lit.p);
    um(lit, "uMvp", Mm);
    u1(lit, "uTime", time); u1(lit, "uWind", shown.wind);
    u3(lit, "uEye", eye[0], eye[1], eye[2]);
    u3(lit, "uSunDir", shown.sunDir[0], shown.sunDir[1], shown.sunDir[2]);
    u3(lit, "uSunColor", shown.sun[0], shown.sun[1], shown.sun[2]);
    u3(lit, "uAmbSky", shown.ambSky[0], shown.ambSky[1], shown.ambSky[2]);
    u3(lit, "uAmbGround", shown.ambGround[0], shown.ambGround[1], shown.ambGround[2]);
    u3(lit, "uFogColor", shown.fog[0], shown.fog[1], shown.fog[2]);
    u1(lit, "uFogK", shown.fogK); u1(lit, "uGlow", shown.glow); u1(lit, "uWet", shown.wet);
    u3(lit, "uLamp", 0.05, 1.45, 1.85);
    bindBuf(worldBuf, [3, 3, 3, 2, 1, 1, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, worldCount);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(water.p);
    um(water, "uMvp", Mm);
    u3(water, "uEye", eye[0], eye[1], eye[2]);
    u1(water, "uTime", time);
    u3(water, "uFogColor", shown.fog[0], shown.fog[1], shown.fog[2]);
    u1(water, "uFogK", shown.fogK);
    u3(water, "uHor", shown.skyHor[0], shown.skyHor[1], shown.skyHor[2]);
    u4(water, "uPond", POND.x, POND.z, POND.rx, POND.rz);
    u1(water, "uRain", shown.rain);
    u3(water, "uSunDir", shown.sunDir[0], shown.sunDir[1], shown.sunDir[2]);
    u3(water, "uSunColor", shown.sun[0], shown.sun[1], shown.sun[2]);
    bindBuf(waterBuf, [3]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (shown.rain > 0.02) {
      gl.useProgram(rain.p);
      um(rain, "uMvp", Mm);
      u3(rain, "uRight", basis.s[0], basis.s[1], basis.s[2]);
      u1(rain, "uTime", time); u1(rain, "uWind", shown.wind); u1(rain, "uRain", shown.rain);
      bindBuf(rainBuf, [3, 1, 1]);
      gl.drawArrays(gl.TRIANGLES, 0, rainCount);
    }
    if (shown.night > 0.08) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(flies.p);
      um(flies, "uMvp", Mm);
      u1(flies, "uTime", time); u1(flies, "uNight", shown.night);
      bindBuf(flyBuf, [3, 1]);
      gl.drawArrays(gl.POINTS, 0, flyN);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    gl.depthMask(true);

    if (audio && windG) {
      var ct = audio.currentTime;
      windG.gain.setTargetAtTime(0.012 + shown.wind * 0.032, ct, 0.35);
      rustleG.gain.setTargetAtTime(shown.wind * 0.014, ct, 0.35);
      rainG.gain.setTargetAtTime(shown.rain * 0.055, ct, 0.3);
      cricketG.gain.setTargetAtTime(shown.night * (1 - shown.rain * 0.55) * 0.011, ct, 0.45);
      if (ct > nextBird) {
        nextBird = ct + 2.3 + Math.random() * 3.4;
        if (shown.night < 0.62 && shown.rain < 0.72) {
          chirp(0, audio);
          if (Math.random() < 0.4) chirp(0.15, audio);
        }
      }
    }
  }

  resize();
  draw(0, 0);
  markReady();
  window.addEventListener("resize", resize);
  requestAnimationFrame(function loop(ts) {
    var time = nowSec();
    var dt = last ? Math.min(0.05, time - last) : 0.016;
    last = time;
    if (canvas.clientWidth !== cssW || canvas.clientHeight !== cssH) resize();
    draw(time, dt);
    markReady();
    requestAnimationFrame(loop);
  });
})();

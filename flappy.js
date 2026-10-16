(() => {
  "use strict";
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("gameOverlay");
  const startButton = document.getElementById("gameStartBtn");
  const title = document.getElementById("gameTitle");
  const message = document.getElementById("gameMessage");
  const scoreLabel = document.getElementById("bestScore");
  let width = 800, height = 500, dpr = 1, bird, pipes, score, best = 0, running = false, started = false, frame = 0, raf = 0;
  try { best = Number(localStorage.getItem("notespace-skyhopper-best") || 0); } catch {}
  scoreLabel.textContent = best;
  const gap = 155, pipeWidth = 72;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function reset() {
    bird = { x: Math.min(130, width * .22), y: height * .43, vy: 0, r: 15 };
    pipes = []; score = 0; frame = 0;
    addPipe(width + 80); addPipe(width + 350);
  }
  function addPipe(x) {
    const margin = 75;
    const top = margin + Math.random() * Math.max(1, height - gap - margin * 2);
    pipes.push({ x, top, passed: false });
  }
  function start() {
    cancelAnimationFrame(raf); reset(); started = true; running = true; overlay.classList.add("hidden");
    bird.vy = -4.5; raf = requestAnimationFrame(loop);
  }
  function flap() { if (!started || !running) { start(); return; } bird.vy = -4.5; }
  function endGame() {
    running = false; started = false; cancelAnimationFrame(raf);
    if (score > best) { best = score; scoreLabel.textContent = best; try { localStorage.setItem("notespace-skyhopper-best", String(best)); } catch {} }
    title.textContent = "Flug beendet!"; message.textContent = `Du hast ${score} ${score === 1 ? "Punkt" : "Punkte"} geschafft. Versuch es gleich noch einmal!`;
    startButton.textContent = "Nochmal spielen"; overlay.classList.remove("hidden"); draw();
  }
  function roundedRect(x, y, w, h, r, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#8bd5ff"); sky.addColorStop(1, "#e1f7ff"); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    // Soft clouds
    ctx.fillStyle = "#ffffff99";
    for (let i = 0; i < 5; i++) { const x = ((i * 183 + 30) % (width + 100)) - 30; const y = 48 + (i % 3) * 65; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI*2); ctx.arc(x+22, y-8, 24, 0, Math.PI*2); ctx.arc(x+48, y, 17, 0, Math.PI*2); ctx.fill(); }
    if (pipes) pipes.forEach(p => {
      const bottomY = p.top + gap;
      roundedRect(p.x, -4, pipeWidth, p.top, 9, "#32b96a"); roundedRect(p.x-5, p.top-22, pipeWidth+10, 22, 7, "#239b56");
      roundedRect(p.x, bottomY, pipeWidth, height-bottomY+4, 9, "#32b96a"); roundedRect(p.x-5, bottomY, pipeWidth+10, 22, 7, "#239b56");
      ctx.fillStyle = "#ffffff38"; ctx.fillRect(p.x+12, 0, 8, Math.max(0,p.top-24)); ctx.fillRect(p.x+12, bottomY+25, 8, Math.max(0,height-bottomY-25));
    });
    ctx.fillStyle = "#8bd36b"; ctx.fillRect(0, height-24, width, 24); ctx.fillStyle = "#61bd54"; ctx.fillRect(0, height-24, width, 5);
    if (bird) {
      ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(Math.max(-.45, Math.min(.65, bird.vy * .055)));
      ctx.fillStyle = "#ffc83d"; ctx.beginPath(); ctx.ellipse(0, 0, bird.r+2, bird.r, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#f3a91f"; ctx.beginPath(); ctx.ellipse(-4, 5, 9, 5, -.4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(7, -6, 6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#263248"; ctx.beginPath(); ctx.arc(9, -6, 2.6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#ff8a35"; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(25, 4); ctx.lineTo(13, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if (running) { ctx.fillStyle = "#17314c"; ctx.font = "800 32px system-ui"; ctx.textAlign = "center"; ctx.fillText(score, width/2, 48); }
  }
  function loop() {
    if (!running) return;
    frame++; bird.vy += .18; bird.y += bird.vy;
    const speed = Math.min(3.5, 2.6 + score * .035);
    pipes.forEach(p => { p.x -= speed; if (!p.passed && p.x + pipeWidth < bird.x) { p.passed = true; score++; } });
    if (pipes.length && pipes[0].x + pipeWidth < -10) pipes.shift();
    if (!pipes.length || pipes[pipes.length-1].x < width - 255) addPipe(width + 20);
    const hitGround = bird.y + bird.r >= height - 24;
    const hitCeiling = bird.y - bird.r <= 0;
    const hitPipe = pipes.some(p => bird.x + bird.r > p.x-3 && bird.x-bird.r < p.x+pipeWidth+3 && (bird.y-bird.r < p.top || bird.y+bird.r > p.top+gap));
    draw();
    if (hitGround || hitCeiling || hitPipe) { endGame(); return; }
    raf = requestAnimationFrame(loop);
  }
  startButton.addEventListener("click", start);
  canvas.addEventListener("pointerdown", e => { e.preventDefault(); flap(); });
  window.addEventListener("keydown", e => {
    if (document.getElementById("gameView").classList.contains("hidden")) return;
    if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
  });
  window.addEventListener("resize", resize);
  window.skyHopperResize = resize;
  window.skyHopperPause = () => { running = false; started = false; cancelAnimationFrame(raf); };
  reset(); resize(); draw();
})();

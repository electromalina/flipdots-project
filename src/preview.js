import http from "node:http";
import fs from "node:fs";

const OUTPUT_DIR = "./output";
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

http.createServer((req, res) => {
  if (req.url === "/view") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
<!doctype html>
<html>
  <body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;">
    <div style="position:relative;">
      <img id="frame" src="/frame.png" style="image-rendering:pixelated;display:block;">
      <button id="spinBtn"
        style="
          position:absolute; right:100px; bottom:8px;
          font-family:monospace; font-size:14px;
          padding:8px 12px; color:#000; background:#fff; border:0; cursor:pointer;
        ">
        Spin
      </button>
    </div>
    <script>
      function updateFrame(time){
        const img = document.getElementById('frame');
        img.src = '/frame.png?t=' + time;
        requestAnimationFrame(updateFrame);
      }
      document.getElementById('spinBtn').addEventListener('click', () => {
        fetch('/spin', { method: 'POST' }).catch(()=>{});
      });
      requestAnimationFrame(updateFrame);
    </script>
  </body>
</html>
    `);
  } else if (req.url.startsWith("/frame.png")) {
    res.writeHead(200, { "Content-Type": "image/png", "Cache-Control":"no-store" });
    try {
      res.end(fs.readFileSync("./output/frame.png"));
    } catch {
      res.end(Buffer.from([]));
    }
  } else if (req.url === "/spin" && req.method === "POST") {
    try {
      fs.writeFileSync("./output/cmd.json", JSON.stringify({ spin: Date.now() }));
      res.writeHead(204);
      res.end();
    } catch {
      res.writeHead(500);
      res.end();
    }
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3000);

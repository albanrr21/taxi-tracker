// Render a month's earnings statement to a PNG blob using the Canvas API.
// No external deps and no web-font embedding — uses generic monospace/sans so
// it renders identically everywhere. Styled like the app (amber on asphalt).

const C = {
  bg: "#17181A", panel: "#1F2124", line: "#2C2E31",
  amber: "#FFB627", amberDim: "#8A6A22", cream: "#EFE9DE", creamDim: "#9A9488",
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const money = (n) => `€${(Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2)}`;

export async function renderMonthCard({ title, subtitle, rows, total, totalLabel, footer, brand }) {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const x = canvas.getContext("2d");

  x.fillStyle = C.bg; x.fillRect(0, 0, W, H);

  // Panel
  roundRect(x, 56, 56, W - 112, H - 112, 44);
  x.fillStyle = C.panel; x.fill();
  x.strokeStyle = C.line; x.lineWidth = 2; x.stroke();

  const L = 120;
  x.textBaseline = "alphabetic";

  // Brand
  x.fillStyle = C.amberDim; x.font = "600 30px monospace"; x.textAlign = "left";
  x.fillText(brand, L, 168);

  // Month title
  x.fillStyle = C.cream; x.font = "700 78px sans-serif";
  x.fillText(title, L - 2, 262);
  x.fillStyle = C.creamDim; x.font = "400 30px sans-serif";
  x.fillText(subtitle, L, 312);

  // Rows
  let y = 430;
  x.font = "400 40px sans-serif";
  for (const r of rows) {
    x.fillStyle = C.creamDim; x.textAlign = "left";
    x.fillText(r.label, L, y);
    x.fillStyle = C.cream; x.textAlign = "right"; x.font = "500 40px monospace";
    x.fillText(r.value, W - L, y);
    x.font = "400 40px sans-serif";
    y += 86;
  }

  // Divider
  y += 6;
  x.strokeStyle = C.line; x.lineWidth = 2;
  x.beginPath(); x.moveTo(L, y); x.lineTo(W - L, y); x.stroke();

  // Total
  y += 84;
  x.fillStyle = C.amberDim; x.font = "600 34px monospace"; x.textAlign = "left";
  x.fillText(totalLabel, L, y);
  y += 96;
  x.fillStyle = C.amber; x.font = "700 118px monospace"; x.textAlign = "left";
  x.fillText(total, L - 4, y);

  // Footer
  x.fillStyle = C.creamDim; x.font = "400 28px sans-serif"; x.textAlign = "center";
  x.fillText(footer, W / 2, H - 110);

  return await new Promise((res) => canvas.toBlob(res, "image/png"));
}

export { money };

export interface QrCodeProps {
  size?: number;
}

/** QR code pseudo-aleatório determinístico — placeholder visual, não escaneável. */
export function QrCode({ size = 132 }: QrCodeProps) {
  const n = 21;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const finder = (rr: number, cc: number) =>
      (rr < 7 && cc < 7) || (rr < 7 && cc >= n - 7) || (rr >= n - 7 && cc < 7);
    let on: boolean;
    if (finder(r, c)) {
      const lr = r < 7 ? r : r - (n - 7);
      const lc = c < 7 ? c : c - (n - 7);
      on = lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
    } else {
      on = (r * 7 + c * 13 + r * c) % 3 === 0;
    }
    cells.push(on);
  }
  return (
    <div
      className="rounded-(--radius-md) border border-(--color-border) bg-white p-2"
      style={{ width: size, height: size }}
    >
      <div
        className="grid h-full w-full"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {cells.map((on, i) => (
          <div key={i} className={on ? "bg-(--color-text)" : "bg-transparent"} />
        ))}
      </div>
    </div>
  );
}

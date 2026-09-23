// Türkçe para gösterimi: 20,40 ₺; kuruşsuzsa 204 ₺.
export const tl = (n: number) => `${n.toFixed(2).replace(/\.00$/, '').replace('.', ',')} ₺`;

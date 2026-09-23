// Ses dosyası gerektirmeden kısa bip sesleri (Web Audio). Tarayıcılar sesi ancak
// sayfayla bir etkileşimden (tıklama/tuş) sonra çalar; çalamazsa sessizce geçer.
function bip(notalar: { frekans: number; baslangic: number; sure: number }[], tip: OscillatorType = 'sine') {
  try {
    const ctx = new AudioContext();
    notalar.forEach(({ frekans, baslangic, sure }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tip;
      osc.frequency.value = frekans;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + baslangic);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + baslangic + sure);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + baslangic);
      osc.stop(ctx.currentTime + baslangic + sure);
    });
  } catch {
    // Ses çalınamazsa görsel uyarı yeterli.
  }
}

export const yeniSiparisSesi = () =>
  bip([
    { frekans: 880, baslangic: 0, sure: 0.4 },
    { frekans: 660, baslangic: 0.25, sure: 0.4 },
  ]);

export const basariSesi = () => bip([{ frekans: 1200, baslangic: 0, sure: 0.12 }]);

export const hataSesi = () =>
  bip(
    [
      { frekans: 220, baslangic: 0, sure: 0.18 },
      { frekans: 180, baslangic: 0.2, sure: 0.3 },
    ],
    'square'
  );

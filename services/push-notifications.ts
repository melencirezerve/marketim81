import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';

const SIPARIS_KANAL_ID = 'siparis-bildirimleri';

let kanalHazir = false;

async function kanaliHazirla() {
  if (kanalHazir) return;
  await notifee.createChannel({
    id: SIPARIS_KANAL_ID,
    name: 'Sipariş Bildirimleri',
    importance: AndroidImportance.HIGH,
  });
  kanalHazir = true;
}

export async function bildirimIzniIste() {
  await notifee.requestPermission();
}

export async function telefonBildirimiGoster(baslik: string, mesaj: string, resimUrl?: string) {
  await kanaliHazirla();
  await notifee.displayNotification({
    title: baslik,
    body: mesaj,
    android: {
      channelId: SIPARIS_KANAL_ID,
      largeIcon: resimUrl,
      pressAction: { id: 'default' },
      ...(resimUrl
        ? { style: { type: AndroidStyle.BIGPICTURE, picture: resimUrl } }
        : {}),
    },
  });
}

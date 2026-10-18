import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export type PickedReceipt = { dataUrl: string; base64: string; mediaType: 'image/jpeg' };
export type PickResult = { ok: true; image: PickedReceipt } | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

/**
 * Takes a photo (or picks one) and shrinks it to a 1600px-wide JPEG. That is sharp enough to read small print
 * and small enough (a few hundred KB) to store on the device and send for scanning.
 */
export async function pickReceipt(source: 'camera' | 'library'): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'denied' };
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };
    const asset = res.assets[0];
    const width = asset.width && asset.width > 1600 ? 1600 : undefined;
    const out = await ImageManipulator.manipulateAsync(asset.uri, width ? [{ resize: { width } }] : [], {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!out.base64) return { ok: false, reason: 'failed' };
    return { ok: true, image: { base64: out.base64, dataUrl: `data:image/jpeg;base64,${out.base64}`, mediaType: 'image/jpeg' } };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

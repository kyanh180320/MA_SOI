import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { PresetName } from "../game/types";

const PRESET_LOCAL_KEY = "werewolf_preset_names";

export function getLocalPresets(): PresetName[] {
  try {
    const raw = localStorage.getItem(PRESET_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [
      { id: "1", name: "An" },
      { id: "2", name: "Bình" },
      { id: "3", name: "Cường" },
      { id: "4", name: "Dũng" },
      { id: "5", name: "Hải" },
      { id: "6", name: "Lan" }
    ];
  } catch {
    return [];
  }
}

export function saveLocalPresets(presets: PresetName[]) {
  localStorage.setItem(PRESET_LOCAL_KEY, JSON.stringify(presets));
}

export async function getCloudPresets(): Promise<PresetName[]> {
  try {
    const colRef = collection(db, "presets");
    const snap = await getDocs(colRef);
    if (snap.empty) {
      const defaultPresets = getLocalPresets();
      return defaultPresets;
    }
    const list: PresetName[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, name: d.data().name });
    });
    return list;
  } catch (err) {
    console.warn("Lỗi khi tải presets từ Firestore, dùng dữ liệu local:", err);
    return getLocalPresets();
  }
}

export async function addCloudPreset(name: string): Promise<PresetName> {
  const newPreset: PresetName = {
    id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name: name.trim()
  };

  try {
    await setDoc(doc(db, "presets", newPreset.id), {
      name: newPreset.name,
      createdAt: Date.now()
    });
  } catch (err) {
    console.warn("Lưu Firestore thất bại, lưu tạm local:", err);
  }

  const locals = getLocalPresets();
  saveLocalPresets([...locals, newPreset]);
  return newPreset;
}

export async function deleteCloudPreset(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "presets", id));
  } catch (err) {
    console.warn("Xóa Firestore thất bại, xóa local:", err);
  }

  const locals = getLocalPresets().filter(p => p.id !== id);
  saveLocalPresets(locals);
}

/**
 * EduSokh mualliflari tayyorlagan o'yin to'plamlari (juftliklar, guruhlar) — mavzu ID'si bo'yicha.
 * Savollar bu yerda emas: ular dars va laboratoriya testlaridan avtomatik olinadi (gather.ts).
 * Har bir to'plam o'z tilida (o'zbekcha mavzuga — o'zbekcha, tojikchaga — tojikcha).
 */
import type { GameSet } from "./types";

const ohmUz: GameSet = {
  topicId: "fizika_8_uzb:17",
  author: "EduSokh",
  pairs: [
    { a: "Tok kuchi", b: "I, amper (A)" },
    { a: "Kuchlanish", b: "U, volt (V)" },
    { a: "Qarshilik", b: "R, om (Ω)" },
    { a: "Om qonuni", b: "I = U / R" },
    { a: "Kuchlanishni topish", b: "U = I · R" },
    { a: "Qarshilikni topish", b: "R = U / I" },
    { a: "Ampermetr", b: "Zanjirga ketma-ket ulanadi" },
    { a: "Voltmetr", b: "Parallel ulanadi" },
  ],
  groups: [
    { name: "Kattaliklar", items: ["Tok kuchi", "Kuchlanish", "Qarshilik", "Quvvat"] },
    { name: "Birliklar", items: ["Amper", "Volt", "Om", "Vatt"] },
    { name: "O'lchov asboblari", items: ["Ampermetr", "Voltmetr", "Ommetr"] },
  ],
};

const ohmTg: GameSet = {
  topicId: "fizika_8_tojik:17",
  author: "EduSokh",
  pairs: [
    { a: "Қувваи ҷараён", b: "I, ампер (A)" },
    { a: "Шиддат", b: "U, волт (В)" },
    { a: "Муқовимат", b: "R, ом (Ω)" },
    { a: "Қонуни Ом", b: "I = U / R" },
    { a: "Ёфтани шиддат", b: "U = I · R" },
    { a: "Ёфтани муқовимат", b: "R = U / I" },
    { a: "Амперметр", b: "Ба занҷир пайдарпай пайваст мешавад" },
    { a: "Волтметр", b: "Параллел пайваст мешавад" },
  ],
  groups: [
    { name: "Бузургиҳо", items: ["Қувваи ҷараён", "Шиддат", "Муқовимат", "Тавоноӣ"] },
    { name: "Воҳидҳо", items: ["Ампер", "Волт", "Ом", "Ватт"] },
    { name: "Асбобҳои ченкунӣ", items: ["Амперметр", "Волтметр", "Омметр"] },
  ],
};

export const AUTHORED_SETS: Record<string, GameSet> = { [ohmUz.topicId]: ohmUz, [ohmTg.topicId]: ohmTg };

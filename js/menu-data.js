import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";

export const MENU_ITEMS = [
  {
    id: "dal_fry",
    name: "Dal Fry",
    price: 100,
    category: "Main Course",
    order: 1
  },
  {
    id: "dal_tadka",
    name: "Dal Tadka",
    price: 120,
    category: "Main Course",
    order: 2
  },
  {
    id: "bhindi_fry",
    name: "Bhindi Fry",
    price: 100,
    category: "Main Course",
    order: 3
  },
  {
    id: "sev_masala",
    name: "Sev Masala",
    price: 100,
    category: "Main Course",
    order: 4
  },
  {
    id: "sev_doodh",
    name: "Sev Doodh",
    price: 120,
    category: "Main Course",
    order: 5
  },
  {
    id: "paneer_masala",
    name: "Paneer Masala",
    price: 150,
    category: "Main Course",
    order: 6
  },
  {
    id: "channa_masala",
    name: "Channa Masala",
    price: 130,
    category: "Main Course",
    order: 7
  },
  {
    id: "matar_paneer",
    name: "Matar Paneer",
    price: 150,
    category: "Main Course",
    order: 8
  },
  {
    id: "raita_full",
    name: "Raita — Full",
    price: 100,
    category: "Raita",
    order: 9
  },
  {
    id: "raita_half",
    name: "Raita — Half",
    price: 80,
    category: "Raita",
    order: 10
  },
  {
    id: "roti_fulka",
    name: "Roti (Fulka)",
    price: 10,
    category: "Roti",
    order: 11
  },
  {
    id: "roti_butter",
    name: "Roti with Butter",
    price: 15,
    category: "Roti",
    order: 12
  },
  {
    id: "roti_ghee",
    name: "Roti with Ghee",
    price: 17,
    category: "Roti",
    order: 13
  },
  {
    id: "milk_200ml",
    name: "Milk — 200 ml",
    price: 30,
    category: "Drinks",
    order: 14
  },
  {
    id: "tea",
    name: "Tea",
    price: 15,
    category: "Drinks",
    order: 15
  },
  {
    id: "buttermilk",
    name: "Buttermilk",
    price: 20,
    category: "Drinks",
    order: 16
  },
  {
    id: "lassi",
    name: "Lassi",
    price: 30,
    category: "Drinks",
    order: 17
  }
];

export async function seedMenuIfEmpty() {
  const snapshot = await getDocs(collection(db, "menu"));

  if (!snapshot.empty) {
    return {
      created: false,
      count: snapshot.size
    };
  }

  await Promise.all(
    MENU_ITEMS.map((item) =>
      setDoc(doc(db, "menu", item.id), {
        name: item.name,
        price: item.price,
        category: item.category,
        order: item.order,
        available: true
      })
    )
  );

  return {
    created: true,
    count: MENU_ITEMS.length
  };
}

export function subscribeToMenu(callback, onError) {
  return onSnapshot(
    collection(db, "menu"),
    (snapshot) => {
      const items = snapshot.docs.map((itemDoc) => ({
        id: itemDoc.id,
        ...itemDoc.data()
      }));

      items.sort(
        (a, b) =>
          (a.order ?? 999) -
          (b.order ?? 999)
      );

      callback(items);
    },
    onError
  );
}
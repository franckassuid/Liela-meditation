// Firebase web configuration identifies the project. Access is enforced by Auth + rules.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCOyhetP0kBz_8S70DLxjg9wyIzMnj_VsQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "liela-9426c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "liela-9426c",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "liela-9426c.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "48471899770",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:48471899770:web:3f34cdbd5a78d0860c45c3",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RHTXL2RYCV",
};


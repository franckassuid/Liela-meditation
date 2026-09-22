import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getFirebase } from "./client";
import { detachPushDevice } from "../push/client";

export const signInEmail = (email: string, password: string) => signInWithEmailAndPassword(getFirebase().auth, email.trim(), password);
export const registerEmail = (email: string, password: string) => createUserWithEmailAndPassword(getFirebase().auth, email.trim(), password);
export const signInGoogle = () => signInWithPopup(getFirebase().auth, new GoogleAuthProvider());
export const signOutAccount = async () => { await detachPushDevice(); await signOut(getFirebase().auth); };
export const resetPassword = (email: string) => sendPasswordResetEmail(getFirebase().auth, email.trim());
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (!code && error instanceof Error) return error.message;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Adresse e-mail ou mot de passe incorrect.",
    "auth/email-already-in-use": "Cette adresse a déjà un compte. Connectez-vous ou réinitialisez votre mot de passe.",
    "auth/weak-password": "Choisissez un mot de passe d’au moins 6 caractères.",
    "auth/invalid-email": "Cette adresse e-mail n’est pas valide.",
    "auth/popup-closed-by-user": "Connexion Google annulée.",
    "auth/popup-blocked": "Votre navigateur bloque la fenêtre Google. Autorisez-la puis réessayez.",
    "auth/network-request-failed": "Connexion indisponible. Réessayez lorsque vous serez en ligne.",
    "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
    "auth/operation-not-allowed": "Ce mode de connexion doit être activé dans Firebase Authentication.",
    "auth/unauthorized-domain": "Ce domaine doit être autorisé dans Firebase Authentication.",
    "auth/configuration-not-found": "Firebase Authentication doit être activé pour ce projet.",
  };
  return messages[code || ""] || "La connexion n’a pas abouti. Réessayez.";
}

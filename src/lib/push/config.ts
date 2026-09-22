// Public Web Push credential, not a server credential.
export const PUSH_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BJ46QsZFYPyv1C3GKan8k5i1w3ohwOK8nPGpLYtpQkvPB4w9CLP9t_iQGnOQxwWQWBXd3pIL-LPYYaYdZg-d5nk";
// Enable only after the worker, secrets and Firestore rules have been deployed and tested.
export const PUSH_ENABLED = process.env.NEXT_PUBLIC_PUSH_ENABLED === "true";

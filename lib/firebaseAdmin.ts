import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = process.env.FIREBASE_ADMIN_SDK_KEY
    ? JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY)
    : undefined;

const adminApp = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
    })
    : getApp();

export const adminDb = getFirestore(adminApp); 
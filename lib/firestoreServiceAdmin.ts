import { adminDb } from './firebaseAdmin';
// Example: server-only Firestore utility
export async function getStudentProfile(studentId: string) {
    const docRef = adminDb.collection('students').doc(studentId);
    const docSnap = await docRef.get();
    return docSnap.exists ? docSnap.data() : null;
}
// Add other Firestore-related functions as needed, using adminDb 
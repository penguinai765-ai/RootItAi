import { adminDb } from './firebaseAdmin';
// Example: server-only Firestore utility
export async function getQuizDoc(quizId: string) {
    const docRef = adminDb.collection('quizzes').doc(quizId);
    const docSnap = await docRef.get();
    return docSnap.exists ? docSnap.data() : null;
}
// Add other Firestore-related functions as needed, using adminDb 
import * as admin from "firebase-admin"

if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    const privateKeyStr = privateKey?.replace(/\\n/g, '\n')

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKeyStr,
            // Fallback snake_case for older or specific SDK versions
            project_id: process.env.FIREBASE_PROJECT_ID,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: privateKeyStr,
        } as any),
    })
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()

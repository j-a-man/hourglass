'use server';

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function deleteUserAction(uid: string, email?: string) {
    try {
        console.log(`Starting deletion process for UID: ${uid}, Email: ${email}`);

        // 1. Delete from Firebase Authentication
        try {
            await adminAuth.deleteUser(uid);
            console.log(`Successfully deleted UID ${uid} from Auth`);
        } catch (authError: any) {
            console.log(`Initial Auth deletion by UID failed: ${authError.message}`);

            // Fallback: If email is provided, try to find the user by email
            if (email) {
                try {
                    const userRecord = await adminAuth.getUserByEmail(email);
                    if (userRecord.uid) {
                        await adminAuth.deleteUser(userRecord.uid);
                        console.log(`Successfully deleted user by Email ${email} (UID: ${userRecord.uid})`);
                    }
                } catch (emailError: any) {
                    console.log(`Fallback Auth deletion by Email also failed: ${emailError.message}`);
                    // If the user isn't in Auth at all, we can proceed to Firestore deletion
                    if (emailError.code !== 'auth/user-not-found') throw emailError;
                }
            } else if (authError.code !== 'auth/user-not-found') {
                throw authError;
            }
        }

        // 2. Delete from Firestore "users" collection
        await adminDb.collection("users").doc(uid).delete();
        console.log(`Successfully deleted user ${uid} from Firestore`);

        return { success: true };
    } catch (error: any) {
        console.error("Critical error in deleteUserAction:", error);
        return {
            success: false,
            error: error.message || "An unknown error occurred during deletion"
        };
    }
}

export async function scrubGhostUserAction(email: string) {
    try {
        const userRecord = await adminAuth.getUserByEmail(email);
        if (userRecord.uid) {
            await adminAuth.deleteUser(userRecord.uid);
            // Also try to delete from Firestore just in case
            await adminDb.collection("users").doc(userRecord.uid).delete();
            return { success: true, message: `Successfully cleared ghost account for ${email}` };
        }
        return { success: false, error: "User not found in Authentication system" };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            return { success: false, error: "Email is already free! This user is not in the Auth system." };
        }
        return { success: false, error: error.message };
    }
}

export async function checkFirebaseAdminConfigAction() {
    try {
        const config = {
            projectId: !!process.env.FIREBASE_PROJECT_ID,
            clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        };

        const allConfigured = config.projectId && config.clientEmail && config.privateKey;

        if (!allConfigured) {
            const missing = Object.entries(config)
                .filter(([_, v]) => !v)
                .map(([k]) => k)
                .join(", ");
            return {
                success: false,
                error: `Missing environment variables: ${missing}. Did you restart your dev server after adding them?`
            };
        }

        // Try a simple operation to verify connectivity and key validity
        await adminAuth.listUsers(1);

        return { success: true, message: "Firebase Admin is correctly configured! You can now delete staff members permanently." };
    } catch (error: any) {
        let details = error.message;
        if (error.message.includes("PEM")) details = "Invalid Private Key format. Ensure it starts with '-----BEGIN PRIVATE KEY-----' and you copied it exactly.";

        return {
            success: false,
            error: "Config verification failed: " + details
        };
    }
}

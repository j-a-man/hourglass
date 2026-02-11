"use server"

import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { sendAccountDeletedEmailAction } from "@/app/actions/email"

/**
 * Deletes an entire Firestore sub-collection in batches of 100.
 */
async function deleteSubCollection(orgId: string, subCollection: string) {
    const colRef = adminDb.collection("organizations").doc(orgId).collection(subCollection)
    let snapshot = await colRef.limit(100).get()

    while (!snapshot.empty) {
        const batch = adminDb.batch()
        snapshot.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        snapshot = await colRef.limit(100).get()
    }
}

/**
 * Permanently deletes the organization, all its sub-collections,
 * all employee user docs + auth accounts, and the admin's own account.
 */
export async function deleteOrganizationAccount(adminUserId: string, organizationId: string, confirmText: string) {
    if (confirmText !== "DELETE") {
        return { error: "Confirmation text did not match" }
    }

    if (!adminUserId || !organizationId) {
        return { error: "Missing admin user ID or organization ID" }
    }

    try {
        // 1. Delete all organization sub-collections
        const subCollections = ["shifts", "locations", "weeklyTemplates", "timeEntries", "invites"]
        for (const sub of subCollections) {
            await deleteSubCollection(organizationId, sub)
        }

        // 2. Find all users that belong to this organization
        const usersSnapshot = await adminDb
            .collection("users")
            .where("organizationId", "==", organizationId)
            .get()

        // 3. Get org name and admin email for the deletion confirmation email
        const orgDoc = await adminDb.collection("organizations").doc(organizationId).get()
        const orgName = orgDoc.data()?.name || "Your Organization"
        const adminUserDoc = usersSnapshot.docs.find(d => d.id === adminUserId)
        const adminEmail = adminUserDoc?.data()?.email

        // 4. Send deletion confirmation email before deleting auth accounts
        if (adminEmail) {
            await sendAccountDeletedEmailAction(adminEmail, orgName).catch(err =>
                console.warn("Failed to send deletion email:", err)
            )
        }

        // 5. Delete each user's Firestore doc and Firebase Auth account
        for (const userDoc of usersSnapshot.docs) {
            try {
                await adminAuth.deleteUser(userDoc.id)
            } catch (authErr: any) {
                // User may not exist in Auth (already deleted), continue
                console.warn(`Could not delete auth for ${userDoc.id}:`, authErr.message)
            }
            await userDoc.ref.delete()
        }

        // 6. Delete the organization document itself
        await adminDb.collection("organizations").doc(organizationId).delete()

        return { success: true }
    } catch (error: any) {
        console.error("Error deleting organization:", error)
        return { error: error.message || "Failed to delete organization" }
    }
}

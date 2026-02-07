'use server';

import { adminDb } from "@/lib/firebase-admin";

/**
 * Migrates legacy top-level data to organization sub-collections.
 * Scopes by organizationId if provided, otherwise attempts to move all 
 * records that match the context.
 */
export async function migrateLegacyDataAction(userId: string, organizationId?: string) {
    if (!userId) {
        return { success: false, error: "User ID is required for migration." };
    }

    let targetOrgId = organizationId;

    try {
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return { success: false, error: "User not found." };
        const userData = userDoc.data() || {};

        // 1. Account Repair: If organizationId is missing, try to find or create one
        if (!targetOrgId) {
            // Check if they already have an owned organization
            const orgsSnapshot = await adminDb.collection("organizations")
                .where("ownerUid", "==", userId)
                .limit(1)
                .get();

            if (!orgsSnapshot.empty) {
                targetOrgId = orgsSnapshot.docs[0].id;
                console.log(`Found existing organization for user: ${targetOrgId}`);
            } else {
                // Bootstrap a new organization for this legacy admin
                const newOrgRef = await adminDb.collection("organizations").add({
                    name: `${userData.name || 'My'}'s Company`,
                    ownerUid: userId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isBootstrapped: true
                });
                targetOrgId = newOrgRef.id;
                console.log(`Bootstrapped new organization: ${targetOrgId}`);
            }

            // Link the user to this organization
            await userRef.update({
                organizationId: targetOrgId,
                updatedAt: new Date().toISOString()
            });
        }

        const collectionsToMigrate = [
            { old: 'shifts', new: 'shifts' },
            { old: 'locations', new: 'locations' },
            { old: 'notifications', new: 'notifications' },
            { old: 'time_logs', new: 'time_entries' }
        ];

        const results: Record<string, { moved: number; errors: number }> = {};

        for (const col of collectionsToMigrate) {
            results[col.old] = { moved: 0, errors: 0 };

            const snapshot = await adminDb.collection(col.old).get();
            if (snapshot.empty) continue;

            for (const doc of snapshot.docs) {
                const data = doc.data();

                // For safety, we only move data if it matches the targetOrgId 
                // OR if it has NO organizationId/orgId (legacy baseline)
                // OR if it was created by the current user
                const docOrgId = data.organizationId || data.orgId;
                const createdBy = data.createdBy || data.userId || data.employeeId;

                const isLegacyBaseline = !docOrgId;
                const isMatchingOrg = docOrgId === targetOrgId;
                const isMatchingUser = createdBy === userId;

                if (isMatchingOrg || (isLegacyBaseline && isMatchingUser) || (isLegacyBaseline && !createdBy)) {
                    try {
                        await adminDb.collection('organizations')
                            .doc(targetOrgId)
                            .collection(col.new)
                            .doc(doc.id)
                            .set({
                                ...data,
                                organizationId: targetOrgId,
                                migrationSource: col.old,
                                migratedAt: new Date().toISOString()
                            });

                        results[col.old].moved++;
                    } catch (err) {
                        results[col.old].errors++;
                    }
                }
            }
        }

        return {
            success: true,
            message: "Account repaired and migration completed successfully.",
            results,
            organizationId: targetOrgId
        };

    } catch (error: any) {
        console.error("Critical error during migration:", error);
        return { success: false, error: error.message };
    }
}

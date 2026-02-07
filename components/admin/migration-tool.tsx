'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { migrateLegacyDataAction } from "@/app/actions/migration-actions";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MigrationTool() {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleMigrate = async () => {
        if (!userData?.uid) {
            toast.error("You must be logged in to migrate data.");
            return;
        }

        if (!confirm("This will repair your account and move legacy data to your organization. Proceed?")) {
            return;
        }

        setLoading(true);
        try {
            const res = await migrateLegacyDataAction(userData.uid, userData.organizationId);
            setResult(res);
            if (res.success) {
                toast.success("Account repaired and data migrated!");
                // Optionally suggest a refresh or force it
                setTimeout(() => {
                    if (confirm("Migration successful. Reloading the page will apply all changes. Reload now?")) {
                        window.location.reload();
                    }
                }, 1000);
            } else {
                toast.error(res.error || "Migration failed");
            }
        } catch (error: any) {
            toast.error("Process crashed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="rounded-[32px] border-amber-200 bg-amber-50/20 shadow-sm overflow-hidden border">
            <CardHeader className="bg-amber-100/50 p-6 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Legacy Data Migration
                    </CardTitle>
                    <p className="text-xs text-amber-700 font-medium mt-1">
                        Use this if your shifts, locations, or logs are missing after the update.
                    </p>
                </div>
                <Button
                    onClick={handleMigrate}
                    disabled={loading || !userData?.uid}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-6"
                >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Run Migration"}
                </Button>
            </CardHeader>
            <CardContent className="p-6">
                {result ? (
                    <div className="space-y-4">
                        <div className={cn(
                            "p-4 rounded-2xl flex items-center gap-3",
                            result.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                        )}>
                            {result.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                            <p className="font-bold text-sm">{result.message || result.error}</p>
                        </div>

                        {result.results && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(result.results).map(([col, data]: [string, any]) => (
                                    <div key={col} className="bg-white border border-neutral-100 rounded-xl p-3 shadow-sm">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{col}</p>
                                        <p className="text-lg font-black text-neutral-900 mt-1">{data.moved} <span className="text-[10px] font-medium text-neutral-400">docs</span></p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-start gap-3 text-amber-800/60 text-sm font-medium">
                        <ArrowRight className="h-4 w-4 mt-1" />
                        <p>This will search for existing data in the old "shifts", "locations", "time_logs", and "notifications" collections and move them to your currently active organization sub-collection.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
